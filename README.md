# MICA Technologies — micainc.github.io

Landing page for MICA Technologies Inc., served at [mica.technology](https://mica.technology).

## Stack

- **Vite** — build tool and dev server
- **Vanilla JS** — no framework
- **GitHub Pages** — hosting via GitHub Actions

## Local Development

```bash
npm install
npm run dev
```

Opens a dev server at `http://localhost:5173`.

## Deploying

Deployment is automatic. Push to `main` and the GitHub Actions workflow (`.github/workflows/deploy.yml`) will:

1. Install dependencies (`npm ci`)
2. Build the site (`npm run build` → outputs to `dist/`)
3. Deploy `dist/` to GitHub Pages

```bash
git add <files>
git commit -m "description of changes"
git push origin main
```

The deploy typically completes in under a minute. Check status at:
https://github.com/micainc/micainc.github.io/actions

## GitHub Pages Configuration

- **Source:** GitHub Actions (not "deploy from branch")
- **Custom domain:** `mica.technology` (configured via `public/CNAME`)
- **HTTPS:** enforced

If Pages reverts to legacy mode (serves raw source instead of built output), switch it back:

```bash
gh api repos/micainc/micainc.github.io/pages -X PUT -f build_type=workflow
```

## Project Structure

```
index.html          — main HTML
index.css           — styles
index.js            — scroll animations, card graphics, nav behavior
segmentation.js     — hero interactive segmentation overlay + grain detection
src/                — JS data modules (segmentation map, label colours)
public/             — static assets (images, fonts, CNAME)
vite.config.js      — Vite configuration
.github/workflows/  — CI/CD pipeline
```
