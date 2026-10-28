# Deployment

Hall Product Studio is a static React/Vite application. It does not require a backend, authentication service, cloud storage service, API, or desktop packaging.

## Local Development

Install dependencies:

```bash
npm install
```

Start the local Vite development server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Production Build

Create a production build:

```bash
npm run build
```

The build output is written to `dist/`.

To inspect the production build locally:

```bash
npm run preview
```

## GitHub Actions

The repository includes an Azure Static Web Apps workflow:

```text
.github/workflows/azure-static-web-apps-lemon-ocean-0c5e3900f.yml
```

The automatic deployment path:

- runs on pushes and pull requests targeting `main`
- uses Node 22
- installs dependencies with `npm install`
- builds with `npm run build`
- uploads the prebuilt `dist/` folder with `skip_app_build: true`

Draft status does not disable this path. Eligible pull-request events can upload an Azure preview; a push to `main` can publish production. Closing a pull request invokes Azure preview cleanup. Do not merge, deploy, or rerun an older deployment job without owner approval.

### Manual validation without deployment

The same workflow also has a separate `workflow_dispatch` job named **Validate only (no deployment)**. Both Azure jobs require a `push` or `pull_request` event and are excluded from manual dispatch. The validation job has only `contents: read`, does not persist checkout credentials, references no Azure action or deployment secret, and checks out the immutable event SHA. Before dependency installation, a required `expected_sha` input must match both that SHA and the checked-out revision; a moved branch or incorrect input fails the run.

The job uses Node 22, installs the root lockfile with `npm ci`, runs the Lab tests, builds the Lab (including typecheck), and builds the integrated Studio. It does not publish build output or create an Azure preview. A passing run establishes installation/test/build results for its recorded commit, not browser behavior, Azure authentication/configuration, native Fusion/QIDI acceptance, or physical measurement accuracy.

Keep `[skip ci]` on every PR commit until deployment is authorized. GitHub applies that marker to `push` and `pull_request` workflows; it does not suppress `workflow_dispatch`. Required automatic checks can therefore remain pending. Marking this PR ready does not run this workflow, whose configured PR activity types omit `ready_for_review`.

The workflow path already exists on `main` and has run previously. GitHub documents dispatching an already-run workflow against another branch through the API or CLI. Because `main` does not yet include the manual trigger, its web UI may not show a Run workflow button. After checking the current PR head and its workflow contents, use an authenticated GitHub CLI with Actions write permission:

```sh
studio_pr_sha="$(gh pr view 2 --repo Hall-Integrated-Systems/HALL_DESIGN_STUDIO --json headRefOid --jq .headRefOid)"
gh workflow run azure-static-web-apps-lemon-ocean-0c5e3900f.yml --repo Hall-Integrated-Systems/HALL_DESIGN_STUDIO --ref fix/photo-measurement-reliability -f expected_sha="$studio_pr_sha"
```

Inspect the resulting run: its event must be `workflow_dispatch`, its head SHA must match the intended revision, **Validate only (no deployment)** must pass, and both Azure jobs must be skipped. The run tests the branch head, rather than GitHub's synthetic PR merge commit; repeat against an updated branch if `main` moves. If dispatch is unavailable, stop and retain the skip marker. Removing it, reopening the PR, or rerunning an earlier Azure job is not a substitute. Repository or organization restrictions may prevent dispatch; the first successful run is still needed to confirm this route on GitHub.

This change preserves the existing automatic production and PR deployment paths. Merge/deployment approval must include a release plan: do not assume the head commit's skip marker survives a merge or squash commit, and account for the PR-close cleanup job. A permanent owner-approval gate for Azure publication is separate follow-up configuration.

References: [GitHub dispatch events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch), [manual workflow execution](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), and [skip instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).

The deployment token is expected in this GitHub secret:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_OCEAN_0C5E3900F
```

## Azure Static Web Apps

Azure Static Web Apps serves the built `dist/` folder. There is no API location for this app.

Current workflow settings:

```yaml
app_location: "dist"
api_location: ""
output_location: ""
skip_app_build: true
```

Because the app is prebuilt before upload, Azure receives static output only.

## Custom Domain

The intended public production domain is:

```text
https://studio.hallintegratedsystems.com
```

Domain binding and DNS records are managed in Azure Static Web Apps and the DNS provider for `hallintegratedsystems.com`. Confirm the domain resolves to the active Azure Static Web Apps instance after deployment.

## Static Web App Config

The active Azure Static Web Apps config should live in:

```text
public/staticwebapp.config.json
```

Vite copies files from `public/` into `dist/` during build, so this placement ensures Azure receives:

```text
dist/staticwebapp.config.json
```

The config currently provides:

- SPA navigation fallback to `/index.html`
- asset fallback exclusions
- MIME types for `.glb`, `.gltf`, `.bin`, and `.webp`

There is also a root-level `STATICWEBAPP.CONFIG.JSON` copy in the repository. For Vite/Azure deployment, keep the authoritative deploy config in `public/staticwebapp.config.json`.
