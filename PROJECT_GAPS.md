# GFTracker — Proje Eksikleri & Fix Listesi

> **Amaç:** Tek bir fix çıkışında tamamlanacak tüm açık noktalar.  
> **Tarih:** 2026-06-12  
> **Kapsam:** Python scraper, SQLite, export, Next.js web, PWA, CI/CD, Cloudflare cron, dokümantasyon.

Öncelik: **P0** (kırık/yanlış veri) → **P1** (önemli UX/operasyon) → **P2** (kalite/tutarlılık) → **P3** (temizlik).

---

## Özet (sayılar)

| Alan | P0 | P1 | P2 | P3 |
|------|----|----|----|-----|
| Veri / export | 4 | 2 | 2 | 1 |
| Python backend | 2 | 5 | 6 | 4 |
| Web (Next.js) | 2 | 8 | 10 | 6 |
| CI/CD & infra | 1 | 5 | 4 | 3 |
| Dokümantasyon | 0 | 1 | 1 | 0 |
| Test & kalite | 0 | 2 | 2 | 1 |

---

## P0 — Kritik (önce bunlar)

### VERİ-01 · `sold_products.json` repoda yok
- **Dosyalar:** `web/public/data/` (eksik), `export_web.py:211-225`, `web/lib/data.ts`, `web/app/sold/page.tsx`, `web/components/ProductDetail.tsx`, `web/public/sw.js:2`
- **Sorun:** Sold sayfası ve sold ürün detayı boş; PWA precache `sold_products.json` ile **install başarısız** olabilir.
- **Fix:** Export sonrası dosyanın üretildiğini doğrula; repodaki seed JSON’u güncelle veya SW precache listesinden kaldır / opsiyonel yap.

### VERİ-02 · `buy_signals.json` tüm katalog (4825 ürün, ~3.7MB)
- **Dosyalar:** `web/public/data/buy_signals.json`, `models.py` `get_buy_signals()`, `web/components/BuySignalsGrid.tsx`
- **Sorun:** Backend `min_days_tracked >= 2` + fiyat varyasyonu filtresi uyguluyor; export/UI “4825 buy signal” gösteriyor — **mantık ile veri uyumsuz**.
- **Fix:** Export’u backend filtresiyle hizala; sayfa client-fetch yerine server `loadBuySignals()` kullansın.

### VERİ-03 · `meta.json` stale / eksik alanlar
- **Dosya:** `web/public/data/meta.json`
- **Sorun:** `drops_today`, `sold_total`, `sold_recent_48h`, `discount_buckets`, `high_discount_*` yok; `total_pages: 0` ama `scrape_history` 152 sayfa gösteriyor.
- **Fix:** Son başarılı export’u commit/deploy et veya overview kartlarını eksik alanlara dayanınca graceful fallback.

### VERİ-04 · `products.json` export alanları eksik (repo kopyası)
- **Dosyalar:** `export_web.py:186-198`, `web/components/SizesHub.tsx:36-38`
- **Sorun:** `size_counts`, `gender_counts`, `genders`, `sparkline` repodaki JSON’da yok → `/sizes` sayım fallback’i her size için **1** gösterir.
- **Fix:** Export çıktısını doğrula; seed JSON güncelle.

### WEB-01 · `products.json` (3.7MB) her sayfada tekrar client-fetch
- **Dosyalar:** `ProductGrid`, `ProductDetail`, `SimilarProducts`, `CompareView`, `MyListTabs`, `WatchlistDropBanner`, `SizesHub`, `PageShell`
- **Sorun:** Aynı büyük dosya mount başına indirilir; watchlist banner **tüm sayfalarda** fetch tetikler.
- **Fix:** Ortak cache (SWR/React context), banner için hafif endpoint veya sadece ilgili ID’ler; SSR’e taşıma (en azından ana sayfalar).

### PY-01 · Kısmi scrape + deploy = eksik katalog + sold diff yok
- **Dosyalar:** `main.py:77-94`, `daily_tracker.py:40-47`, `.github/workflows/daily-tracker.yml:47` (`continue-on-error: true`)
- **Sorun:** Sayfa hatası olunca catalog diff atlanır ama deploy devam eder; kullanıcı eski/eksik veri görür.
- **Fix:** Deploy’u tam scrape + başarılı export’a bağla; kısmi run’da deploy atlansın veya önceki JSON korunsun.

### INFRA-01 · PWA SW precache kırık dosyaya bağlı
- **Dosya:** `web/public/sw.js:2`
- **Sorun:** `sold_products.json` precache zorunlu → VERİ-01 ile birlikte SW install fail.
- **Fix:** Precache listesini mevcut dosyalarla hizala veya `cache.add` tek tek catch.

