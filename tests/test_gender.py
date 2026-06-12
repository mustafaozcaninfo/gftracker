"""Gender inference tests."""

from __future__ import annotations

import unittest

from gender import infer_gender, resolve_product_gender


class GenderInferenceTests(unittest.TestCase):
    def test_women_not_classified_as_men(self) -> None:
        names = [
            "Adidas Women Hazy Copper Shoes",
            "Needle & Thread Women Lea Dress",
            "women",
            "womens",
            "women's coat",
        ]
        for name in names:
            self.assertEqual(infer_gender(name), "women")
            self.assertNotEqual(infer_gender(name), "men")

    def test_men_token(self) -> None:
        self.assertEqual(infer_gender("Nike Men Running Shoe"), "men")
        self.assertEqual(infer_gender("Men Shirt"), "men")

    def test_no_false_positive_amen(self) -> None:
        self.assertEqual(infer_gender("Amen bracelet"), "")

    def test_resolve_prefers_name_over_stored_conflict(self) -> None:
        self.assertEqual(
            resolve_product_gender(
                name="Marc Jacobs Women Tote Bag",
                brand="Marc Jacobs",
                stored_gender="men",
            ),
            "women",
        )


if __name__ == "__main__":
    unittest.main()
