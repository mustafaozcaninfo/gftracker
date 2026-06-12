"""Scraper size extraction tests."""

from __future__ import annotations

import unittest

from scraper import OfferScraper


class ScraperSizesTests(unittest.TestCase):
    def test_filters_by_index_and_salable(self) -> None:
        config = {
            "productId": "123",
            "index": {"101": ["opt1"], "102": ["opt2"]},
            "salable": {"size_attr": ["opt1", "opt2"]},
            "attributes": {
                "size_attr": {
                    "id": "size_attr",
                    "code": "size",
                    "options": [
                        {"id": "opt1", "label": "M", "products": ["101"]},
                        {"id": "opt2", "label": "L", "products": ["102"]},
                        {"id": "opt3", "label": "XL", "products": ["999"]},
                    ],
                }
            },
        }
        sizes = OfferScraper._sizes_from_json_config(config)
        self.assertEqual(sizes, ["M", "L"])

    def test_skips_options_without_child_products(self) -> None:
        config = {
            "attributes": {
                "size_attr": {
                    "id": "size_attr",
                    "code": "size",
                    "options": [
                        {"id": "opt1", "label": "M", "products": []},
                        {"id": "opt2", "label": "L", "products": ["101"]},
                    ],
                }
            },
        }
        self.assertEqual(OfferScraper._sizes_from_json_config(config), ["L"])


if __name__ == "__main__":
    unittest.main()