---

## P1 — Yüksek öncelik

### PY-02 · Fiyat değişimi semantiği belirsiz
- **Dosya:** `models.py` (docstring “günler arası” vs kod aynı gün içi karşılaştırma)
- **Sorun:** Saatlik scrape’te aynı gün birden fazla `price_changes` satırı; `get_today_price_changes` tekrarlı ürün gösterebilir.
- **Fix:** Ya dokümantasyonu “intraday” diye güncelle ya da gün başına tek değişim (UPSERT/dedup).

### PY-03 · Sold “son 24/48 saat” UTC, iş mantığı Qatar
- **Dosya:** `models.py` `get_sold_products` — `datetime('now')` vs `Qatar_TZ` `_today()`
- **Fix:** Qatar TZ ile hizala veya UI’da “UTC” belirt.

### PY-04 · `print_report` None fiyat crash
- **Dosya:** `main.py:196-197`
- **Fix:** `current_price` None guard.

### PY-05 · `run_full_scrape.py` exception’da run `failed` işaretlenmiyor
- **Dosya:** `run_full_scrape.py` (main.py’deki try/except yok)
- **Fix:** main.py ile aynı hata yakalama.

### PY-06 · `notify.py` sessiz hata
- **Dosya:** `notify.py`
- **Sorun:** HTTP hata kontrolü / log yok; scrape başarı bildirimi gider, failure bildirimi yok.
- **Fix:** `response.ok` kontrolü; workflow failure için ayrı notify adımı.

### WEB-02 · Ürün detay tamamen client-side
- **Dosya:** `web/app/products/[id]/page.tsx`, `ProductDetail.tsx`
- **Sorun:** SEO yok, yavaş FCP, fetch hatası → “Product not found”.
- **Fix:** Server’da ürün yükle (products.json veya build-time slice); `generateMetadata`.

### WEB-03 · Buy signals / best deals “Today” metni yanıltıcı
- **Dosyalar:** `best-deals/page.tsx`, `get_today_best_deals` (`models.py`)
- **Fix:** Metin veya backend “bugün scrape” vs “tüm katalog en yüksek indirim” netleştir.

### WEB-04 · `/price-changes` nav’da yok
- **Dosyalar:** `web/app/price-changes/page.tsx`, `SiteHeader.tsx`, `biggest-drops/page.tsx` (`<a>` not `Link`)
- **Fix:** Nav’a ekle veya `/biggest-drops` altına birleştir; `Link` kullan.

### WEB-05 · `ProductDetail` fetch hata yönetimi yok
- **Dosya:** `ProductDetail.tsx` — `Promise.all` without `.catch`
- **Fix:** Ayrı error state; `sold_products.json` 404 için graceful.

### WEB-06 · Compare’da gender boş
- **Dosya:** `CompareView.tsx:72` — `p.gender` vs `productGender()`
- **Fix:** `productGender(product)` kullan.

### WEB-07 · `MyList` nav badge kirliliği
- **Dosya:** `my-list/page.tsx` — `counts.changes` Price Drops badge’ini etkiler
- **Fix:** PageShell counts’u sayfaya özel yap veya my-list’te counts geçirme.

### WEB-08 · `SiteHeader` “Awaiting first scrape” yanlış
- **Dosya:** `SiteHeader.tsx` — `total_pages === 0` iken gösterir, ürün varken bile
- **Fix:** `scrape_history` veya `total_products` ile koşul.

### INFRA-02 · README yok
- **Eksik:** Kök `README.md`, `workers/github-cron/README.md`, `.env.example`
- **Fix:** Kurulum, secret listesi, cron mimarisi, local dev.

### INFRA-03 · SYSTEM.md ciddi şekilde stale
- **Dosya:** `SYSTEM.md`
- **Yanlış:** günlük cron, GH schedule `0 3 * * *`, cache yok, sayfa listesi eksik, catalog snapshot/sold diff yok, hourly CF worker yok.
- **Fix:** Tek kaynak doküman olarak güncelle veya README’ye taşı.

### INFRA-04 · Worker deploy CI’da yok; cron fail sessiz
- **Dosyalar:** `workers/github-cron/`, `src/index.ts`
- **Fix:** Deploy workflow veya runbook; scheduled handler’da alert/retry.

### INFRA-05 · `setup-pat.sh` vs worker API uyumsuzluğu
- **Dosyalar:** `setup-pat.sh` (`repository_dispatch`), `index.ts` (`workflow_dispatch`)
- **Fix:** Setup script’i gerçek dispatch path’i test etsin.

---

## P2 — Orta öncelik (tutarlılık & kalite)

