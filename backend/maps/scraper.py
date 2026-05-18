"""
Google Maps three-step scraper.
  1. scrape.js         — collect listing cards from the Maps search feed
  2. detail.js         — visit each Maps business page -> phone, address, website
  3. website_scraper.js — visit the business website -> email + social media links
"""

import os
from concurrent.futures import ThreadPoolExecutor
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

_HERE = os.path.dirname(os.path.abspath(__file__))

def _load(name: str) -> str:
    with open(os.path.join(_HERE, name), encoding="utf-8") as f:
        return f.read()

SCRAPE_JS  = _load("scrape.js")
DETAIL_JS  = _load("detail.js")
WEBSITE_JS = _load("website_scraper.js")

_executor = ThreadPoolExecutor(max_workers=2)

_EMPTY_WEB = {"email": "", "facebook": "", "instagram": "", "tiktok": "", "twitter": "", "youtube": ""}


def _safe_eval(page, js: str, *args) -> dict:
    try:
        result = page.evaluate(js, *args) if args else page.evaluate(js)
        if isinstance(result, dict):
            return result
    except Exception:
        pass
    return {}


def _scrape_website(page, url: str, log) -> dict:
    """Visit the business website and return email + social links."""
    if not url or not url.startswith("http"):
        return dict(_EMPTY_WEB)
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(2000)
        data = _safe_eval(page, WEBSITE_JS)

        # If email still missing, try common contact pages
        if not data.get("email"):
            for path in ["/contact", "/contact-us", "/about", "/about-us"]:
                try:
                    page.goto(url.rstrip("/") + path, wait_until="domcontentloaded", timeout=10000)
                    page.wait_for_timeout(1500)
                    extra = _safe_eval(page, WEBSITE_JS)
                    if extra.get("email"):
                        data["email"] = extra["email"]
                    for key in ["facebook", "instagram", "tiktok", "twitter", "youtube"]:
                        if not data.get(key) and extra.get(key):
                            data[key] = extra[key]
                    if data.get("email"):
                        break
                except Exception:
                    pass

        return {k: data.get(k, "") or "" for k in _EMPTY_WEB}
    except Exception as e:
        log(f"Website error: {e}")
        return dict(_EMPTY_WEB)


def _sync_scrape(query: str, max_results: int, progress_cb=None) -> list:
    def _log(msg: str):
        if progress_cb:
            progress_cb(msg)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-infobars",
                "--ignore-certificate-errors",
            ],
        )
        context = browser.new_context(
            locale="en-US",
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            java_script_enabled=True,
            ignore_https_errors=True,
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = context.new_page()

        # ── Step 1: Maps search feed ──────────────────────────────────
        maps_url = "https://www.google.com/maps/search/" + query.replace(" ", "+")
        _log(f'Searching Google Maps for "{query}"…')
        page.goto(maps_url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)

        feed_sel = 'div[role="feed"]'
        try:
            page.wait_for_selector(feed_sel, timeout=10000)
            for _ in range(max(6, max_results // 3)):
                page.eval_on_selector(feed_sel, "el => el.scrollBy(0, 800)")
                page.wait_for_timeout(600)
        except PWTimeout:
            _log("Feed not found, trying anyway…")

        try:
            page.wait_for_selector('a[href^="https://www.google.com/maps/place"]', timeout=12000)
        except PWTimeout:
            _log("No listings found")
            browser.close()
            return []

        cards = page.evaluate(SCRAPE_JS, max_results)
        cards = [c for c in cards if c.get("title")]
        _log(f"Found {len(cards)} listings — loading details…")

        results = []

        for i, card in enumerate(cards):
            href  = card.get("href", "")
            title = card.get("title", "")
            _log(f"{i+1}/{len(cards)}: {title}")

            # ── Step 2: Maps business detail page ────────────────────
            detail = {}
            if href:
                try:
                    page.goto(href, wait_until="domcontentloaded", timeout=20000)
                    page.wait_for_timeout(2000)
                    try:
                        page.wait_for_selector("[data-item-id]", timeout=8000)
                    except PWTimeout:
                        pass
                    detail = _safe_eval(page, DETAIL_JS)
                except Exception as e:
                    _log(f"Maps detail error for {title}: {e}")

            phone   = detail.get("phone",   "") or ""
            address = detail.get("address", "") or ""
            website = detail.get("website", "") or ""

            # ── Step 3: Business website -> email + socials ───────────
            if website:
                _log(f"  Scraping website for {title}…")
            web_data = _scrape_website(page, website, _log)

            results.append({
                "title":       title,
                "rating":      card.get("rating",      "") or "",
                "reviewCount": card.get("reviewCount", "") or "",
                "industry":    card.get("industry",    "") or "",
                "address":     address,
                "phone":       phone,
                "website":     website,
                "email":       web_data["email"],
                "facebook":    web_data["facebook"],
                "instagram":   web_data["instagram"],
                "tiktok":      web_data["tiktok"],
                "twitter":     web_data["twitter"],
                "youtube":     web_data["youtube"],
                "href":        href,
            })

            page.wait_for_timeout(500)

        browser.close()
        _log(f"Done — {len(results)} results scraped")
        return results


def scrape_google_maps(query: str, max_results: int, progress_cb=None) -> list:
    """Sync — called from main.py via run_in_executor (already in a thread)."""
    return _sync_scrape(query, max_results, progress_cb=progress_cb)
