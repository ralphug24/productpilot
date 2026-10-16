# ProductPilot — Elevate Consulting workspace

A product research workflow that keeps interview evidence, product decisions, and a reviewed PRD connected.

Live demo: https://ralphugboko.dev/productpilot/

Source repository: https://github.com/ralphug24/productpilot

WordRush researcher kit: https://ralphugboko.dev/productpilot/research-kit.html

## WordRush group study

The researcher kit has three views: **Before the session**, **During play**, and **Wrap up together**. One participant hosts and shares their screen; the other two join on their devices. The researcher observes. The study asks whether the group can complete the agreed tasks without researcher product guidance. The visible default plan has three tasks: (1) create and join a room; (2a) play a chosen Word Search game on Medium and (2b) a different one on Hard; (3a) play a chosen Scramble Rush game on Medium and (3b) a different one on Hard. This is room setup plus four games. The researcher can set a custom prompt before the session. Peer help is logged separately as part of the group experience.

Before the session, record anonymous codes and confirm what the actual consent forms allow for participation, notes, and Zoom recording/transcription. Optional form links and background fields stay collapsed. Form responses remain with their provider; the kit has no forms integration. At the end, keep everyone in one focus-group discussion, invite each person in turn, then send the post-study form. The kit does not impose private interviews or a waiting-room workflow. Form prompts, competitor notes, AI/export permissions, ProductPilot handoff, and comparison guidance are in collapsed appendix sections.

