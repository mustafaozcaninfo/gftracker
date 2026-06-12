"""Infer product gender/audience from catalog naming conventions."""

from __future__ import annotations

import re

# (?<![a-z]) prevents "men" matching inside "women" / "amen".
_GENDER_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bunisex\b", re.IGNORECASE), "unisex"),
    (re.compile(r"\bwomen(?:'s|s)?\b", re.IGNORECASE), "women"),
    (re.compile(r"(?<![a-z])men(?:'s|s)?\b", re.IGNORECASE), "men"),
    (re.compile(r"\bkids?\b", re.IGNORECASE), "kids"),
    (re.compile(r"\bboys?\b", re.IGNORECASE), "kids"),
    (re.compile(r"\bgirls?\b", re.IGNORECASE), "kids"),
)

_VALID_GENDERS = frozenset({"men", "women", "kids", "unisex"})


def normalize_gender(value: str | None) -> str:
    gender = (value or "").strip().lower()
    return gender if gender in _VALID_GENDERS else ""


def infer_gender(name: str, brand: str = "") -> str:
    """Return men | women | kids | unisex | empty string if unknown."""
    if not name:
        return ""

    haystack = name
    if brand:
        prefix = brand.strip()
        if name.lower().startswith(prefix.lower()):
            haystack = name[len(prefix) :].strip()

    for pattern, gender in _GENDER_RULES:
        if pattern.search(haystack) or pattern.search(name):
            return gender
    return ""


def resolve_product_gender(
    *,
    name: str,
    brand: str = "",
    stored_gender: str | None = None,
) -> str:
    """Prefer explicit name tokens over a stale stored gender value."""
    inferred = infer_gender(name, brand)
    stored = normalize_gender(stored_gender)
    if inferred and stored and inferred != stored:
        return inferred
    return stored or inferred
