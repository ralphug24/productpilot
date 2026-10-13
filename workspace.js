(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = () => new Date().toISOString();
  const date = value => new Date(value).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  let visitor;
  try { visitor = PilotVisitor.load(localStorage); }
  catch { visitor = PilotVisitor.fresh(); }
  let workspace;
  try { workspace = PilotProjects.load(localStorage, PilotResearch.documents, visitor.id); }
  catch { workspace = PilotProjects.load({ getItem: () => null }, PilotResearch.documents, visitor.id); }
  let state = workspace.projects.find(project => project.id === workspace.activeProjectId);
  // Update bundled document branding in an already-saved workspace.
  // Uploaded documents and historical decisions retain their original content.
  function updateBundledBranding() {
    for (const project of workspace.projects) for (const doc of project.documents) {
      if (doc.origin === 'Bundled research library') doc.text = doc.text.replace(/^(?:Ravugo Consulting LLC|Ravugo) Research/, 'Elevate Consulting Research');
      if (doc.owner === 'Added by Ralph Ugboko') doc.owner = 'Added on this browser (name not recorded)';
    }
  }
  updateBundledBranding();
  let route = 'workflow', busy = false;
  let visitorAction = 'welcome';
  function renderVisitor() {
    $('#visitor-display-name').textContent = visitor.name;
    $('#visitor-avatar').textContent = PilotVisitor.initials(visitor.name);
    $('#visitor-profile').setAttribute('aria-label', `${visitor.name}: visitor profile`);
  }
  function saveVisitor() { try { PilotVisitor.save(localStorage,visitor); } catch { /* local workspace save indicator covers unavailable storage */ } }
  function showVisitorPrompt(action) {
    if (busy) { toast('Finish the current operation before changing visitors.'); return; }
    visitorAction = action;
    $('#visitor-title').textContent = action === 'switch' ? 'Start a visitor workspace' : action === 'rename' ? 'Your display name' : 'Welcome to ProductPilot';
    $('#visitor-description').textContent = action === 'switch' ? 'Enter the next visitor’s name. They will start with a separate local workspace; your existing records are retained on this device.' : action === 'rename' ? 'Update your display name for future decisions and documents. Previously saved records keep the author name recorded at the time.' : 'What should we call you? Your name appears on your decisions and requirements documents.';
    $('#visitor-name').value = action === 'rename' ? visitor.name : '';
    $('#visitor-guest').hidden = action === 'rename';
    $('#visitor-save').textContent = action === 'rename' ? 'Save display name' : 'Enter workspace →';
    $('#visitor-dialog').showModal();
  }
  function acceptVisitor(name) {
    if (busy) return;
    const cleaned = PilotVisitor.clean(name); if (!cleaned) { $('#visitor-name').focus(); return; }
    if (visitorAction === 'switch') {
      if (!save()) { toast('Browser storage is unavailable. Keep this visitor workspace open so your current session is not lost.'); return; }
      visitor = PilotVisitor.fresh(cleaned); saveVisitor();
      try { workspace = PilotProjects.load(localStorage, PilotResearch.documents, visitor.id, false); }
      catch { workspace = PilotProjects.load({getItem:()=>null},PilotResearch.documents,visitor.id,false); }
      state = workspace.projects.find(project => project.id === workspace.activeProjectId); updateBundledBranding();
      $('#paste-form').reset(); $('#backlog-filter').value = 'all'; $('#sort-rice').checked = false;
    } else { visitor.name = cleaned; visitor.introduced = true; saveVisitor(); }
    renderVisitor(); $('#visitor-dialog').close(); navigate(); save(); toast(`Welcome, ${visitor.name}.`);
  }
  function showVisitorSettings() {
    if (busy) return;
    openDialog('Your visitor workspace', `<p>You are using ProductPilot as <b>${esc(visitor.name)}</b>.</p><p>This profile’s research, opportunities, decisions, and PRDs stay in this browser. Switch visitor to start a separate workspace for another tester.</p><div class="guide-actions"><button class="primary-btn" id="edit-visitor-name">Change my display name</button><button class="quiet-btn" id="switch-visitor">Switch visitor →</button></div><div class="detail-note visitor-history-note"><b>How would a team use this?</b><p>An enterprise version should use authenticated accounts and project membership. Team members can share project research and approved decisions; personal drafts can stay private. This local profile is not access control: someone with access to this browser can inspect its stored data.</p></div>`);
    $('#edit-visitor-name').onclick = () => { $('#detail-dialog').close(); showVisitorPrompt('rename'); };
    $('#switch-visitor').onclick = () => { $('#detail-dialog').close(); showVisitorPrompt('switch'); };
  }

  function toast(message) {
    $('#toast').textContent = message; $('#toast').classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 4000);
  }
  function save() {
    const note = $('.project-scope-note');
    try {
      PilotProjects.persist(localStorage, workspace); $('#save-state').innerHTML = '<span></span> Saved in this browser';
      note.querySelector('b').textContent = 'Your visitor workspace · current project';
      note.querySelector('p').textContent = 'These totals belong to the current visitor profile and selected project in this browser. They are not shared company-wide totals. Use your profile menu to switch visitors.';
      return true;
    } catch {
      $('#save-state').textContent = 'Session only · storage unavailable';
      note.querySelector('b').textContent = 'Your visitor workspace · session only';
      note.querySelector('p').textContent = 'Browser storage is unavailable or full. These project totals reflect this session; recent changes may be lost when you close the page. They are not shared company-wide totals.';
      return false;
    }
  }
  function log(message) { state.activity.unshift({ message, at: now(), actorId: visitor.id, actorName: visitor.name }); state.activity = state.activity.slice(0, 30); }
  function invalidate() { state.analysis = null; state.comparison = []; state.chosen = null; state.rationale = ''; state.draft = null; state.step = 1; }
  const selectedDocs = () => state.documents.filter(doc => state.included.includes(doc.id));
  const candidates = () => state.analysis?.opportunities.filter(o => state.comparison.includes(o.id)) || [];
  const chosen = () => candidates().find(o => o.id === state.chosen);
  const ready = step => step === 1 || (step === 2 && !!state.analysis) || (step === 3 && candidates().length > 0) || (step === 4 && !!state.draft);
  const statuses = { needs_review: 'Needs review', prioritized: 'Prioritized', deferred: 'Deferred', rejected: 'Rejected' };
  const pendingCount = () => state.decisions.filter(d => !d.reviewedAt).length;
  function updateProjectControls() {
    const options = workspace.projects.map(project => `<option value="${esc(project.id)}" ${project.id === state.id ? 'selected' : ''}>${esc(project.name)}</option>`).join('');
    $('#project-picker').innerHTML = options; $('#mobile-project-picker').innerHTML = options;
    $('#breadcrumb-project').textContent = state.name; $('#project-eyebrow').textContent = state.name.toUpperCase();
    $('#source-name').textContent = `${state.name} · Research`;
    $('#source-path').textContent = state.focus === 'onboarding' ? 'Product / Onboarding / Interviews' : 'Project research / Your transcripts';
    $('#refresh-library').hidden = state.focus !== 'onboarding';
  }
  function switchProject(id) {
    if (busy) { toast('Finish the current operation before switching projects.'); updateProjectControls(); return; }
    const next = workspace.projects.find(project => project.id === id); if (!next) return;
    state.pasteDraft = { title: $('#transcript-title').value, text: $('#transcript-text').value };
    save(); state = next; workspace.activeProjectId = id;
    $('#transcript-title').value = state.pasteDraft?.title || ''; $('#transcript-text').value = state.pasteDraft?.text || '';
    $('#sort-rice').checked = false; $('#backlog-filter').value = 'all';
    navigate(); save(); toast(`Opened ${state.name}.`);
  }
  function updateSteps() {
    $$('.progress-step').forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = !ready(step); button.classList.toggle('current', step === state.step);
      const completed = { 1: !!state.analysis, 2: !!state.chosen || !!state.draft, 3: !!state.draft, 4: !!state.draft?.reviewedAt };
      button.classList.toggle('done', completed[step]);
      const status = { 1: `${selectedDocs().length} transcripts selected`, 2: state.analysis ? `${state.analysis.opportunities.length} opportunities found` : 'Analyze transcripts first', 3: state.draft ? 'Decision saved' : candidates().length ? 'Choose an opportunity' : 'Review opportunities first', 4: state.draft?.reviewedAt ? 'PRD reviewed' : state.draft ? 'Ready to review' : 'Save a decision first' };
      button.querySelector('small').textContent = status[step];
      if (step === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.title = ready(step) ? `Open step ${step}` : ['','', 'Analyze selected transcripts first', 'Select opportunities to compare first', 'Save a product decision first'][step];
    });
  }

  function renderDocuments(container, selectable) {
    const previous = container.querySelector('.document-search')?.value || '';
    container.innerHTML = `<div class="document-filters"><label>Search documents<input class="document-search" type="search" placeholder="Search name or transcript text" value="${esc(previous)}"></label><span>${state.documents.length} documents in this workspace</span></div><div class="document-table-wrap"><table class="document-table"><thead><tr>${selectable ? '<th class="check-col"><input type="checkbox" data-all aria-label="Include all documents"></th>' : ''}<th>Document</th><th>Source</th><th>Modified</th><th>Action</th></tr></thead><tbody></tbody></table></div>`;
    const fill = () => {
      const query = container.querySelector('.document-search').value.trim().toLowerCase();
      const docs = state.documents.filter(doc => `${doc.title} ${doc.file} ${doc.text}`.toLowerCase().includes(query));
      container.querySelector('tbody').innerHTML = docs.map(doc => `<tr class="${state.included.includes(doc.id) && selectable ? 'included' : ''}">${selectable ? `<td class="check-col"><input type="checkbox" data-include="${esc(doc.id)}" aria-label="Include ${esc(doc.title)}" ${state.included.includes(doc.id) ? 'checked' : ''}></td>` : ''}<td><div class="document-name"><span class="file-type">${esc(doc.format)}</span><div><button class="document-link" data-doc="${esc(doc.id)}">${esc(doc.title)}</button><small>${esc(doc.id.startsWith('INT-') ? doc.id : doc.file)} · ${doc.text.split(/\s+/).filter(Boolean).length.toLocaleString()} words</small></div></div></td><td><span class="source-origin">${esc(doc.origin)}</span><small class="document-path" title="${esc(doc.path)}">${esc(doc.path)}</small></td><td><span class="document-date">${date(doc.modified)}</span><small class="document-path">${esc(doc.owner)}</small></td><td><button class="text-action" data-doc="${esc(doc.id)}">Read transcript ↗</button></td></tr>`).join('') || `<tr><td colspan="${selectable ? 5 : 4}" class="empty-cell">No matching documents.</td></tr>`;
      if (selectable) {
        const all = container.querySelector('[data-all]'); all.checked = state.documents.length > 0 && state.included.length === state.documents.length; all.indeterminate = state.included.length > 0 && state.included.length < state.documents.length;
      }
    };
    container.querySelector('.document-search').oninput = fill;
    container.onchange = event => {
      if (!event.target.matches('[data-include], [data-all]')) return;
      if (busy) { fill(); return; }
      if (event.target.matches('[data-all]')) state.included = event.target.checked ? state.documents.map(doc => doc.id) : [];
      else state.included = event.target.checked ? [...new Set([...state.included, event.target.dataset.include])] : state.included.filter(id => id !== event.target.dataset.include);
      invalidate(); save(); fill(); updateSelection(); updateSteps();
    };
    fill();
  }
  function updateSelection() {
    const count = selectedDocs().length;
    $('#selection-receipt').textContent = `${count} of ${state.documents.length} documents selected. Uncheck any interview you want to leave out.`;
    $('#analysis-selection').textContent = `${count} transcript${count === 1 ? '' : 's'} ready for analysis`;
    $('#analyze-btn').disabled = !count || busy;
    $('#library-status').textContent = state.focus === 'onboarding' ? `Local library index · Checked ${date(state.checkedAt)}` : `${state.documents.length} project documents · Saved in this browser`;
  }

  function openDialog(title, body) {
    $('#detail-title').textContent = title; $('#detail-body').innerHTML = body; $('#detail-dialog').showModal();
  }
  function showDocument(id, quotedText) {
    const doc = state.documents.find(item => item.id === id);
    if (!doc) return;
    openDialog(doc.title, `<div class="document-receipt"><b>${esc(doc.file)}</b><span>${esc(doc.origin)} · ${date(doc.modified)}</span><small>${esc(doc.path)}</small></div>${quotedText ? `<div class="source-quote"><b>Passage used in this opportunity</b><p>${esc(quotedText)}</p></div>` : ''}<h3 class="transcript-label">Full transcript</h3><pre class="transcript-content">${esc(doc.text)}</pre>`);
  }
  function showSourceDetails() {
    openDialog('Research source details', `<div class="detail-note"><b>${esc(state.name)} · Research data</b><p>The onboarding project includes six synthetic interviews. New projects start with an empty library for your research. No live SharePoint connection is configured.</p></div><dl class="source-facts"><dt>Current visitor</dt><dd>${esc(visitor.name)} · Local profile, not a signed-in account</dd><dt>Current project</dt><dd>${esc(state.name)}</dd><dt>Your documents</dt><dd>Upload files, paste a transcript, or select a source folder. Text extraction runs locally.</dd><dt>Refresh behavior</dt><dd>The onboarding library reloads its bundled index and reports actual changes. Choose a source folder again to reread your own files.</dd><dt>Processing</dt><dd>TXT, DOCX, text PDF, and CSV extraction runs on this device. Scanned PDFs need OCR; legacy DOC files must be saved as DOCX.</dd><dt>Local rules</dt><dd>Groups four predefined onboarding topics on this device. Exact quotes are preserved.</dd><dt>AI method</dt><dd>Cloudflare Workers AI analyzes selected excerpts or drafts sections from a chosen opportunity and rationale. Project context and excerpts are sent only when you select the AI method and run it. Citation IDs are validated against supplied evidence; this does not prove every interpretation is correct.</dd><dt>Storage</dt><dd>Project research, opportunities, decisions, and drafts are stored under this visitor profile in this browser. They are not shared company-wide or synced across devices. Switch visitor to start another local workspace. Local profiles are not secure access control. The AI database stores rate and daily-usage counters, not transcripts or generated drafts.</dd></dl>`);
  }
  function showGuide() {
    openDialog('Your first product review', `<p class="guide-intro">Your current project is <b>${esc(state.name)}</b>. ${state.documents.length ? 'Research documents are available to review.' : 'Add transcripts to begin.'}</p><ol class="guide-list"><li><b>Select interviews</b><p>Open Product workflow. Read a transcript for context, choose an analysis method, then analyze selected transcripts.</p></li><li><b>Review opportunities</b><p>Read the supporting quotes, edit the wording if needed, and select opportunities to compare. All opportunities remain in the backlog across reviews.</p></li><li><b>Choose your priority</b><p>Optionally estimate RICE for each opportunity. Select one to draft requirements and record your trade-off. A higher score does not automatically make the decision.</p></li><li><b>Finish the PRD</b><p>PRD means Product Requirements Document. Edit the draft, record open questions, and mark it reviewed. Your decision remains in the Decision log.</p></li></ol><div class="guide-actions"><button class="primary-btn" id="guide-start">Open product workflow →</button><a class="text-action help-link" href="testing-guide.html" target="_blank" rel="noopener">Open testing guide ↗</a></div><p class="dialog-dismiss-hint">Click outside this window or press Esc to close.</p>`);
    $('#guide-start').onclick = () => { $('#detail-dialog').close(); location.hash = '#workflow'; navigate(); };
  }

  function renderOpportunities() {
    const opportunities = state.analysis?.opportunities || [];
    $('#opportunity-list').innerHTML = `<p class="generation-note">${esc(state.analysis?.method || 'Research review')} · Interpretations need your review. Every opportunity is retained in the backlog.</p>` + (opportunities.map(o => `<article class="opportunity-card ${state.comparison.includes(o.id) ? 'selected' : ''}"><div class="opp-top"><label class="opp-title-wrap"><input type="checkbox" data-compare="${o.id}" ${state.comparison.includes(o.id) ? 'checked' : ''}><span class="opp-title">${esc(o.title)}</span></label><span class="evidence-count">${o.documentCount} documents · ${o.evidence.length} passages</span></div><p class="opp-desc">${esc(o.problem)}</p><details class="evidence-details"><summary>Read source quotes (${o.evidence.length})</summary>${o.evidence.map(e => `<div class="evidence-passage"><div><b>${esc(e.title)}</b><span>${esc(e.location)}</span><button class="text-action" data-quote="${esc(e.id)}">Open full transcript ↗</button></div><blockquote>${esc(e.text)}</blockquote></div>`).join('')}</details><details class="edit-opportunity"><summary>Edit opportunity wording</summary><label>Opportunity title<input data-opp="${o.id}" data-field="title" value="${esc(o.title)}"></label><label>Problem statement<textarea data-opp="${o.id}" data-field="problem" rows="3">${esc(o.problem)}</textarea></label></details></article>`).join('') || '<div class="empty-state"><h3>No supported opportunities found in this analysis</h3><p>Check the selected evidence. The local rules cover only predefined onboarding topics. You can select AI synthesis for broader research or add a supported opportunity manually in the backlog.</p><a class="quiet-btn link-btn" href="#backlog">Open opportunity backlog →</a></div>');
    $('#opportunity-selection').textContent = `${state.comparison.length} selected`;
    $('#to-prioritize').disabled = !state.comparison.length;
  }
  function scoreText(o) { const value = PilotDomain.score(o.rice); return value == null ? 'Not estimated' : `${PilotDomain.formatScore(value)} RICE`; }
  function calculation(o) {
    const score = PilotDomain.score(o.rice);
    return score == null ? 'Complete all four estimates to calculate a score. Estimates are optional.' : `${o.rice.reach} × ${o.rice.impact} × (${o.rice.confidence}% ÷ 100%) ÷ ${o.rice.effort} = ${PilotDomain.formatScore(score)}`;
  }
  function updateComparisonSummary() {
    const estimated = candidates().filter(o => PilotDomain.score(o.rice) != null).length;
    $('#priority-estimate-count').textContent = `${estimated} of ${candidates().length} opportunities scored · Estimates remain your assumptions`;
    const selected = chosen();
    const ranked = candidates().filter(o => PilotDomain.score(o.rice) != null).sort((a,b) => PilotDomain.score(b.rice) - PilotDomain.score(a.rice));
    const score = selected && PilotDomain.score(selected.rice);
    $('#decision-score-note').textContent = !selected ? '' : score == null ? 'This opportunity has no complete RICE estimate. You can still choose it with a rationale.' : ranked[0] && score < PilotDomain.score(ranked[0].rice) ? 'Another opportunity has a higher score. Explain why this one should come first.' : 'This is among the highest-scoring estimated opportunities. Confirm the assumptions before deciding.';
  }
  function renderPriorities() {
    let list = candidates();
    if ($('#sort-rice').checked) list = [...list].sort((a,b) => (PilotDomain.score(b.rice) ?? -1) - (PilotDomain.score(a.rice) ?? -1));
    $('#priority-list').innerHTML = list.map(o => `<article class="priority-card ${o.id === state.chosen ? 'winner' : ''}" data-priority="${o.id}"><div class="priority-card-head"><b>${esc(o.title)}</b><span class="score-pill" data-score="${o.id}">${scoreText(o)}</span></div><p class="estimate-note">Supported by ${o.documentCount} source documents · ${esc(statuses[o.status] || 'Needs review')}</p><div class="rice-grid">${[
      ['reach','Reach · users / quarter','0','1','','e.g. 1000','Whole number ≥ 0. Estimate affected users; no maximum.'],
      ['impact','Impact · 1–3','1','1','3','e.g. 2','1 low · 2 medium · 3 high.'],
      ['confidence','Confidence · percent','1','1','100','e.g. 80','1–100. Enter 80 for 80%; 2 means 2%.'],
      ['effort','Effort · person-weeks','0.1','0.1','','e.g. 4','Team effort ≥ 0.1, in 0.1 steps; no maximum.']
    ].map(([field,label,min,step,max,placeholder,hint]) => `<label>${label}<input type="number" data-rice="${esc(o.id)}" data-field="${field}" min="${min}" step="${step}" ${max ? `max="${max}"` : ''} value="${esc(o.rice[field])}" placeholder="${placeholder}" aria-label="${esc(`${o.title}: ${label}`)}" aria-describedby="rice-${esc(o.id)}-${field}"><small id="rice-${esc(o.id)}-${field}">${hint}</small></label>`).join('')}</div><p class="rice-calculation" data-calculation="${esc(o.id)}">${esc(calculation(o))}</p><label class="choose-opportunity"><input type="radio" name="decision-opportunity" data-choose="${esc(o.id)}" ${o.id === state.chosen ? 'checked' : ''}> Select this opportunity to draft requirements</label></article>`).join('');
    $('#decision-rationale').value = state.rationale;
    updateChoice();
  }
  function updateChoice() { $('#decision-choice').textContent = chosen()?.title || 'Choose an opportunity'; $('#approve-decision').disabled = !chosen() || busy; updateComparisonSummary(); }
  function renderPrd() {
    if (!state.draft) return;
    const draft = state.draft;
    $('#prd-generation-note').textContent = draft.method === 'Cloudflare Workers AI' ? 'AI draft from your decision and cited evidence. Proposed requirements and measures still need human review.' : 'Starter draft assembled from the selected opportunity’s proposals. Review these editable requirements and measures; they are not established research findings.';
    $('#prd-evidence').innerHTML = `<span class="evidence-ico">▤</span><div><b>${esc(draft.opportunity.title)}</b><small>${draft.opportunity.documentCount} source documents · Decision saved ${date(draft.createdAt)}</small></div>`;
    $('#prd-fields').innerHTML = draft.fields.map(field => `<div class="prd-field"><label for="prd-${field.key}">${esc(field.label)}<small>${esc(field.kind)}</small></label><textarea id="prd-${field.key}" data-prd="${field.key}" rows="${field.key === 'title' ? 1 : field.key === 'problem' ? 7 : 4}">${esc(field.value)}</textarea></div>`).join('');
    $('#review-confirm').checked = !!draft.reviewedAt; updateReviewStatus();
  }
  function updateReviewStatus() {
    const reviewed = !!state.draft?.reviewedAt;
    $('#prd-review-chip').textContent = reviewed ? 'Reviewed' : 'Draft · Needs review';
    $('#prd-review-chip').classList.toggle('reviewed', reviewed);
    $('#prd-status').textContent = reviewed ? `Reviewed ${date(state.draft.reviewedAt)}` : 'Draft saved on this device';
    $('#mark-reviewed').disabled = reviewed || !$('#review-confirm').checked;
    $('#mark-reviewed').textContent = reviewed ? 'PRD reviewed ✓' : 'Mark PRD reviewed ✓';
  }
  function updateDraftHistory() {
    const index = state.decisions.findIndex(item => item.id === state.draft?.id);
    if (index >= 0) state.decisions[index] = structuredClone(state.draft);
  }
  function goStep(step, scroll = true) {
    if (!ready(step)) return;
    state.step = step;
    $$('.stage-panel[id^="stage-"]').forEach(panel => panel.classList.toggle('hidden', panel.id !== `stage-${step}`));
    const copy = {
      1: ['CHOOSE YOUR SOURCES', 'Which interviews should we review?', 'Select the documents below, then analyze them to find product opportunities.'],
      2: ['REVIEW THE EVIDENCE', 'Which problems are worth exploring?', 'Inspect the source quotes and select the opportunities you want to compare.'],
      3: ['MAKE A PRODUCT DECISION', 'What should the team build first?', 'Choose one opportunity and explain the trade-off. RICE estimates are optional.'],
      4: ['REVIEW THE PRODUCT BRIEF', 'Turn your decision into a PRD', 'Check the draft, resolve assumptions, and record any questions that still need answers.']
    }[step];
    $('#stage-kicker').textContent = `STEP ${step} · ${copy[0]}`; $('#stage-title').textContent = copy[1]; $('#stage-description').textContent = copy[2];
    if (step === 1) { renderDocuments($('#workflow-documents'), true); updateSelection(); }
    if (step === 2) renderOpportunities();
    if (step === 3) renderPriorities();
    if (step === 4) renderPrd();
    updateSteps(); save(); if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderOverview() {
    $('#summary-grid').innerHTML = [
      ['Source documents',state.documents.length,'Increases when you add a document. Updating an existing import keeps the same count.'],
      ['Opportunities',state.opportunities.length,'All opportunities retained in this project’s backlog, including deferred and rejected items.'],
      ['Saved decisions',state.decisions.length,'Each saved choice and rationale creates a decision record, even for a previously selected opportunity.'],
      ['Reviewed PRDs',state.decisions.filter(d => d.reviewedAt).length,'Increases after review. Editing a reviewed document returns it to draft until reviewed again.']
    ].map(([label,count,description]) => `<div class="summary-card"><span>${label}</span><b>${count}</b><small>${description}</small></div>`).join('');
    $('#overview-health').innerHTML = [
      ['Needs an opportunity review',state.opportunities.filter(o => o.status === 'needs_review').length,'#backlog'],
      ['Deferred for later',state.opportunities.filter(o => o.status === 'deferred').length,'#backlog'],
      ['PRDs awaiting review',pendingCount(),'#decisions']
    ].map(([label,count,href]) => `<a href="${href}"><b>${count}</b><span>${label} →</span></a>`).join('');
    const latest = state.decisions[0];
    $('#overview-priority').innerHTML = latest ? `<span class="mini-label">LATEST PRODUCT PRIORITY</span><h3>${esc(latest.opportunity.title)}</h3><p>${esc(latest.rationale)}</p><span class="draft-chip ${latest.reviewedAt ? 'reviewed' : ''}">${latest.reviewedAt ? 'PRD reviewed' : 'PRD awaits review'}</span><p class="priority-score">${esc(scoreText(latest.opportunity))} · ${latest.opportunity.documentCount} source documents</p><button class="quiet-btn" data-open-decision="${esc(latest.id)}">Open requirements document →</button>` : `<span class="mini-label">PROJECT OBJECTIVE</span><h3>${esc(state.name)}</h3><p>${esc(state.objective)}</p><p>No priority selected yet. Review the customer evidence and compare opportunities to make your first decision.</p><a class="help-link text-action" href="#backlog">View opportunity backlog →</a>`;
    const step = state.draft ? 4 : candidates().length ? 3 : state.analysis ? 2 : 1;
    const next = { 1: [state.documents.length ? 'Review the interview library' : 'Add customer research', state.documents.length ? 'Choose which interviews to include and look for customer problems. Previous opportunities remain in your backlog.' : 'Upload TXT, DOCX, or text PDF transcripts, paste an interview, or choose a source folder.', state.documents.length ? 'Start product review →' : 'Add transcripts →'], 2: ['Inspect the proposed opportunities', 'The analysis is ready. Read the source quotes and choose what to compare.', 'Review opportunities →'], 3: ['Choose an opportunity to invest in', 'Compare the evidence and estimates, then write your decision rationale.', 'Continue prioritization →'], 4: [state.draft?.reviewedAt ? 'Your PRD has been reviewed' : 'Review your PRD draft', 'Your decision and evidence are recorded. Open the draft to edit or download it.', 'Open product brief →'] }[step];
    $('#overview-next-title').textContent = next[0]; $('#overview-next-copy').textContent = next[1]; $('#resume-workflow').textContent = next[2]; $('#resume-workflow').onclick = () => { state.step = step; location.hash = '#workflow'; navigate(); };
    $('#overview-activity').innerHTML = state.activity.length ? `<div class="activity-list">${state.activity.slice(0, 5).map(a => `<div><span>${esc(a.message)}</span><small>${a.actorName ? `${esc(a.actorName)} · ` : ''}${date(a.at)}</small></div>`).join('')}</div>` : '<div class="empty-state compact"><p>No review activity yet. Start with the interviews in Product workflow.</p></div>';
    $('#overview-questions')?.remove();
    const scope = latest?.fields.find(field => field.key === 'scope')?.value;
    if (scope) {
      const panel = document.createElement('section'); panel.id = 'overview-questions'; panel.className = 'overview-questions';
      panel.innerHTML = `<h3>Scope & questions from the latest PRD</h3><p>Recorded questions and dependencies; review their current status in the document.</p><details><summary>Read scope, dependencies & open questions</summary><pre>${esc(scope)}</pre></details>`;
      $('.overview-main').after(panel);
    }
  }
  function renderBacklog() {
    const filter = $('#backlog-filter').value;
    const list = state.opportunities.filter(o => filter === 'all' || o.status === filter);
    $('#backlog-count').textContent = `${list.length} shown · ${state.opportunities.length} retained in this project`;
    $('#backlog-list').innerHTML = list.length ? list.map(o => `<article class="backlog-card"><div class="priority-card-head"><h3>${esc(o.title)}</h3><span class="score-pill">${esc(scoreText(o))}</span></div><p>${esc(o.problem)}</p><small>${o.documentCount} source documents · ${esc(o.method || 'Rules baseline')} · Updated ${date(o.updatedAt)}</small><div class="backlog-controls"><label>Status<select data-backlog-status="${esc(o.id)}">${Object.entries(statuses).map(([value,label]) => `<option value="${value}" ${value === o.status ? 'selected' : ''}>${label}</option>`).join('')}</select></label><button class="quiet-btn" data-backlog-compare="${esc(o.id)}">Bring into prioritization →</button></div><label class="backlog-note-label">Status rationale / revisit conditions<textarea data-backlog-note="${esc(o.id)}" rows="2" placeholder="Why is this prioritized, deferred, or rejected? When should it be revisited?">${esc(o.notes)}</textarea></label><details class="evidence-details"><summary>Inspect retained evidence (${o.evidence.length} passages)</summary>${o.evidence.map(e => `<div class="evidence-passage"><b>${esc(e.title)} · ${esc(e.location)}</b><blockquote>${esc(e.text)}</blockquote><button class="text-action" data-quote="${esc(e.id)}">Open full transcript ↗</button></div>`).join('')}</details></article>`).join('') : `<div class="empty-state"><h3>${state.opportunities.length ? 'No opportunities match this status' : 'Your opportunity backlog starts here'}</h3><p>Analyze transcripts or add an opportunity from a source passage. Selecting a priority or starting another review keeps these records.</p><a class="primary-btn link-btn" href="#workflow">Open product workflow →</a></div>`;
  }
  function renderDecisions() {
    $('#decision-history').innerHTML = state.decisions.length ? state.decisions.map(d => `<article class="decision-history-card"><div class="decision-history-top"><span class="mini-label">PRODUCT DECISION · ${date(d.createdAt)}</span><span class="draft-chip ${d.reviewedAt ? 'reviewed' : ''}">${d.reviewedAt ? 'PRD reviewed' : 'PRD needs review'}</span></div><h3>${esc(d.opportunity.title)}</h3><p>${esc(d.rationale)}</p><div class="decision-history-footer"><span>${d.opportunity.documentCount} source documents · ${scoreText(d.opportunity)} · ${esc(d.ownerName || 'Previous visitor (name not recorded)')}</span><button class="quiet-btn" data-open-decision="${esc(d.id)}">Open PRD →</button></div><details class="evidence-details"><summary>Read the evidence used for this decision</summary>${d.opportunity.evidence.map(e => `<div class="evidence-passage"><b>${esc(e.title)} · ${esc(e.location)}</b><blockquote>${esc(e.text)}</blockquote></div>`).join('')}</details></article>`).join('') : '<div class="empty-state"><h3>No product decisions yet</h3><p>After reviewing opportunities, choose one and save your rationale. The decision and its evidence will appear here.</p><a class="primary-btn link-btn" href="#workflow">Start a product review →</a></div>';
  }
  function navigate() {
    updateProjectControls();
    const requested = location.hash.slice(1); route = ['overview','workflow','research','decisions','backlog'].includes(requested) ? requested : 'workflow';
    $$('.workspace-view').forEach(view => view.classList.toggle('hidden', view.id !== `view-${route}`));
    $$('.nav-item').forEach(link => { const active = link.getAttribute('href') === `#${route}`; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
    const labels = { overview: ['Project overview','Track this project’s research, opportunity backlog, decisions, and requirements.'], workflow: ['Product workflow','Choose transcripts → review opportunities → make a decision → review a Product Requirements Document (PRD).'], research: ['Research library','Keep the original interviews close. Add documents and inspect the full conversation.'], decisions: ['Decision log','See what was chosen, why it was chosen, and the evidence behind each product decision.'], backlog: ['Opportunity backlog','Keep every opportunity, its evidence, and your prioritization rationale across reviews.'] };
    $('#page-title').textContent = labels[route][0]; $('#page-description').textContent = labels[route][1];
    if (route === 'workflow') goStep(ready(state.step) ? state.step : 1, false);
    if (route === 'overview') renderOverview();
    if (route === 'research') renderDocuments($('#research-documents'), false);
    if (route === 'decisions') renderDecisions();
    if (route === 'backlog') renderBacklog();
  }

  async function importFiles(files) {
    if (busy) return;
    busy = true; updateSelection(); $('#project-picker').disabled = true; $('#mobile-project-picker').disabled = true;
    const supported = [...files].filter(file => /\.(txt|pdf|docx|csv)$/i.test(file.name)).slice(0, 30);
    if (!supported.length) { busy = false; $('#project-picker').disabled = false; $('#mobile-project-picker').disabled = false; updateSelection(); toast('Choose TXT, PDF, DOCX, or CSV files. Save legacy DOC files as DOCX.'); return; }
    const errors = []; let changes = 0, duplicates = 0;
    $('#footer-status').textContent = 'Reading transcript files…';
    for (const file of supported) {
      try {
        const doc = await PilotIngest.readFile(file);
        doc.owner = `Imported by ${visitor.name}`; doc.ownerId = visitor.id;
        const existing = state.documents.findIndex(item => item.origin !== 'Bundled research library' && item.path === doc.path);
        if (existing >= 0 && state.documents[existing].text === doc.text) { duplicates++; continue; }
        if (existing >= 0) { doc.id = state.documents[existing].id; state.documents[existing] = doc; }
        else state.documents.unshift(doc);
        state.included = [...new Set([...state.included, doc.id])]; changes++;
      } catch (error) { errors.push(`${file.name}: ${error.message}`); }
    }
    if (changes) { invalidate(); log(`Imported or updated ${changes} transcript${changes === 1 ? '' : 's'}.`); }
    busy = false; $('#project-picker').disabled = false; $('#mobile-project-picker').disabled = false; save(); navigate(); updateSelection(); $('#footer-status').textContent = 'Research → decision → reviewed PRD';
    if (errors.length) openDialog('File import results', `<p>${changes} imported or updated; ${duplicates} unchanged.</p><ul class="import-errors">${errors.map(error => `<li>${esc(error)}</li>`).join('')}</ul><p>TXT and DOCX preserve text; PDFs must have selectable text.</p>`);
    else toast(changes ? `${changes} transcript${changes === 1 ? '' : 's'} added or updated. Analyze them in Product workflow.` : 'No document changes found.');
  }

  async function refreshLibrary() {
    if (busy || state.focus !== 'onboarding') return;
    busy = true;
    const button = $('#refresh-library'); button.disabled = true; button.textContent = 'Checking library…';
    try {
      await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = `research-data.js?checked=${Date.now()}`; script.onload = () => { script.remove(); resolve(); }; script.onerror = () => { script.remove(); reject(new Error('The bundled library index could not be loaded.')); }; document.head.append(script); });
      let changes = 0;
      for (const doc of PilotResearch.documents) {
        const index = state.documents.findIndex(item => item.id === doc.id);
        if (index >= 0 && JSON.stringify(state.documents[index]) === JSON.stringify(doc)) continue;
        if (index >= 0) state.documents[index] = structuredClone(doc); else { state.documents.push(structuredClone(doc)); state.included.push(doc.id); }
        changes++;
      }
      const ids = new Set(PilotResearch.documents.map(doc => doc.id));
      const obsolete = state.documents.filter(doc => doc.origin === 'Bundled research library' && !ids.has(doc.id));
      if (obsolete.length) { state.documents = state.documents.filter(doc => !obsolete.some(old => old.id === doc.id)); state.included = state.included.filter(id => !obsolete.some(old => old.id === id)); changes += obsolete.length; }
      state.checkedAt = now(); if (changes) { invalidate(); log(`Research library refreshed: ${changes} document changes.`); }
      save(); navigate(); toast(changes ? `${changes} document changes found. Analyze the updated sources.` : 'Library checked. No document changes found.');
    } catch (error) { toast(error.message); }
    finally { busy = false; button.disabled = false; button.textContent = 'Refresh library'; updateSelection(); }
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('button, a'); if (!target) return;
    if (target.matches('[data-close]')) target.closest('dialog').close();
    if (target.matches('#visitor-profile')) showVisitorSettings();
    if (target.matches('[data-guide]')) showGuide();
    if (target.matches('[data-source-details], #source-details-top')) showSourceDetails();
    if (target.matches('[data-upload]') && !busy) $('#transcript-files').click();
    if (target.matches('[data-folder]') && !busy) $('#transcript-folder').click();
    if (target.matches('[data-paste]') && !busy) $('#paste-dialog').showModal();
    if (target.matches('[data-new-project]') && !busy) $('#project-dialog').showModal();
    if (target.matches('[data-doc]')) showDocument(target.dataset.doc);
    if (target.matches('[data-quote]')) { const passage = state.analysis?.records?.find(e => e.id === target.dataset.quote) || state.opportunities.flatMap(o => o.evidence).find(e => e.id === target.dataset.quote); if (passage) showDocument(passage.docId, passage.text); }
    if (target.matches('[data-step]') && !busy) goStep(Number(target.dataset.step));
    if (target.matches('[data-back]') && !busy) goStep(Number(target.dataset.back));
    if (target.matches('[data-backlog-compare]') && !busy) { PilotProjects.activateBacklog(state, target.dataset.backlogCompare); location.hash = '#workflow'; navigate(); save(); }
    if (target.matches('[data-open-decision]') && !busy) { state.draft = structuredClone(state.decisions.find(d => d.id === target.dataset.openDecision)); state.step = 4; location.hash = '#workflow'; navigate(); }
  });
  $('#visitor-form').onsubmit = event => { event.preventDefault(); acceptVisitor($('#visitor-name').value); };
  $('#visitor-guest').onclick = () => acceptVisitor('Guest visitor');
  $('#project-picker').onchange = event => switchProject(event.target.value);
  $('#mobile-project-picker').onchange = event => switchProject(event.target.value);
  $('#project-form').onsubmit = event => {
    event.preventDefault(); if (busy) return;
    const name = $('#project-name').value.trim(), objective = $('#project-objective').value.trim(); if (!name || !objective) return;
    const project = PilotProjects.create(name, objective); project.createdByName = visitor.name; project.createdById = visitor.id;
    workspace.projects.push(project); $('#project-dialog').close(); event.target.reset(); switchProject(project.id);
    log(`Created project: ${name}.`); save(); location.hash = '#workflow'; navigate();
  };
  $('#backlog-filter').onchange = renderBacklog;
  $('#backlog-list').onchange = event => {
    if (busy) return;
    if (!event.target.matches('[data-backlog-status]')) return;
    const o = state.opportunities.find(o => o.id === event.target.dataset.backlogStatus);
    if (!o || !statuses[event.target.value]) return;
    o.status = event.target.value; o.updatedAt = now(); log(`${o.title}: ${statuses[o.status]}.`); save(); renderBacklog();
  };
  $('#backlog-list').oninput = event => {
    if (busy) return;
    if (!event.target.matches('[data-backlog-note]')) return;
    const o = state.opportunities.find(o => o.id === event.target.dataset.backlogNote); if (!o) return;
    o.notes = event.target.value; o.updatedAt = now(); save();
  };
  $('#add-opportunity').onclick = () => {
    if (busy) return;
    const passages = PilotDomain.excerpts(state.documents);
    if (!passages.length) { toast('Add a transcript with a customer passage first.'); return; }
    openDialog('Add an opportunity from evidence', `<form id="manual-opportunity-form"><p>Record a customer problem and select an exact passage that supports it. You can compare this opportunity and draft requirements later.</p><label for="manual-title">Opportunity title</label><input id="manual-title" required maxlength="160"><label for="manual-problem">Customer problem</label><textarea id="manual-problem" required rows="3" maxlength="1600"></textarea><label for="manual-passage">Supporting passage</label><select id="manual-passage" required>${passages.map((e,i) => `<option value="${i}">${esc(`${e.title} · ${e.location}: ${e.text.slice(0,140)}`)}</option>`).join('')}</select><blockquote id="manual-quote"></blockquote><div class="dialog-actions"><button type="button" class="quiet-btn" data-close>Cancel</button><button type="submit" class="primary-btn">Add to backlog</button></div></form>`);
    const display = () => { $('#manual-quote').textContent = passages[Number($('#manual-passage').value)].text; }; $('#manual-passage').onchange = display; display();
    $('#manual-opportunity-form').onsubmit = event => {
      event.preventDefault(); const title = $('#manual-title').value.trim(), problem = $('#manual-problem').value.trim(); if (!title || !problem) return;
      const passage = passages[Number($('#manual-passage').value)];
      PilotProjects.retain(state, [{ id: `manual-${crypto.randomUUID()}`, title, problem, evidence: [passage], documentCount: 1, rice: {reach:'',impact:2,confidence:'',effort:''}, proposal: 'Define a proposed solution with product and engineering reviewers.', requirements: 'Describe the user need, required behavior, and constraints before delivery.', criteria: 'Specify observable conditions that demonstrate the requirement is met.', metric: 'Select an outcome metric and agree on an evaluation plan.' }], 'Human research review');
      log(`Added opportunity: ${title}.`); save(); $('#detail-dialog').close(); renderBacklog();
    };
  };
  // Only dismiss a gesture that both starts and ends on the backdrop.
  // Clicking dialog padding or dragging selected transcript text stays inside.
  $$('.workspace-dialog').forEach(dialog => {
    let startedOutside = false;
    const onBackdrop = event => {
      const rect = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    };
    dialog.addEventListener('pointerdown', event => { startedOutside = event.button === 0 && onBackdrop(event); });
    dialog.addEventListener('pointercancel', () => { startedOutside = false; });
    dialog.addEventListener('click', event => {
      if (startedOutside && onBackdrop(event)) dialog.close();
      startedOutside = false;
    });
    dialog.addEventListener('close', () => { startedOutside = false; });
  });
  $('#transcript-files').onchange = event => { importFiles(event.target.files); event.target.value = ''; };
  $('#transcript-folder').onchange = event => { importFiles(event.target.files); event.target.value = ''; };
  $('#paste-form').onsubmit = event => {
    event.preventDefault(); if (busy) return; const title = $('#transcript-title').value.trim(), text = $('#transcript-text').value.trim(); if (!title || !text) return;
    if (text.length > 250000) { toast('Split this transcript into documents under 250,000 characters.'); return; }
    const doc = { id: `DOC-${crypto.randomUUID()}`, file: `${title}.txt`, title, format: 'TXT', text, modified: now(), owner: `Added by ${visitor.name}`, ownerId: visitor.id, origin: 'Pasted transcript', path: `Manual transcripts / ${title}.txt` };
    state.documents.unshift(doc); state.included.push(doc.id); state.pasteDraft = null; invalidate(); log(`Added transcript: ${title}.`); save(); event.target.reset(); $('#paste-dialog').close(); navigate(); toast('Transcript added. Analyze it in Product workflow.');
  };
  const drop = $('#drop-zone');
  ['dragenter','dragover'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.remove('dragging'); }));
  drop.addEventListener('drop', event => importFiles(event.dataTransfer.files));
  $('#refresh-library').onclick = refreshLibrary;
  $('#analyze-btn').onclick = async () => {
    if (busy || !selectedDocs().length) return;
    busy = true; updateSelection(); $('#analyze-btn').textContent = 'Analyzing transcripts…';
    try {
      const method = $('#analysis-mode').value === 'ai' ? 'Cloudflare Workers AI' : 'Rules baseline';
      const analysis = method === 'Cloudflare Workers AI' ? await PilotAI.analyze(state, selectedDocs()) : PilotDomain.synthesize(selectedDocs());
      analysis.method = method; analysis.opportunities = PilotProjects.retain(state, analysis.opportunities, method);
      state.analysis = analysis; state.comparison = analysis.opportunities.map(o => o.id); state.chosen = null; state.rationale = ''; state.draft = null;
      log(`Analyzed ${analysis.sourceIds.length} transcripts using ${method}; retained ${analysis.opportunities.length} opportunities.`); goStep(2);
    } catch (error) { toast(error.message); }
    finally { busy = false; $('#analyze-btn').textContent = 'Analyze selected transcripts →'; updateSelection(); }
  };
  $('#opportunity-list').onchange = event => {
    if (busy) return;
    if (!event.target.matches('[data-compare]')) return;
    const id = event.target.dataset.compare; state.comparison = event.target.checked ? [...new Set([...state.comparison,id])] : state.comparison.filter(item => item !== id);
    if (!state.comparison.includes(state.chosen)) state.chosen = null;
    state.draft = null; save(); renderOpportunities(); updateSteps();
  };
  $('#opportunity-list').oninput = event => { if (busy || !event.target.matches('[data-opp]')) return; const o = state.analysis.opportunities.find(item => item.id === event.target.dataset.opp); o[event.target.dataset.field] = event.target.value; o.edited = true; o.updatedAt = now(); if (event.target.dataset.field === 'title') event.target.closest('.opportunity-card').querySelector('.opp-title').textContent = event.target.value; state.draft = null; updateSteps(); save(); };
  $('#to-prioritize').onclick = () => goStep(3);
  $('#priority-list').oninput = event => {
    if (busy || !event.target.matches('[data-rice]')) return;
    const o = candidates().find(item => item.id === event.target.dataset.rice); o.rice[event.target.dataset.field] = event.target.value; state.draft = null;
    $(`[data-score="${o.id}"]`).textContent = scoreText(o); $(`[data-calculation="${o.id}"]`).textContent = calculation(o); o.updatedAt = now(); updateComparisonSummary(); save(); updateSteps();
  };
  $('#sort-rice').onchange = renderPriorities;
  $('#priority-list').onchange = event => { if (busy) return; if (event.target.matches('[data-rice]') && $('#sort-rice').checked) { renderPriorities(); return; } if (!event.target.matches('[data-choose]')) return; state.chosen = event.target.dataset.choose; state.draft = null; $$('[data-priority]').forEach(card => card.classList.toggle('winner', card.dataset.priority === state.chosen)); updateChoice(); updateSteps(); save(); };
  $('#decision-rationale').oninput = event => { if (busy) return; state.rationale = event.target.value; state.draft = null; updateSteps(); save(); };
  $('#approve-decision').onclick = async () => {
    if (busy) return;
    const o = chosen(); if (!o) return;
    if (!o.title.trim() || !o.problem.trim()) { toast('Add an opportunity title and problem statement before saving.'); return; }
    if (!state.rationale.trim()) { toast('Write a short reason for choosing this opportunity.'); $('#decision-rationale').focus(); return; }
    const invalid = [...$('#priority-list').querySelectorAll(`[data-rice="${o.id}"]`)].find(input => input.value !== '' && !input.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    busy = true; $('#approve-decision').disabled = true; $('#approve-decision').textContent = 'Preparing requirements…';
    try {
      const rationale = state.rationale.trim();
      const method = $('#draft-mode').value === 'ai' ? 'Cloudflare Workers AI' : 'Starter template';
      let fields = PilotDomain.draft(o, rationale);
      if (method === 'Cloudflare Workers AI') fields = await PilotAI.draft(state, structuredClone(o), rationale, fields);
      o.status = 'prioritized'; o.notes = rationale; o.updatedAt = now();
      state.draft = { id: crypto.randomUUID(), projectId: state.id, projectName: state.name, ownerId: visitor.id, ownerName: visitor.name, createdAt: now(), opportunity: structuredClone(o), rationale, fields, method, reviewedAt: null };
      state.decisions.unshift(structuredClone(state.draft)); log(`Saved product decision: ${o.title}.`); goStep(4);
    } catch (error) { toast(error.message); }
    finally { busy = false; $('#approve-decision').textContent = 'Save decision & draft requirements →'; updateChoice(); }
  };
  $('#prd-fields').oninput = event => {
    if (!event.target.matches('[data-prd]') || !state.draft) return;
    state.draft.fields.find(field => field.key === event.target.dataset.prd).value = event.target.value; state.draft.lastEditedBy = visitor.name; state.draft.reviewedAt = null; state.draft.reviewedBy = null; $('#review-confirm').checked = false; updateDraftHistory(); updateReviewStatus(); save();
  };
  $('#review-confirm').onchange = updateReviewStatus;
  $('#mark-reviewed').onclick = () => {
    if (!state.draft || !$('#review-confirm').checked) return;
    if (state.draft.fields.some(field => ['title','problem','decision','solution'].includes(field.key) && !field.value.trim())) { toast('Complete the title, problem, rationale, and solution before marking the PRD reviewed.'); return; }
    state.draft.reviewedAt = now(); state.draft.reviewedBy = visitor.name; updateDraftHistory(); log(`Reviewed PRD: ${state.draft.opportunity.title}.`); updateReviewStatus(); save(); toast('PRD reviewed. The decision log is updated.');
  };
  $('#export-prd').onclick = async () => {
    if (!state.draft) return;
    const button = $('#export-prd'); button.disabled = true; button.textContent = 'Preparing Word document…';
    try {
      const snapshot = structuredClone(state.draft);
      const blob = await PilotPrdExport.exportDocx(snapshot);
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = PilotPrdExport.filename(snapshot); document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000); toast('Word document prepared with your edits and source appendix.');
    } catch (error) { toast(`Could not export the PRD: ${error.message}`); }
    finally { button.disabled = false; button.textContent = 'Download Word document (.docx)'; }
  };
  $('#new-review').onclick = () => { if (busy) return; invalidate(); log('Started a new review. Research, opportunity backlog, and decisions retained.'); goStep(1); toast('New review started. Your research, backlog, and decisions are retained.'); };
  window.addEventListener('hashchange', navigate);
  renderVisitor(); updateSelection(); navigate(); save();
  PilotAI.connect();
  if (!visitor.introduced) showVisitorPrompt('welcome');
})();