The kit includes live Microsoft Forms response links: [Consent & pre-study](https://forms.cloud.microsoft/r/EE28D6hUzT) and [Post-study feedback](https://forms.cloud.microsoft/r/M5e82FHNWR). Each view offers Open and Copy participant link controls. The pre-study form combines study information, separate participation/recording/AI/measurement/public-quote choices, matching codes, and brief background questions. Participation or recording refusal branches to the end before background collection; optional-use refusals do not end participation. The post-study form asks for matching codes, whole-task ease from 1–7, who helped, confusion, positives, a desired improvement, and interest in playing again. Responses are collected in the owner's Microsoft Forms account, not in the kit. No participant names or emails are requested, although the recorded group session itself is identifiable.

Consent structure was adapted from [Clemson's adult consent guide](https://media.clemson.edu/research/orc/irb/forms/exempt-adult-consent.doc), using the owner's specified contact `ralphugboko@gmail.com` and session length under 20 minutes. The guide is a reference, not an institutional approval. Form choices are reviewed manually by the researcher before recording or processing a group transcript. The kit does not access response data or send participant invitations.

During play, one click marks Confusion, Researcher help, Peer help, Bug/error, Worked well, or Bookmark. A text detail is optional. A visible task selector shows the participant prompt and tags subsequent notes with Task 1, 2a, 2b, 3a, or 3b. Selection never asserts task completion. Task labels survive edits, drafts, backups/imports, and evidence exports. The researcher can align a recording-reference clock with Zoom, pause/resume it, or override a note timestamp. The clock does not control Zoom and is not task-completion timing. Untimed events remain untimed. Edits preserve timestamps; bare markers are reminders for later review, not synthesized findings. The clock pauses when the session is marked finished. Detailed speaker, phase, and note-type options are collapsed. No participant findings are bundled with the kit.

Records, event markers, clock state, and unfinished note drafts autosave under `wordrush-study-kit-v3`. On first use, the kit reads the previous `wordrush-group-research-v2` collection when no new collection exists, retaining the old key. Version 3 backups include the new event/clock fields; version 1 and 2 backups remain readable. **Save backup** downloads all records as JSON; **Load backup** restores them without replacing differing existing records. There is no account or automatic synchronization. Clearing browser storage can remove notes, so keep backups in a location you control. Another person using the same browser profile can access its records. The public repository contains the tool, not notes entered by visitors.

Earlier individual records remain read-only. All earlier group fields and permissions are retained, including fields no longer presented as active inputs. Original first-round outcomes are shown under preserved protocol fields in the appendix and are not converted into full-task completion or researcher-guidance answers. Changed versions are retained as additional copies; check counts manually before reporting a sample.

Evidence exports are separate TXT files for exact quotes and event observations. They require a finished session, codes/date, deidentification review, and the relevant participation and AI permissions recorded from consent forms. Group notes require permission from all three. Existing individual permissions are preserved and can authorize their original scope; new whole-group checks are never assumed. Bare event markers, interpretations, and note drafts stay in backups. Public quote use needs separate agreement. Upload the reviewed transcript and observation files to ProductPilot manually. Zoom speaker labels must be checked and anonymized. Raw VTT input is not supported; save reviewed text as TXT or DOCX. ProductPilot recognizes participant codes such as P01 and Participant P01, retains short labelled turns, and excludes Moderator/Researcher/Facilitator prompts from evidence selection.

**Export session measurements JSON** downloads schema `wordrush-moderated-group-measurements` version 3. New standard sessions use protocol `wordrush-three-tasks-v1` with the five task steps included. Existing sessions retain their original single-game prompt/protocol; custom prompts are marked as custom. Nothing converts an earlier outcome into completion of the new three-task plan. The export captures the agreed task, full-task completion, researcher guidance, and coded group/player metadata. Unassisted completion is true only for a completed task with confirmed absence of researcher guidance; unknown outcomes stay null. Event-marker counts are labelled as researcher flags requiring review. The recording clock is never exported as a task duration. Form responses, transcripts, quotes, and free-text notes are excluded. Measurement use requires recorded agreement for all three. The earlier first-round protocol remains distinct in backups.

Measurements are for manual descriptive comparison and a future Decision Lab integration. Decision Lab currently runs simulated experiments with individual-user or fixed-group randomization and binary completion or capped timing outcomes. It cannot import these packets or real survey ratings. Real-data ingestion remains separate work. Do not turn three players in a group into three independent experimental observations, combine moderated sessions with ordinary usage, or claim causal uplift from a small before/after study. WordRush automatic event tracking and a private event database are also separate future work.

This is an in-development portfolio project. Cloudflare Workers AI provides live research synthesis and PRD drafting; explicit local onboarding rules and editable starter drafts are also available. See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting and update instructions.

## Open the app

Open the public demo for live AI, or `index.html` in a modern Chromium browser for local rules, research reading, project management, and document exports. Live AI is available only from the allowed public website origins. No API key is exposed in browser code.

Start in **Product workflow**:
1. Select interview transcripts and choose **Analyze selected transcripts**.
2. Read source quotes, edit opportunity wording, and select opportunities to compare.
3. Optionally enter RICE estimates for each opportunity; explicitly choose one to draft requirements and write a rationale.
4. Save the decision, edit the PRD draft, and confirm the review before marking it reviewed.

The Overview, Research library, Opportunity backlog, and Decision log display the current project state. The interface uses a white, blue, cyan, mango, and orange palette with sans-serif typography and sidebar navigation. **Testing guide** and **Give feedback** stay together in the top header across all workspace views. Create and switch projects from the sidebar, or the project controls above the content on mobile. New projects have empty research libraries. Each project has its own research, opportunities, decisions, and drafts.

Overview starts with a state-aware next action and the latest priority or project objective. The four-stage current-review strip links to available workflow steps; unavailable steps explain their prerequisite. Compact project totals link to the relevant library or log, with expandable counting explanations. Review queues and recent activity reflect saved records in the current visitor profile.

Overview counts are specific to the selected project and browser. Opportunities count the persistent backlog, including deferred and rejected records. Counts change on additions, saved decisions, and review actions; editing a reviewed PRD returns it to draft status. These are not company-wide or cross-device totals.

Visitors are prompted for a preferred display name on first use; they can explore as a guest. The profile menu changes the display name or starts a separate visitor workspace. Current identity is stored in `productpilot-visitor-v1`; project roots are partitioned by an unguessable local profile ID under `productpilot-projects-v4-{visitorId}`. A name is not a password or authenticated identity. Another visitor profile starts with only the bundled onboarding research and does not receive the previous profile’s projects, imports, decisions, or activity.

Existing `productpilot-workspace-v2` and `productpilot-projects-v3` records migrate once into the first local visitor profile. Old keys are retained; the migration marker prevents the old workspace being copied to later visitors. Existing decision records without captured authors show “Previous visitor (name not recorded)” instead of attributing them to the current tester. Future decisions capture owner ID/name, activity captures the acting visitor, and Word exports use the recorded owner and reviewer. Changing a display name does not rewrite historical authorship.

Local profiles are convenience separation, not enterprise access control. Anyone with access to the browser and its storage can inspect local records. An enterprise version should use server-authenticated accounts, project membership, shared research and approved decisions, private personal drafts, and a permission-checked audit trail. Company-wide history should never be available to every user by default.

A new review or source change resets the current analysis and working selection without deleting backlog records or decision snapshots.

## Research sources

The included library is backed by six TXT transcripts and `research/manifest.json`. These are synthetic interviews authored for the portfolio project. Elevate Consulting is the workspace name. Dataset provenance is explained in Workspace details and Source details. No SharePoint connection, live customer feed, or real customer research is claimed.

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

Text extraction runs on the device. Projects, sources, opportunities, decisions, and PRDs persist in browser local storage when available. The save indicator and Overview explanation switch to session-only storage if persistence fails. Selecting AI and running analysis sends extracted passages and the objective to Cloudflare Workers AI; AI drafting sends the chosen evidence, rationale, and objective. No research is collected by a company-wide workspace database. A shared authenticated service and cross-device synchronization are not implemented.

## Current analysis and decision behavior

AI synthesis uses Llama 3.3 through Cloudflare's server-side AI binding. It receives stable excerpt IDs and returns proposed opportunities citing those IDs. The server validates the response structure and that every opportunity references supplied evidence, then attaches original source text itself. These checks establish citation provenance, not semantic accuracy. The prompt treats research content as untrusted data and requires uncertainty and assumptions to be identified.

The explicitly selected local rules method groups four onboarding topics: account verification, saved progress, clarity, and profile editing. It is not an LLM. Speaker labels help exclude interviewer prompts; unfamiliar transcript structures still require review. Human-authored opportunities can also be added in the backlog by selecting an exact source passage.

Evidence uses exact source passages, document IDs, timestamps or page/line references, and source modification dates. Opportunities are proposed interpretations. Source counts describe evidence coverage, not population reach or issue frequency.

RICE estimates start incomplete instead of being invented. Reach is a nonnegative whole number of users/quarter; impact is an integer from 1–3; confidence is an integer from 1–100%; effort is positive person-weeks in 0.1 steps. Reach and effort have no upper cap. Score = reach × impact × (confidence / 100) / effort. Four-decimal display precision and scientific notation for very small values prevent nonzero scores from displaying as zero. The UI shows each calculation and optionally orders opportunities by score. The PM chooses the opportunity and records a rationale, including an explanation when an estimated alternative scores higher.

Opportunities have persistent Needs review, Prioritized, Deferred, or Rejected statuses with rationale/revisit notes. Starting a review and selecting one opportunity preserve the other backlog records. Saved decisions contain evidence, estimate, and rationale snapshots.

PRD means Product Requirements Document. AI drafting prepares proposed solutions, requirements/user stories, acceptance criteria, metrics, and scope/questions from the saved choice and source evidence. Baselines and targets must remain unresolved until measured. Section citation IDs are validated, and assumptions are included in scope. The local starter assembles the opportunity's proposed sections for editing. Both paths require human review. DOCX exports preserve edits, project name, review status, headings, bullets, page numbers, and a source appendix. Previously saved drafts remain supported.

## AI service

`ai-worker.mjs` implements status, analysis, and drafting endpoints. Cloudflare D1 stores only anonymous rate counters and conservative daily inference reservations. The project has a 3,500-neuron daily reservation ceiling; the account-wide Cloudflare free allowance is shared with AgentOps Studio and remains authoritative. Each operation makes one bounded call with no automatic retry or paid-provider fallback. Request bodies and provider payloads have explicit size limits. Oversized research is rejected, never silently truncated. No transcript or draft is stored in the usage database, and Worker observability logging is disabled.

Browser calls use allowed-origin CORS, a per-browser anonymous throttle, and the durable daily reservation ceiling. Origin filtering and a browser ID are not authentication. Production tenancy, access control, semantic evaluation, and human research validation remain future work.

## Checks and bundled libraries

Run `npm test` for source integrity, changed-input synthesis, RICE validation, topic-specific drafting, unmatched text, CSV quoting, TXT metadata, and Word export checks. Export checks cover real DOCX packaging, preservation of edits and review status, safe XML escaping, source relocation, and older citation formats.

The generated Word fixture was also parsed with python-docx, and all package XML was checked. Visual pagination has not been verified: the document renderer is unavailable in this Windows dependency runtime.

Local parser smoke checks also covered a two-page text PDF, empty-PDF rejection, and DOCX text runs and paragraphs. The DOCX check used a Node XML adapter; it was not a browser UI test. The local-file preview has not been inspected with browser automation because that tool blocks file URLs.

PDF.js and JSZip are bundled with their licenses under `vendor/`. See its README. To regenerate these local readers from an installed dependency bundle, pass its `node_modules` path to `node prepare-vendor.mjs <path>`.


