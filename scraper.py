"""Stealth scraper for Galeries Lafayette Qatar offer pages."""

from __future__ import annotations

import json
import logging
import random
import re
import time
from datetime import datetime
from typing import Any
from urllib.parse import parse_qs, urlencode, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent

from gender import infer_gender
from models import Product

logger = logging.getLogger(__name__)

DISCOUNT_PATTERN = re.compile(r"(\d+)\s*%\s*Off", re.IGNORECASE)
PRICE_AMOUNT_PATTERN = re.compile(r"data-price-amount=\"([\d.]+)\"")
JSON_CONFIG_PATTERN = re.compile(r'"jsonConfig"\s*:\s*(\{.*?\})\s*,\s*"jsonSwatchConfig"', re.DOTALL)

SPEED_PRESETS: dict[str, dict[str, float]] = {
    "stealth": {"min_delay": 3.0, "max_delay": 8.0, "min_rate_limit": 4.0, "max_rate_limit": 6.0},
    "normal": {"min_delay": 1.5, "max_delay": 3.0, "min_rate_limit": 2.0, "max_rate_limit": 3.5},
    "turbo": {"min_delay": 0.1, "max_delay": 0.35, "min_rate_limit": 0.15, "max_rate_limit": 0.45},
}


class StealthSession:
    """HTTP session with rotating headers, delays, proxies, and retries."""

    ACCEPT_LANGUAGES = [
        "en-US,en;q=0.9,ar;q=0.8",
        "en-GB,en;q=0.9",
        "en-US,en;q=0.8,fr;q=0.6",
    ]

    def __init__(self, config: dict[str, Any]) -> None:
        scraper_cfg = dict(config.get("scraper", {}))
        preset = scraper_cfg.pop("speed", None)
        if preset and preset in SPEED_PRESETS:
            scraper_cfg = {**SPEED_PRESETS[preset], **scraper_cfg}
        self.min_delay = float(scraper_cfg.get("min_delay", 3.0))
        self.max_delay = float(scraper_cfg.get("max_delay", 8.0))
        self.min_rate_limit = float(scraper_cfg.get("min_rate_limit", 4.0))
        self.max_rate_limit = float(scraper_cfg.get("max_rate_limit", 6.0))
        self.max_retries = int(scraper_cfg.get("max_retries", 3))
        self.retry_backoff = float(scraper_cfg.get("retry_backoff", 2.0))
        self.timeout = int(scraper_cfg.get("timeout", 30))

        self.proxies = config.get("proxies") or []
        self.base_url = config["base_url"].rstrip("/")
        self._ua = UserAgent(fallback="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        self._session = requests.Session()
        self._last_request_at = 0.0
        self._referer = self.base_url + "/"

    def _pick_proxy(self) -> dict[str, str] | None:
        if not self.proxies:
            return None
        proxy = random.choice(self.proxies)
        return {"http": proxy, "https": proxy}

    def _build_headers(self) -> dict[str, str]:
        return {
            "User-Agent": self._ua.random,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": random.choice(self.ACCEPT_LANGUAGES),
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
            "Referer": self._referer,
            "DNT": "1",
        }

    def _wait_before_request(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        rate_limit = random.uniform(self.min_rate_limit, self.max_rate_limit)
        if elapsed < rate_limit:
            time.sleep(rate_limit - elapsed)

        jitter = random.uniform(self.min_delay, self.max_delay)
        time.sleep(jitter)

    def get(self, url: str, *, ajax: bool = False) -> str | None:
        self._wait_before_request()

        for attempt in range(1, self.max_retries + 1):
            headers = self._build_headers()
            if ajax:
                headers["X-Requested-With"] = "XMLHttpRequest"
                headers["Accept"] = "application/json, text/javascript, */*; q=0.01"
            proxy = self._pick_proxy()
            try:
                response = self._session.get(
                    url,
                    headers=headers,
                    proxies=proxy,
                    timeout=self.timeout,
                )
                self._last_request_at = time.monotonic()
                self._referer = url

                if response.status_code == 200:
                    return response.text

                logger.warning(
                    "HTTP %s for %s (attempt %s/%s)",
                    response.status_code,
                    url,
                    attempt,
                    self.max_retries,
                )
            except requests.RequestException as exc:
                logger.warning(
                    "Request failed for %s (attempt %s/%s): %s",
                    url,
                    attempt,
                    self.max_retries,
                    exc,
                )

            if attempt < self.max_retries:
                backoff = self.retry_backoff * attempt + random.uniform(0.5, 1.5)
                time.sleep(backoff)

        return None


class OfferScraper:
    PRODUCT_SELECTOR = "ol.products.list.items.product-items > li.item.product"
    PAGE_COUNT_SELECTOR = "#k-page-count"

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.base_url = config["base_url"].rstrip("/")
        self.offer_path = config.get("offer_path", "/offer.html")
        self.offer_params = dict(config.get("offer_params") or {})
        self.max_pages = int(config.get("max_pages") or 0)
        self.session = StealthSession(config)

    def build_page_url(self, page: int) -> str:
        params = dict(self.offer_params)
        params["p"] = str(page)
        return f"{self.base_url}{self.offer_path}?{urlencode(params)}"

    def fetch_page(self, page: int) -> str | None:
        url = self.build_page_url(page)
        use_scroll = str(self.offer_params.get("is_scroll", "")) == "1"
        ajax = page > 1 and use_scroll
        logger.info("Fetching page %s: %s", page, url)
        raw = self.session.get(url, ajax=ajax)
        if raw is None:
            return None
        return self._normalize_page_html(raw, page=page)

    @staticmethod
    def _normalize_page_html(raw: str, page: int) -> str:
        stripped = raw.lstrip()
        if stripped.startswith("{"):
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Page %s returned invalid JSON payload", page)
                return raw

            fragment = payload.get("categoryProducts")
            if isinstance(fragment, str) and fragment.strip():
                return fragment

            logger.warning("Page %s JSON payload missing categoryProducts", page)
        return raw

    def sync_params_from_pagination(self, html: str) -> None:
        """Preserve sort/filter params from pagination links (e.g. product_list_order)."""
        soup = BeautifulSoup(html, "html.parser")
        link = soup.select_one("ul.pages-items a.page[href*='p=2']")
        if not link or not link.get("href"):
            return

        query = parse_qs(urlparse(link["href"]).query)
        for key, values in query.items():
            if key != "p" and values:
                self.offer_params[key] = values[0]

        logger.info("Pagination params synced: %s", self.offer_params)

    def parse_total_pages(self, html: str) -> int:
        soup = BeautifulSoup(html, "html.parser")

        page_count_el = soup.select_one(self.PAGE_COUNT_SELECTOR)
        if page_count_el and page_count_el.get_text(strip=True).isdigit():
            return int(page_count_el.get_text(strip=True))

        page_links = soup.select("ul.pages-items a.page")
        page_numbers = []
        for link in page_links:
            text = link.get_text(strip=True)
            if text.isdigit():
                page_numbers.append(int(text))
        if page_numbers:
            return max(page_numbers)

        return 1

    @staticmethod
    def _parse_price_amount(element) -> float | None:
        if element is None:
            return None

        amount = element.get("data-price-amount")
        if amount:
            try:
                return float(amount)
            except ValueError:
                pass

        price_el = element.select_one("span.price")
        if price_el:
            text = price_el.get_text(strip=True)
            cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
            if cleaned:
                try:
                    return float(cleaned)
                except ValueError:
                    return None
        return None

    @staticmethod
    def _extract_discount_percent(item) -> int | None:
        label = item.select_one("div.md-label-container div.md-label-text span")
        if not label:
            return None

        match = DISCOUNT_PATTERN.search(label.get_text(strip=True))
        if not match:
            return None
        return int(match.group(1))

    @staticmethod
    def _extract_image_url(item, base_url: str) -> str:
        for selector in (
            "img.product-image-photo",
            "a.product-item-photo img",
            ".product-image-wrapper img",
        ):
            img = item.select_one(selector)
            if img:
                src = img.get("src") or img.get("data-src") or ""
                if src and not src.startswith("data:"):
                    return urljoin(base_url + "/", src)
        return ""

    @staticmethod
    def _extract_sizes(item) -> list[str]:
        match = JSON_CONFIG_PATTERN.search(str(item))
        if not match:
            return []

        try:
            config = json.loads(match.group(1))
        except json.JSONDecodeError:
            return []

        for attr in (config.get("attributes") or {}).values():
            code = (attr.get("code") or "").strip().lower()
            label = (attr.get("label") or "").strip().lower()
            if code == "size" or label == "size":
                sizes = [
                    opt.get("label", "").strip()
                    for opt in attr.get("options") or []
                    if opt.get("label")
                ]
                return sizes
        return []

    @staticmethod
    def _extract_sku(item, product_id: str) -> str:
        sku_el = item.select_one("[data-product-sku]")
        if sku_el and sku_el.get("data-product-sku"):
            return sku_el["data-product-sku"].strip()

        match = JSON_CONFIG_PATTERN.search(str(item))
        if match:
            try:
                config = json.loads(match.group(1))
                sku_map = config.get("sku") or {}
                if sku_map:
                    return next(iter(sku_map.values()))
            except (json.JSONDecodeError, StopIteration):
                pass

        link = item.select_one("a.product-item-link")
        if link and link.get("href"):
            slug = link["href"].rstrip("/").split("/")[-1]
            sku_prefix = slug.split("-")[0]
            if sku_prefix.isdigit():
                return sku_prefix

        return product_id

    def parse_products(self, html: str, page: int) -> list[Product]:
        """Parse every product on an offer page (all pagination)."""
        soup = BeautifulSoup(html, "html.parser")
        timestamp = datetime.now().isoformat(timespec="seconds")
        products: list[Product] = []
        discounted_only = bool(self.config.get("discounted_only", False))

        for item in soup.select(self.PRODUCT_SELECTOR):
            discount_percent = self._extract_discount_percent(item)

            info = item.select_one(".product-item-info")
            product_id = ""
            if info and info.get("id", "").startswith("product-item-info_"):
                product_id = info["id"].replace("product-item-info_", "")
            if not product_id:
                price_box = item.select_one("[data-product-id]")
                product_id = (price_box or {}).get("data-product-id", "")
            if not product_id:
                continue

            brand_el = item.select_one("span.brand-name")
            brand = brand_el.get_text(strip=True) if brand_el else ""

            name_el = item.select_one("strong.product.name a.product-item-link")
            name = name_el.get_text(strip=True) if name_el else ""

            link_el = item.select_one("a.product-item-link")
            href = link_el.get("href", "") if link_el else ""
            url = urljoin(self.base_url + "/", href)

            current_price_el = item.select_one(
                f"span#product-price-{product_id}, "
                f"[data-price-box='product-id-{product_id}'] span[data-price-type='finalPrice']"
            )
            old_price_el = item.select_one(
                f"span#old-price-{product_id}, "
                f"span.old-price span[data-price-type='oldPrice']"
            )

            current_price = self._parse_price_amount(current_price_el)
            old_price = self._parse_price_amount(old_price_el)

            if current_price is None or old_price is None:
                match_current = PRICE_AMOUNT_PATTERN.search(str(item))
                amounts = PRICE_AMOUNT_PATTERN.findall(str(item))
                if current_price is None and amounts:
                    current_price = float(amounts[0])
                if old_price is None and len(amounts) > 1:
                    old_price = float(amounts[1])

            if current_price is None:
                logger.debug("Skipping product %s due to missing price", product_id)
                continue

            if old_price is None:
                old_price = current_price

            if discount_percent is None:
                if old_price > current_price:
                    discount_percent = round((1 - current_price / old_price) * 100)
                else:
                    discount_percent = 0

            if discounted_only and discount_percent <= 0:
                continue

            sku = self._extract_sku(item, product_id)
            image_url = self._extract_image_url(item, self.base_url)
            sizes = self._extract_sizes(item)
            gender = infer_gender(name, brand)

            products.append(
                Product(
                    product_id=product_id,
                    sku=sku,
                    name=name,
                    brand=brand,
                    current_price=current_price,
                    old_price=old_price,
                    discount_percent=discount_percent,
                    url=url,
                    timestamp=timestamp,
                    page=page,
                    image_url=image_url,
                    sizes=sizes,
                    gender=gender,
                )
            )

        return products

    def iter_pages(self) -> Any:
        """Yield (page_number, products, total_pages) for each scraped page."""
        first_html = self.fetch_page(1)
        if not first_html:
            raise RuntimeError("Failed to fetch first offer page")

        self.sync_params_from_pagination(first_html)
        total_pages = self.parse_total_pages(first_html)
        if self.max_pages > 0:
            total_pages = min(total_pages, self.max_pages)

        logger.info("Total pages to scrape: %s", total_pages)

        first_products = self.parse_products(first_html, page=1)
        logger.info("Page 1: found %s products", len(first_products))
        yield 1, first_products, total_pages

        for page in range(2, total_pages + 1):
            html = self.fetch_page(page)
            if not html:
                logger.error("Skipping page %s after retries exhausted", page)
                yield page, [], total_pages
                continue

            page_products = self.parse_products(html, page=page)
            logger.info("Page %s: found %s products", page, len(page_products))
            yield page, page_products, total_pages

    def scrape_all(self) -> tuple[list[Product], dict[str, Any]]:
        all_products: list[Product] = []
        pages_failed = 0
        total_pages = 0

        for page, page_products, total in self.iter_pages():
            total_pages = total
            if page_products:
                all_products.extend(page_products)
            else:
                pages_failed += 1

        meta = {
            "total_pages": total_pages,
            "pages_scraped": total_pages - pages_failed,
            "pages_failed": pages_failed,
            "products_found": len(all_products),
        }
        return all_products, meta
