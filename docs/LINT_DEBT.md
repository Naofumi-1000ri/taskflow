# Lint Status

This document records the current repository-wide lint status and the rules for keeping it green.

## Current Baseline

As of 2026-03-12:

- `npm run test:run` passes
- `npm run lint` passes
- repository-wide lint output: 0 errors, 0 warnings

## What Changed

The cleanup work that previously lived in this file has been completed:

- React `set-state-in-effect` violations were removed
- hook dependency warnings were resolved
- `no-unused-vars` warnings were cleaned up
- `next/image` migrations were applied where practical
- remaining blob preview cases were documented with targeted lint exceptions

## Maintenance Rules

Lint is now part of CI and should stay green on every PR.

- run `npm run lint` before opening a PR
- do not merge code that introduces new lint warnings
- when a rule needs an exception, scope it to the exact line and explain why
- avoid broad `eslint-disable` comments at file level

## When To Open A Dedicated Cleanup Issue

Use a separate tech-debt Issue when:

- a cleanup touches many unrelated files
- a framework migration changes behavior risk, such as image handling or hook semantics
- fixing a warning requires product or design decisions

Keep small local lint fixes in the product PR when they are tightly related to the same code path.

## Allowed Exceptions

Some UI flows intentionally use raw `<img>` because they render `blob:` URLs for local previews before upload.

Rule for these cases:

- keep the raw `<img>` limited to the preview surface
- add a single-line `eslint-disable-next-line @next/next/no-img-element`
- do not reuse that exception for remote or persisted images

Build tooling runs through `scripts/run-next-build.mjs` to suppress a known upstream `baseline-browser-mapping` false-positive warning without hiding real build failures.

## Required Checks

The expected GitHub checks for `main` are:

- `taskflow-ci / audit`
- `taskflow-ci / lint`
- `taskflow-ci / test`
- `taskflow-ci / build`