### PY-07 · `get_biggest_drops` sadece son 500 price_changes
- **Dosya:** `models.py:938-952`
- **Fix:** Tarih indeksli sorgu veya materialized view.

### PY-08 · `JSON_CONFIG_PATTERN` kırılgan
- **Dosya:** `scraper.py:25`
- **Fix:** Parse failure metrikleri; alternatif selector.

### PY-09 · `ScrapeStats.errors` hiç doldurulmuyor
- **Dosya:** `models.py:70`

### PY-10 · `use_playwright` config ölü anahtar
- **Dosya:** `config.yaml:26`

### PY-11 · `scrape_all()` ölü kod
- **Dosya:** `scraper.py:509-527`

### PY-12 · `upsert_products()` legacy, kullanılmıyor
- **Dosya:** `models.py:1075-1083`

### PY-12b · Çift `export_dashboard` çağrısı
- **Dosyalar:** `main.py`, `daily_tracker.py`

### PY-13 · `gender.py` ↔ `web/lib/gender.ts` duplicate
- **Risk:** Drift; tek kaynak veya generate.

### PY-14 · `backfill_gender.py` export çağırmıyor
- **Fix:** Diğer backfill’ler gibi `export_dashboard()` ekle.

### WEB-09 · `dashboard.json` 9MB — hiç okunmuyor
- **Dosya:** `web/public/data/dashboard.json`, `export_web.py:238`
- **Fix:** Üretmeyi bırak veya tek kaynak yap.

### WEB-10 · Boş state eksikleri
- **Dosyalar:** `best-deals/page.tsx`, `BrandsGrid.tsx`, `SizesHub.tsx`, `CompareView.tsx` (partial compare)

### WEB-11 · App router `error.tsx` / `not-found.tsx` / `loading.tsx` yok

### WEB-12 · Erişilebilirlik
- Form label `htmlFor`/`id` yok (`ProductGrid`, `BrandsGrid`, `SizesHub`)
- Tab ARIA (`MyListTabs`, `SoldList`) — `aria-controls` eksik
- `PriceHistoryChart`, `DiscountHistogram` — screen reader alternatifi yok
- Skip to main content yok

### WEB-13 · SEO
- Route bazlı `generateMetadata` yok
- `robots.txt` / `sitemap.xml` yok
- `feed.xml` hardcoded domain (`feed.xml/route.ts:3`)

### WEB-14 · Nav / sayfa isim tutarsızlıkları
- “Offer Tracker” vs “GF Tracker”; “Sold” vs “Sold / Gone”; “Price Drops” count farklı sayfalarda farklı anlam

### WEB-15 · `PriceChanges` başlığı her yerde “Recent Price Changes”
- `/price-changes`, my-list changes tab — context’e göre başlık

### WEB-16 · Compare 4 ürün limiti sessizce en eskiyi atar
- **Dosya:** `web/lib/compare.ts`

### WEB-17 · Tüm görseller `unoptimized`
- Next Image optimizasyonu kapalı her yerde

### INFRA-06 · PR/push CI yok — sadece hourly workflow
- Lint, build, minimal test yok

### INFRA-07 · `requirements.txt` lock yok
- Reproducible build riski

### INFRA-08 · `.gitignore` eksikleri
- `data/daily_snapshot_*.json` tracked olabilir
- `workers/github-cron/.dev.vars`, `.wrangler/` ignore değil

### INFRA-09 · Cloudflare `CRON_SECRET` opsiyonel
- `/trigger` public kalabilir (`workers/github-cron/src/index.ts`)

### DOC-01 · `config.test.yaml` gitignore’da ama örnek yok

---

## P3 — Düşük öncelik / temizlik

### PY-15 · `match_current` unused (`scraper.py:433`)

### PY-16 · `tracker.py --update` exit code her zaman 0

### WEB-18 · Ölü kod
- `loadBrandStats()` (`data.ts`)
- `DashboardData` (`types.ts`)
- `savingsPercent()` (`format.ts`)
- `isBrandAvailable`, `isGenderAvailable` (`catalog-filters.ts`)
- `FilterFacets.matchCount`
- `ProductCard.showLike` hiç false değil
- `LikeButton.className` hiç geçilmiyor

### WEB-19 · `MyListToolbar` share `prompt()` — mobil UX zayıf

### WEB-20 · PWA manifest SVG-only icons — PNG maskable yok

### WEB-21 · `ServiceWorkerRegister` hataları swallow

### INFRA-10 · Vercel `ignoreCommand: exit 0` — git push build skip (bilinçli ama dokümante edilmeli)

### INFRA-11 · Hardcoded Vercel org/project ID workflow’da

