# ProductPilot — Ravugo Consulting LLC workspace

A product research workflow that keeps interview evidence, product decisions, and a reviewed PRD connected.

Live demo: https://ralphugboko.dev/productpilot/

Source repository: https://github.com/ralphug24/productpilot

This is an in-development prototype. Live LLM synthesis is planned; current analysis uses local keyword rules. See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting and update instructions.

## Open the app

Open `index.html` in a modern Chromium browser. The app and transcript readers are local files; no build step, server, API key, CDN, or external account is required.

Start in **Product workflow**:
1. Select interview transcripts and choose **Analyze selected transcripts**.
2. Read source quotes, edit opportunity wording, and select opportunities to compare.
3. Optionally enter RICE estimates; explicitly choose one opportunity and write a rationale.
4. Save the decision, edit the PRD draft, and confirm the review before marking it reviewed.

The Overview, Research library, and Decision log pages display the current workspace state and provide working navigation. The quick guide is optional; each workflow step describes its next action.

## Research sources

The included library is backed by six TXT transcripts and `research/manifest.json`. These are synthetic interviews authored for the portfolio project. Ravugo Consulting LLC is the workspace name. Dataset provenance is explained in Workspace details and Source details. No SharePoint connection, live customer feed, or real customer research is claimed.

`research-data.js` is generated from the actual source files so the app can also work in a local file preview. To update the bundled library after editing transcripts:

```powershell
node prepare-library.mjs
```

Then choose **Refresh library**. It reloads the index, compares document contents and metadata, reports actual changes, and records the time of the check. An unchanged library reports no changes. It does not invent records or synchronization activity.

Use **Open source folder** to read files from a folder you choose. Selecting the folder again rereads its files. Folder imports are a local workflow, not a background connection or SharePoint synchronization.

## Supported inputs

- **TXT:** transcript text, with speaker labels and timestamps when available.
- **DOCX:** text from Word document paragraphs and text runs.
- **PDF:** selectable text with page references; scanned PDFs need OCR before import.
- **Pasted text:** creates a named transcript.
- **CSV:** optional feedback import with a feedback, message, text, comment, response, or review column.

Legacy Word `.doc` must be saved as `.docx`. Import is limited to 30 supported files per selection, 10 MB per file, 100 PDF pages, and 250,000 extracted characters per document. Existing imported documents with the same path are updated; unchanged copies are reported as unchanged.

Uploaded text is processed on the device. Workspace sources, analysis, decisions, and PRDs persist in browser local storage when available. The save indicator switches to session-only storage if persistence fails. For a shared deployment, authentication and server storage will be needed.

## Current analysis and decision behavior

Analysis currently uses keyword rules for onboarding issues: account verification, saved progress, clarity, and profile editing. It is not an LLM and does not establish semantic correctness. Speaker labels help exclude interviewer prompts; unfamiliar transcript structures still require review.

Evidence uses exact source passages, document IDs, timestamps or page/line references, and source modification dates. Opportunities are proposed interpretations. Source counts describe evidence coverage, not population reach or issue frequency.

RICE estimates start incomplete instead of being invented. Scores are computed in code when the inputs are valid. The PM explicitly chooses the opportunity for the PRD; the app does not choose by highest score. Decisions retain a snapshot of their rationale, assumptions, and quoted evidence. Editing a reviewed PRD returns it to draft status. Starting a new review retains source documents and previous decisions.

PRD requirements are topic-specific template proposals, with unresolved baselines and targets clearly identified. They are editable and exportable as a formatted Word document (.docx). The export preserves edits and review status, uses named headings and bulleted requirements, adds page numbers, and moves original source passages into an evidence appendix. Previously saved drafts are supported.

## Next LLM increment

A server-side synthesis endpoint should accept stable source IDs and excerpts, return structured opportunities with cited passages, and validate every citation against the input sources. It can draft PRD wording from a saved product decision. Keep scoring, choosing, approval, and decision history in application logic. Never include provider credentials in browser code.

## Checks and bundled libraries

Run `npm test` for source integrity, changed-input synthesis, RICE validation, topic-specific drafting, unmatched text, CSV quoting, TXT metadata, and Word export checks. Export checks cover real DOCX packaging, preservation of edits and review status, safe XML escaping, source relocation, and older citation formats.

The generated Word fixture was also parsed with python-docx, and all package XML was checked. Visual pagination has not been verified: the document renderer is unavailable in this Windows dependency runtime.

Local parser smoke checks also covered a two-page text PDF, empty-PDF rejection, and DOCX text runs and paragraphs. The DOCX check used a Node XML adapter; it was not a browser UI test. The local-file preview has not been inspected with browser automation because that tool blocks file URLs.

PDF.js and JSZip are bundled with their licenses under `vendor/`. See its README. To regenerate these local readers from an installed dependency bundle, pass its `node_modules` path to `node prepare-vendor.mjs <path>`.


