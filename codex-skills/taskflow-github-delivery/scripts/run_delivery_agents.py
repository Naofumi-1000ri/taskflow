#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


@dataclass
class Stage:
    id: str
    folder: Path
    default_prompt: str


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_state() -> dict[str, Any]:
    return {"createdAt": utc_now(), "stages": {}, "attempts": {"total": 0}, "context": {}}


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        loaded = yaml.safe_load(handle)
    if not isinstance(loaded, dict):
        raise ValueError(f"Expected YAML object in {path}")
    return loaded


def load_pipeline(skill_dir: Path) -> list[str]:
    pipeline_path = skill_dir / "agents" / "pipeline.yaml"
    data = load_yaml(pipeline_path)
    pipeline = data.get("pipeline", {})
    stages = pipeline.get("stages", [])
    if not isinstance(stages, list):
        raise ValueError("pipeline.stages must be a list")
    return [stage["id"] for stage in stages]


def load_stage(skill_dir: Path, stage_id: str) -> Stage:
    stage_dir = skill_dir / "agents" / stage_id
    config = load_yaml(stage_dir / "openai.yaml")
    interface = config.get("interface", {})
    default_prompt = interface.get("default_prompt")
    if not isinstance(default_prompt, str) or not default_prompt.strip():
        raise ValueError(f"Missing interface.default_prompt in {stage_dir / 'openai.yaml'}")
    return Stage(id=stage_id, folder=stage_dir, default_prompt=default_prompt.strip())


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", value.lower()).strip("-") or "run"


