"""Optional Telegram / Discord notifications after daily scrape."""

from __future__ import annotations

import os
from typing import Any

import requests


def build_summary_message(summary: dict[str, Any], stats: dict[str, Any]) -> str:
    lines = [
        "GF Tracker — daily update",
        f"Products: {stats.get('total_products', 0):,}",
        f"Price changes today: {stats.get('price_changes_today', 0)}",
        f"Buy signals: {stats.get('buy_signals_count', 0):,}",
        f"Avg discount: {stats.get('avg_discount', 0)}%",
        f"50%+ off: {stats.get('high_discount_50_plus', 0):,}",
        f"Pages scraped: {summary.get('pages_scraped', 0)}/{summary.get('total_pages', 0)}",
        f"Days tracked: {stats.get('days_tracked', 0)}",
        "https://gftracker.vercel.app",
    ]
    return "\n".join(lines)


def send_telegram(token: str, chat_id: str, text: str) -> bool:
    response = requests.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
        timeout=30,
    )
    return response.ok


def send_discord(webhook_url: str, text: str) -> bool:
    response = requests.post(
        webhook_url,
        json={"content": text},
        timeout=30,
    )
    return response.ok


def notify_daily_summary(summary: dict[str, Any], stats: dict[str, Any]) -> None:
    text = build_summary_message(summary, stats)
    telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    telegram_chat = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    discord_webhook = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()

    if telegram_token and telegram_chat:
        send_telegram(telegram_token, telegram_chat, text)
    if discord_webhook:
        send_discord(discord_webhook, text)
