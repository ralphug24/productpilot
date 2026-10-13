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

The static app includes local visitor profiles, separate projects, a persistent opportunity backlog, RICE guidance and calculations, reviewed Word PRDs, and project/profile/browser-specific totals. The visual design uses sidebar navigation, white panels, graphite text and controls, copper accents, sans-serif typography, and an abstract path mark. Testing guide and Give feedback are prominent in the persistent top header. Overview presents a next action, current-review stages, compact project totals, review queues, and recent activity. Branding is Elevate Consulting. Live AI uses Cloudflare Workers AI; explicit local rules and starter drafts are available. There is no SharePoint connector or authenticated company-wide workspace. Text extraction runs locally; excerpts are transmitted only for selected AI operations. Visitor display names are not sent as account identity to the AI service. Project records remain in browser storage.

## Cloudflare Workers AI

API service: https://productpilot-api.ralphugboko.workers.dev/api/productpilot

`wrangler.jsonc` declares the `AI` binding and the dedicated `productpilot-ai-usage` D1 database. It contains resource IDs, not credentials. The database has only usage/rate counters, not transcripts, project contents, or generated drafts. `ai-schema.sql` initializes its tables; the daily cron expires old counters. Existing deployments do not need to rerun initialization when changing UI files.

To publish backend changes from this repository, authorize Wrangler for account/user read, Workers and Worker scripts write, D1 write, and Workers AI write, then run:

```powershell
npx wrangler deploy
```

Each analysis or draft request makes one Llama 3.3 call. Output shape and cited excerpt IDs are checked before the app receives the result. The service reserves a conservative budget before inference, adjusts it only when token usage is provided, and keeps reservations when failed usage is unknown. ProductPilot’s 3,500-neuron daily ceiling resets at 00:00 UTC. Cloudflare’s shared account allowance remains authoritative; AgentOps Studio uses the same account. No paid fallback or plan upgrade is configured.

The frontend contacts this API directly through allowed-origin CORS; no portfolio rewrite change is required. Status checks do not invoke the model. Source files, Wrangler configuration, and usage schema are excluded from Pages assets.
