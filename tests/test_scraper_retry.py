"""Scraper retry/backoff tests."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from scraper import RETRYABLE_STATUSES, OfferUnavailableError, StealthSession


class StealthSessionRetryTests(unittest.TestCase):
    def _session(self, **overrides) -> StealthSession:
        cfg = {
            "base_url": "https://www.galerieslafayette.qa",
            "scraper": {
                "retry_backoff": 2.0,
                "retry_max_wait": 90.0,
                **overrides,
            },
        }
        return StealthSession(cfg)

    def test_backoff_longer_for_503(self) -> None:
        session = self._session()
        plain = session._backoff_seconds(2, 404)
        server = session._backoff_seconds(2, 503)
        self.assertGreater(server, plain)

    def test_backoff_respects_max_wait(self) -> None:
        session = self._session(retry_max_wait=10.0)
        delay = session._backoff_seconds(6, 503)
        self.assertLessEqual(delay, 12.5)

    def test_retryable_statuses_include_503(self) -> None:
        self.assertIn(503, RETRYABLE_STATUSES)

    @patch("scraper.time.sleep")
    @patch("scraper.requests.Session.get")
    def test_resets_session_after_503(self, mock_get, mock_sleep) -> None:
        response = unittest.mock.Mock()
        response.status_code = 503
        response.headers = {}
        mock_get.return_value = response

        session = self._session(max_retries=2)
        with patch.object(session, "reset") as reset:
            result = session.get("https://www.galerieslafayette.qa/offer.html")
        self.assertIsNone(result)
        self.assertEqual(reset.call_count, 2)

    @patch("scraper.time.sleep")
    @patch("scraper.requests.Session.get")
    def test_404_raises_without_retry(self, mock_get, mock_sleep) -> None:
        response = unittest.mock.Mock()
        response.status_code = 404
        response.headers = {}
        mock_get.return_value = response

        session = self._session(max_retries=8)
        with self.assertRaises(OfferUnavailableError) as ctx:
            session.get("https://www.galerieslafayette.qa/offer.html?is_scroll=1&p=1")
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(mock_get.call_count, 1)


if __name__ == "__main__":
    unittest.main()
