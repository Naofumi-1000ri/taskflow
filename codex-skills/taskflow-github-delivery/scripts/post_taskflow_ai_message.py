#!/usr/bin/env python3

import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def build_content(issue, pr, status, details, extra_lines):
    lines = ["[AIからのメッセージ]"]
    lines.append(f"GitHub Issue: #{issue}" if issue else "GitHub Issue: なし")
    lines.append(f"GitHub PR: #{pr}" if pr else "GitHub PR: なし")
    if status:
        lines.append(f"状態: {status}")
    lines.append(f"詳細: {details}")
    lines.extend(extra_lines)
    return "\n".join(lines)


def parse_mentions(raw):
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def main():
    parser = argparse.ArgumentParser(
        description="Post an [AIからのメッセージ] sync-back comment to a TaskFlow task.",
    )
    parser.add_argument("--project-id", required=True, help="TaskFlow project ID")
    parser.add_argument("--task-id", required=True, help="TaskFlow task ID")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("TASKFLOW_BASE_URL", "https://taskflow-1000ri.vercel.app"),
        help="TaskFlow base URL. Defaults to $TASKFLOW_BASE_URL or production.",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("TASKFLOW_PAT"),
        help="TaskFlow PAT. Defaults to $TASKFLOW_PAT.",
    )
    parser.add_argument("--issue", help="GitHub issue number without #")
    parser.add_argument("--pr", help="GitHub PR number without #")
    parser.add_argument("--status", help="Short state such as triage, review, merged")
    parser.add_argument("--details", required=True, help="Japanese sync-back summary")
    parser.add_argument(
        "--extra-line",
        action="append",
        default=[],
        help="Additional line to append to the message. May be repeated.",
    )
    parser.add_argument(
        "--mentions",
        default="",
        help="Comma-separated mention IDs to include in the API payload.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the payload instead of sending the request.",
    )
    args = parser.parse_args()

    content = build_content(args.issue, args.pr, args.status, args.details, args.extra_line)
    payload = {
        "content": content,
        "mentions": parse_mentions(args.mentions),
    }

    if args.dry_run:
        json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return 0

    if not args.token:
        sys.stderr.write("Missing TaskFlow PAT. Pass --token or set TASKFLOW_PAT.\n")
        return 2

    url = (
        f"{args.base_url.rstrip('/')}/api/projects/{args.project_id}"
        f"/tasks/{args.task_id}/comments"
    )
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {args.token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        sys.stderr.write(f"TaskFlow API error {error.code}: {error_body}\n")
        return 1
    except urllib.error.URLError as error:
        sys.stderr.write(f"TaskFlow request failed: {error.reason}\n")
        return 1

    sys.stdout.write(body)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
