#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = [
#     "requests",
#     "python-dotenv",
# ]
# ///

import argparse
import json
import os
import re
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv
from zoneinfo import ZoneInfo


def parse_timedelta(delta_str: str) -> timedelta:
    if delta_str == "now":
        return timedelta()

    pattern = r'^-(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$'
    match = re.match(pattern, delta_str)
    if not match:
        raise ValueError(f"Invalid timedelta format: {delta_str}")

    days = int(match.group(1) or 0)
    hours = int(match.group(2) or 0)
    minutes = int(match.group(3) or 0)
    seconds = int(match.group(4) or 0)

    if days == 0 and hours == 0 and minutes == 0 and seconds == 0:
        raise ValueError(f"Invalid timedelta format: {delta_str}")

    return timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)


def parse_time(time_str: str, tz: ZoneInfo) -> str:
    now = datetime.now(tz)

    if time_str == "now" or time_str.startswith("-"):
        delta = parse_timedelta(time_str)
        result_dt = now - delta
        utc_dt = result_dt.astimezone(ZoneInfo("UTC"))
        return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    today = now.date()
    time_parts = datetime.strptime(time_str, "%H:%M:%S").time()
    local_dt = datetime.combine(today, time_parts, tzinfo=tz)
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


TIME_FORMAT_HELP = """Time can be specified in two formats:
  1. Absolute: HH:MM:SS (Toronto/New York timezone, e.g., 14:30:00)
  2. Relative: timedelta from now (e.g., -1h, -30m, -2d, -1h30m, now)
     Supported units: d (days), h (hours), m (minutes), s (seconds)
     Examples: -1h (1 hour ago), -30m (30 min ago), -1d2h (1 day 2 hours ago), now"""


def main():
    parser = argparse.ArgumentParser(
        description="Query Datadog logs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=TIME_FORMAT_HELP
    )
    parser.add_argument("--from", dest="from_time", required=True,
                        help="Start time (see format options below)")
    parser.add_argument("--to", dest="to_time", default="now",
                        help="End time (default: now, see format options below)")
    parser.add_argument("--query", default="",
                        help="Datadog log query (default: empty). Can be used to introduce various filters to narrow down results.\
                            The most useful one is @logger:<logger_name> to filter for a specific logger. (or -@logger to ignore a logger.)")
    args = parser.parse_args()

    load_dotenv()

    api_key = os.environ["DD_API_KEY"]
    app_key = os.environ["DD_APP_KEY"]

    tz = ZoneInfo("America/Toronto")
    from_utc = parse_time(args.from_time, tz)
    to_utc = parse_time(args.to_time, tz)

    payload = {
        "filter": {
            "from": from_utc,
            "to": to_utc,
            "query": args.query
        },
        "sort": "timestamp",
        "page": {
            "limit": 200
        }
    }

    response = requests.post(
        "https://api.datadoghq.com/api/v2/logs/events/search",
        headers={
            "Content-Type": "application/json",
            "DD-API-KEY": api_key,
            "DD-APPLICATION-KEY": app_key,
        },
        json=payload,
    )

    response.raise_for_status()
    print(json.dumps(response.json(), indent=2))


if __name__ == "__main__":
    main()

