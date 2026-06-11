"""Infer product gender/audience from catalog naming conventions."""

from __future__ import annotations

import re

_GENDER_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bunisex\b", re.IGNORECASE), "unisex"),
    (re.compile(r"\bwomen(?:'s|s)?\b", re.IGNORECASE), "women"),
    (re.compile(r"\bmen(?:'s|s)?\b", re.IGNORECASE), "men"),
    (re.compile(r"\bkids?\b", re.IGNORECASE), "kids"),
    (re.compile(r"\bboys?\b", re.IGNORECASE), "kids"),
    (re.compile(r"\bgirls?\b", re.IGNORECASE), "kids"),
)


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
