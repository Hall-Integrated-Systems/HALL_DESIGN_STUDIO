# Hall Product Studio Codex Rules

## Active repo

Use only this active repository:

D:\DEV\STUDIO

Do not use or modify the old OneDrive repository:

C:\Users\Tango\OneDrive - HALL INTEGRATED SYTEMS\HALL_DESIGN_STSUDIO

## Required checks before editing

Before making changes, run:

cd /d D:\DEV\STUDIO
git status
npx.cmd tsc -b
npm.cmd run build

## Commit / push rules

Do not commit or push unless explicitly instructed.

After any task, report:
- changed files
- verification results
- known limitations
- whether commit/push was performed

## Development rules

- Keep desktop layout intact.
- Keep mobile layout intact.
- Keep PNG export behavior intact.
- Keep browser save/load behavior intact.
- Keep JSON import/export behavior intact.
- Avoid unnecessary dependencies.
- Do not add backend, authentication, cloud storage, CAD kernels, STL editing, slicing, or geometry boolean operations unless explicitly requested.

## Current project state

Live site:

https://studio.hallintegratedsystems.com

Current active working folder:

D:\DEV\STUDIO

The old OneDrive folder is reference-only and must not be edited.

Latest known stable version:
v2.7.1

Recent features:
- real Hall H logo
- L Bracket asset
- mobile responsive shell
- mobile overlay/drawer fixes
- Hide buttons on top panels
- fixed desktop transform toolbar
- snapping/alignment tools
- save-state clarity
- panel-selected movement and axis locks

Next planned feature:
v2.8.0 core grouping / linked assemblies.
