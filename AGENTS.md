# AGENTS.md

## Project Context

Hall Design Studio is an internal web app for Hall Integrated Systems. It supports visual product layout, product mockups, object placement, grouping, presets, exports, and design workflow for automotive audio and 12V installation hardware concepts.

The primary user is not a professional developer. Prioritize stability, clear behavior, and small reversible changes over clever abstractions.

## Workflow Expectations

Make one contained change at a time.

Do not perform broad rewrites unless explicitly requested.

Before changing code, inspect the existing structure and preserve current behavior unless the task says otherwise.

After changes, run the appropriate verification command and report the result.

If a build, lint, or typecheck fails, fix the failure before declaring the task complete.

## Code Expectations

Preserve the existing React, TypeScript, Vite, and Three.js architecture.

Keep state changes predictable and localized.

Do not introduce new dependencies unless explicitly approved.

Avoid changing public behavior, saved project format, serialization, or export behavior unless the task specifically requires it.

When touching serialization or project files, preserve backward compatibility with existing saved project JSON whenever reasonably possible.

When adding UI controls, keep naming, spacing, and visual style consistent with the current app.

## Safety Rules

Do not delete user project data, presets, saved JSON compatibility, or export paths.

Do not remove existing features while implementing new ones.

Do not rename major concepts, files, state fields, or exported types unless there is a migration plan.

Do not commit secrets, API keys, personal information, private business records, or machine-specific paths.

## Verification

Use the project’s existing package manager and scripts.

Prefer this order when applicable:

1. install dependencies only if needed,
2. run typecheck or lint if available,
3. run build,
4. summarize changed files,
5. describe how to manually test the feature.

## Communication Style

Be direct and specific.

When complete, report:
- what changed,
- what files changed,
- what command was run,
- whether it passed,
- any remaining risks or manual test steps.