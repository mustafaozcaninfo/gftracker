#!/usr/bin/env python3
"""CLI entry point for GFTracker."""

from __future__ import annotations

import argparse
import json
import sys

from export_web import export_dashboard
from main import print_report, run_report, run_update


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Galeries Lafayette Qatar discounted product tracker",
    )
    parser.add_argument(
        "--config",
        default="config.yaml",
        help="Path to config file (default: config.yaml)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--update",
        action="store_true",
        help="Scrape all offer pages and update database",
    )
    group.add_argument(
        "--report",
        action="store_true",
        help="Show today's best discounts and price changes",
    )
    group.add_argument(
        "--export-web",
        action="store_true",
        help="Export dashboard JSON for the web UI (no scrape)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output report as JSON (use with --report)",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        if args.update:
            summary = run_update(config_path=args.config, verbose=args.verbose)
            print(json.dumps(summary, indent=2))
            return 0 if summary.get("scrape_complete") else 2

        if args.export_web:
            path = export_dashboard(config_path=args.config)
            print(json.dumps({"web_dashboard_path": str(path)}, indent=2))
            return 0

        report = run_report(config_path=args.config, verbose=args.verbose)
        if args.json:
            print(json.dumps(report, indent=2, ensure_ascii=False))
        else:
            print_report(report)
        return 0
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        if args.verbose:
            raise
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