### TEST-01 · Sıfır otomatik test
- Önerilen minimum:
  - `scraper._sizes_from_json_config` unit
  - `apply_catalog_diff` / sold diff unit
  - `productMatchesFilters` / `productGender`
  - Export JSON shape smoke test
  - `web` build + lint CI adımı

---

## Dosya envanteri (gözden geçirildi)

### Python (kök)
| Dosya | Durum |
|-------|--------|
| `scraper.py` | ✅ incelendi — size fix yapıldı; JSON regex P2 |
| `models.py` | ✅ — catalog snapshot diff yapıldı; timezone P1 |
| `main.py` | ✅ |
| `daily_tracker.py` | ✅ |
| `export_web.py` | ✅ — sold export var, seed data eksik |
| `notify.py` | ✅ — P1 |
| `tracker.py` | ✅ |
| `gender.py` | ✅ |
| `run_full_scrape.py` | ✅ — P1 exception handling |
| `backfill_sizes.py` | ✅ |
| `backfill_gender.py` | ✅ — export eksik |
| `backfill_images.py` | ✅ |
| `config.yaml` | ✅ |
| `requirements.txt` | ✅ |

### Web (`web/`)
| Alan | Dosya sayısı | Not |
|------|----------------|-----|
| `app/` routes | 14 route | Hepsi listelendi |
| `components/` | 36 | Hepsi tarandı |
| `lib/` | 10 | Hepsi tarandı |
| `public/data/` | 9 JSON | `sold_products.json` **eksik** |

### Infra
| Dosya | Not |
|-------|-----|
| `.github/workflows/daily-tracker.yml` | Tek workflow |
| `workers/github-cron/` | Manuel deploy |
| `vercel.json` (root + web) | İkili config |
| `SYSTEM.md` | Stale |

---

## Önerilen tek fix çıkışı sırası

Aşağıdaki sıra tek PR veya birkaç küçük PR ile “projeyi tamamlama” için önerilir:

### Faz 1 — Veri doğruluğu (P0)
1. [x] `get_buy_signals` export filtresini doğrula + `buy_signals.json` küçült
2. [x] `export_web` çıktısının tam setini üret (`sold_products`, `size_counts`, tam `meta.stats`)
3. [x] `sw.js` precache düzelt
4. [x] CI: kısmi scrape’te deploy politikasını netleştir

### Faz 2 — Web performans & kırık UX (P0–P1)
5. [x] `products.json` fetch stratejisi (context/SWR veya SSR)
6. [x] `ProductDetail` server data + error states
7. [x] Sold + product detail sold fallback test
8. [x] Nav, badge, header scrape line düzeltmeleri

### Faz 3 — Backend sağlamlık (P1)
9. [x] Qatar TZ sold window
10. [x] `notify` failure path
11. [x] `run_full_scrape` try/except
12. [x] Price change dedup veya dokümantasyon

### Faz 4 — Infra & docs (P1–P2)
13. [x] `README.md` + worker README + `.env.example`
14. [x] `SYSTEM.md` güncelle veya deprecate
15. [x] PR CI: `npm run build`, `pip` smoke, optional pytest
16. [x] `.gitignore` tamamla

### Faz 5 — Kalite (P2–P3)
17. [x] Dead code temizliği
18. [x] a11y + SEO temel
19. [x] Unit testler (scraper sizes, catalog diff, filters)
20. [x] `dashboard.json` kaldır veya kullan

---

## Son yapılan fix’ler (bu listede tekrar fix gerekmez)

- [x] Ürün linkleri tüm alt sayfalarda (`productDetailHref`, ProductCard, My List, PriceChanges, Sold, Compare)
- [x] `/products` UX (View details, max price debounce, rank kaldırıldı)
- [x] Size extraction — `jsonConfig.index` ile stokta olan bedenler (`scraper._sizes_from_json_config`)
- [x] Sold detection — run-to-run `catalog_snapshot` diff (`models.finalize_scrape_catalog`)
- [x] Kısmi scrape’te deploy devam (`continue-on-error`) — **politika hâlâ P0 INFRA tartışması**

---

## Hızlı referans: secret / env listesi

| Secret | Nerede |
|--------|--------|
| `VERCEL_TOKEN` | GitHub Actions |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Workflow (hardcoded) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | GitHub Actions → `notify.py` |
| `DISCORD_WEBHOOK_URL` | GitHub Actions → `notify.py` |
| `GITHUB_PAT` | Cloudflare Worker secret |
| `CRON_SECRET` | Cloudflare Worker (opsiyonel, `/trigger`) |

---

*Bu dosya tek fix sprint’i için kaynak liste. Her madde tamamlandığında `[ ]` → `[x]` işaretle.*
