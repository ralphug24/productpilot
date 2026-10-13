# ProductPilot deployment

Source repository: https://github.com/ralphug24/productpilot

Portfolio entry: https://ralphugboko.dev/projects

Public demo: https://ralphugboko.dev/productpilot/

## Hosting

GitHub Pages publishes the generated `docs/` directory from this repository's `main` branch. The portfolio's Vercel configuration forwards `/productpilot/` and its asset paths to `https://ralphug24.github.io/productpilot/`. The ProductPilot repository is the source for app changes; the portfolio repository owns only the project case study and URL rewrites.

## Publishing updates

From this directory:

```powershell
npm test
npm run build
git add .
git commit -m "Describe the ProductPilot update"
git push origin main
```

The build regenerates the research index and copies an explicit list of runtime files plus the synthetic research library and licensed browser readers into `docs/`. Local transcripts imported by visitors remain in their browsers; they are never copied into the repository or deployment. Internal preview files, tests, authoring scripts, credentials, and local dependencies are excluded from the deployed directory.

Wait for the GitHub Pages deployment to complete before checking the public demo. Portfolio descriptions or route changes require a separate commit in `portfolio-website`.

## Current release

This is an in-development portfolio prototype using synthetic research, local keyword grouping, browser storage, and template PRDs. A live LLM and SharePoint connector are not implemented. Transcript text is processed locally; no backend collects visitor documents. Decisions and drafts are isolated by the visitor's browser storage and origin. The app is not an authenticated enterprise service.
