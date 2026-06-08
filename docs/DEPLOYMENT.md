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

The workflow:

- runs on pushes and pull requests targeting `main`
- uses Node 22
- installs dependencies with `npm install`
- builds with `npm run build`
- uploads the prebuilt `dist/` folder with `skip_app_build: true`

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
