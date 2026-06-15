"""Optional Telegram / Discord notifications after daily scrape."""

from __future__ import annotations

import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)


def build_summary_message(summary: dict[str, Any], stats: dict[str, Any]) -> str:
    lines = [
        "GF Tracker — hourly update",
        f"Products: {stats.get('total_products', 0):,}",
        f"Price changes today: {stats.get('price_changes_today', 0)}",
        f"Drops today: {stats.get('drops_today', 0)}",
        f"New products (48h): {stats.get('new_products_48h', 0):,}",
        f"Avg discount: {stats.get('avg_discount', 0)}%",
        f"50%+ off: {stats.get('high_discount_50_plus', 0):,}",
        f"Pages scraped: {summary.get('pages_scraped', 0)}/{summary.get('total_pages', 0)}",
        f"Days tracked: {stats.get('days_tracked', 0)}",
        f"Sold (24h, Qatar): {stats.get('sold_recent_24h', 0)}",
        f"Sold (total gone): {stats.get('sold_total', 0)}",
        "https://gftracker.vercel.app/sold",
    ]
    return "\n".join(lines)


def build_failure_message(reason: str, summary: dict[str, Any] | None = None) -> str:
    lines = ["GF Tracker — scrape FAILED", reason]
    if summary:
        lines.append(
            f"Pages: {summary.get('pages_scraped', 0)}/{summary.get('total_pages', 0)} "
            f"({summary.get('pages_failed', 0)} failed)"
        )
        lines.append(f"Products seen: {summary.get('products_found', 0):,}")
    lines.append("https://github.com/mustafaozcaninfo/gftracker/actions")
    return "\n".join(lines)


def send_telegram(token: str, chat_id: str, text: str) -> bool:
    try:
        response = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
            timeout=30,
        )
    except requests.RequestException as exc:
        logger.warning("Telegram notify error: %s", exc)
        return False
    if not response.ok:
        logger.warning(
            "Telegram notify failed: %s %s",
            response.status_code,
            response.text[:300],
        )
        return False
    return True


def send_discord(webhook_url: str, text: str) -> bool:
    try:
        response = requests.post(
            webhook_url,
            json={"content": text},
            timeout=30,
        )
    except requests.RequestException as exc:
        logger.warning("Discord notify error: %s", exc)
        return False
    if not response.ok:
        logger.warning(
            "Discord notify failed: %s %s",
            response.status_code,
            response.text[:300],
        )
        return False
    return True


def _dispatch(text: str) -> bool:
    telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    telegram_chat = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    discord_webhook = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()

    sent = False
    if telegram_token and telegram_chat:
        sent = send_telegram(telegram_token, telegram_chat, text) or sent
    if discord_webhook:
        sent = send_discord(discord_webhook, text) or sent
    if not sent and (telegram_token or discord_webhook):
        logger.info("Notification channels configured but none delivered successfully")
    return sent


def notify_daily_summary(summary: dict[str, Any], stats: dict[str, Any]) -> bool:
    text = build_summary_message(summary, stats)
    return _dispatch(text)


def notify_scrape_failure(reason: str, summary: dict[str, Any] | None = None) -> bool:
    text = build_failure_message(reason, summary)
    return _dispatch(text)