def detect_remote_slug(repo_root: Path) -> str:
    result = subprocess.run(
        ["git", "remote", "get-url", "origin"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    remote = result.stdout.strip()
    match = re.search(r"github\.com[:/](?P<slug>[^/]+/[^/.]+)", remote)
    if not match:
        raise ValueError(f"Could not parse GitHub slug from remote {remote!r}")
    return match.group("slug")


def build_stage_prompt(
    stage: Stage,
    args: argparse.Namespace,
    repo_slug: str,
    issue_url: str | None,
    pr_url: str | None,
) -> str:
    lines = [stage.default_prompt, "", f"Repository: {repo_slug}"]
    if issue_url:
        lines.append(f"Issue: {issue_url}")
    if pr_url:
        lines.append(f"PR: {pr_url}")
    if args.base_branch:
        lines.append(f"Base branch: {args.base_branch}")
    lines.extend(
        [
            "",
            "Execution contract:",
            "- If you cannot proceed or the result is not acceptable, start the final response with `NG:` and give the reason.",
            "- If you can proceed successfully, start the final response with `OK:` and give a short summary.",
        ]
    )

    if stage.id == "issue-to-code":
        lines.extend(
            [
                "- If you create or update a PR, include a line `PR: <url>` in the final response.",
                "- Include a line `Verification: <summary>` in the final response.",
            ]
        )
    elif stage.id == "pr-review":
        lines.extend(
            [
                "- Review the current branch against the base branch.",
                "- If the PR is mergeable, include a line `Review: approved`.",
                "- If the PR is not mergeable, use `NG:` and summarize the blocking findings.",
            ]
        )
    elif stage.id == "merge-deploy":
        lines.extend(
            [
                "- Merge the PR only if review status is acceptable.",
                "- Include a line `Merge: <sha>` after a successful merge.",
                "- If deploy finishes, include a line `Deploy: <url or status>`.",
            ]
        )

    if args.prompt_suffix:
        lines.extend(["", args.prompt_suffix])

    return "\n".join(lines)


def stage_command(
    stage: Stage,
    prompt: str,
    repo_root: Path,
    output_path: Path,
    args: argparse.Namespace,
) -> list[str]:
    if stage.id == "pr-review":
        command = ["codex", "review", "--base", args.base_branch]
        command.append(prompt)
        return command

    command = ["codex", "exec", "-C", str(repo_root), "--color", "never"]
    if args.unsafe:
        command.append("--dangerously-bypass-approvals-and-sandbox")
    else:
        command.append("--full-auto")
    command.extend(["-o", str(output_path), prompt])
    return command


def run_stage(
    stage: Stage,
    prompt: str,
    repo_root: Path,
    output_path: Path,
    args: argparse.Namespace,
) -> tuple[int, str]:
    command = stage_command(stage, prompt, repo_root, output_path, args)
    result = subprocess.run(
        command,
        cwd=repo_root,
        capture_output=True,
        text=True,
    )

    if stage.id == "pr-review":
        output_text = result.stdout
        output_path.write_text(output_text, encoding="utf-8")
    else:
        if output_path.exists():
            output_text = output_path.read_text(encoding="utf-8")
        else:
            output_text = result.stdout

    if result.returncode != 0 and result.stderr:
        output_text = f"{output_text}\n{result.stderr}".strip()
        output_path.write_text(output_text, encoding="utf-8")

    return result.returncode, output_text


def first_match(patterns: list[re.Pattern[str]], text: str) -> str | None:
    for pattern in patterns:
        match = pattern.search(text)
        if match:
            return match.group(0)
    return None


def extract_url(text: str, url_type: str, repo_slug: str) -> str | None:
    patterns = {
        "issue": rf"https://github\.com/{re.escape(repo_slug)}/issues/\d+",
        "pr": rf"https://github\.com/{re.escape(repo_slug)}/pull/\d+",
        "deploy": r"https://[^\s]+",
    }
    match = re.search(patterns[url_type], text)
    return match.group(0) if match else None


def extract_labeled_value(text: str, label: str) -> str | None:
    pattern = re.compile(rf"(?im)^{re.escape(label)}:\s*(\S+)")
    match = pattern.search(text)
    return match.group(1) if match else None


def extract_context_from_state(
    state: dict[str, Any], pipeline_ids: list[str]
) -> tuple[str | None, str | None, str | None]:
    context = state.get("context", {})
    issue_url = context.get("issueUrl") if isinstance(context, dict) else None
    pr_url = context.get("prUrl") if isinstance(context, dict) else None
    deploy_url = context.get("deployUrl") if isinstance(context, dict) else None

    stages = state.get("stages", {})
    if not isinstance(stages, dict):
        return None, None, None

    for stage_id in reversed(pipeline_ids):
        stage_state = stages.get(stage_id, {})
        if not isinstance(stage_state, dict):
            continue
        if not issue_url and isinstance(stage_state.get("issueUrl"), str):
            issue_url = stage_state["issueUrl"]
        if not pr_url and isinstance(stage_state.get("prUrl"), str):
            pr_url = stage_state["prUrl"]
        if not deploy_url and isinstance(stage_state.get("deployUrl"), str):
            deploy_url = stage_state["deployUrl"]

    return issue_url, pr_url, deploy_url


def set_context(
    state: dict[str, Any], issue_url: str | None, pr_url: str | None, deploy_url: str | None
) -> None:
    context = {"updatedAt": utc_now()}
    if issue_url:
        context["issueUrl"] = issue_url
    if pr_url:
        context["prUrl"] = pr_url
    if deploy_url:
        context["deployUrl"] = deploy_url
    state["context"] = context


def reset_stages_from(state: dict[str, Any], pipeline_ids: list[str], from_stage: str) -> None:
    stages = state.setdefault("stages", {})
    if not isinstance(stages, dict):
        state["stages"] = {}
        stages = state["stages"]

    if from_stage in pipeline_ids:
        start_index = pipeline_ids.index(from_stage)
        for stage_id in pipeline_ids[start_index:]:
            stages.pop(stage_id, None)

    total_attempts = 0
    for stage_state in stages.values():
        if isinstance(stage_state, dict) and isinstance(stage_state.get("attempts"), int):
            total_attempts += stage_state["attempts"]
    state["attempts"] = {"total": total_attempts}


def prepare_state(
    state: dict[str, Any],
    pipeline_ids: list[str],
    issue_url: str | None,
    pr_url: str | None,
    from_stage: str,
) -> tuple[dict[str, Any], str | None, str | None, str | None]:
    stored_issue_url, stored_pr_url, _ = extract_context_from_state(state, pipeline_ids)
    if (issue_url and stored_issue_url and issue_url != stored_issue_url) or (
        pr_url and stored_pr_url and pr_url != stored_pr_url
    ):
        state = new_state()

    reset_stages_from(state, pipeline_ids, from_stage)
    stored_issue_url, stored_pr_url, stored_deploy_url = extract_context_from_state(state, pipeline_ids)
    issue_url = issue_url or stored_issue_url
    pr_url = pr_url or stored_pr_url
    deploy_url = stored_deploy_url
    set_context(state, issue_url, pr_url, deploy_url)
    return state, issue_url, pr_url, deploy_url


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return new_state()
    loaded = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(loaded, dict):
        raise ValueError(f"Expected JSON object in {path}")
    loaded.setdefault("stages", {})
    loaded.setdefault("attempts", {"total": 0})
    loaded.setdefault("context", {})
    return loaded


def save_state(path: Path, state: dict[str, Any]) -> None:
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run issue-to-code -> pr-review -> merge-deploy with fail-fast and retry limits.",
    )
    parser.add_argument("--issue-url", help="GitHub issue URL to pass into the pipeline.")
    parser.add_argument("--pr-url", help="Existing PR URL. If omitted, the runner tries to extract it.")
    parser.add_argument(
        "--from-stage",
        choices=["issue-to-code", "pr-review", "merge-deploy"],
        default="issue-to-code",
        help="Stage where execution starts.",
    )
    parser.add_argument(
        "--stop-after-stage",
        choices=["issue-to-code", "pr-review", "merge-deploy"],
        help="Optional stage where execution stops after success.",
    )
    parser.add_argument(
        "--max-stage-attempts",
        type=int,
        default=1,
        help="Maximum attempts per stage before aborting.",
    )
    parser.add_argument(
        "--max-total-attempts",
        type=int,
        default=3,
        help="Maximum attempts across the whole run before aborting.",
    )
    parser.add_argument(
        "--failure-pattern",
        action="append",
        default=[r"(?im)^NG:"],
        help="Regex that marks a stage output as failure. Repeatable.",
    )
    parser.add_argument(
        "--prompt-suffix",
        default="",
        help="Extra instruction appended to every stage prompt.",
    )
    parser.add_argument(
        "--base-branch",
        default="main",
        help="Base branch passed to `codex review`. Defaults to main.",
    )
    parser.add_argument(
        "--state-file",
        default="codex-skills/taskflow-github-delivery/.delivery-run-state.json",
        help="JSON file used to persist attempts and outputs.",
    )
    parser.add_argument(
        "--unsafe",
        action="store_true",
        help="Run `codex exec` with --dangerously-bypass-approvals-and-sandbox instead of --full-auto.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned prompts and commands without executing Codex.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[3]
    skill_dir = Path(__file__).resolve().parents[1]
    pipeline_ids = load_pipeline(skill_dir)
    repo_slug = detect_remote_slug(repo_root)
    state_path = (repo_root / args.state_file).resolve()
    state, issue_url, pr_url, deploy_url = prepare_state(
        load_state(state_path),
        pipeline_ids,
        args.issue_url,
        args.pr_url,
        args.from_stage,
    )

    failure_patterns = [re.compile(pattern) for pattern in args.failure_pattern]

    started = False
    for stage_id in pipeline_ids:
        if not started:
            started = stage_id == args.from_stage
        if not started:
            continue

        stage = load_stage(skill_dir, stage_id)
        attempts = state["stages"].get(stage_id, {}).get("attempts", 0)
        while attempts < args.max_stage_attempts:
            if state["attempts"]["total"] >= args.max_total_attempts:
                save_state(state_path, state)
                sys.stderr.write("Aborting: max total attempts reached.\n")
                return 2

            attempts += 1
            state["attempts"]["total"] += 1
            output_dir = state_path.parent / "run-output"
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = output_dir / f"{slugify(stage_id)}-attempt-{attempts}.txt"
            prompt = build_stage_prompt(stage, args, repo_slug, issue_url, pr_url)

            if args.dry_run:
                print(f"[DRY RUN] stage={stage_id} attempt={attempts}")
                print(prompt)
                break

            returncode, output_text = run_stage(stage, prompt, repo_root, output_path, args)
            stage_state = {
                "attempts": attempts,
                "lastRunAt": utc_now(),
                "returncode": returncode,
                "outputPath": str(output_path),
            }

            failure_match = first_match(failure_patterns, output_text)
            if returncode != 0 or failure_match:
                stage_state["status"] = "failed"
                stage_state["failure"] = failure_match or f"returncode={returncode}"
                state["stages"][stage_id] = stage_state
                set_context(state, issue_url, pr_url, deploy_url)
                save_state(state_path, state)
                if attempts >= args.max_stage_attempts:
                    sys.stderr.write(
                        f"Stopping after {attempts} attempt(s) in {stage_id}: {stage_state['failure']}\n"
                    )
                    return 1
                continue

            extracted_pr_url = extract_labeled_value(output_text, "PR") or extract_url(
                output_text, "pr", repo_slug
            )
            extracted_issue_url = extract_labeled_value(output_text, "Issue") or extract_url(
                output_text, "issue", repo_slug
            )
            extracted_deploy_url = extract_labeled_value(output_text, "Deploy")
            if extracted_issue_url:
                issue_url = extracted_issue_url
            if extracted_pr_url:
                pr_url = extracted_pr_url
            if extracted_deploy_url:
                deploy_url = extracted_deploy_url

            stage_state["status"] = "ok"
            if issue_url:
                stage_state["issueUrl"] = issue_url
            if pr_url:
                stage_state["prUrl"] = pr_url
            if deploy_url:
                stage_state["deployUrl"] = deploy_url
            state["stages"][stage_id] = stage_state
            set_context(state, issue_url, pr_url, deploy_url)
            save_state(state_path, state)
            break

        if args.stop_after_stage == stage_id:
            return 0

    if not args.dry_run:
        summary = {
            "issueUrl": issue_url,
            "prUrl": pr_url,
            "deployUrl": deploy_url,
            "stateFile": str(state_path),
        }
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
