(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const key = 'productpilot-workspace-v2';
  const now = () => new Date().toISOString();
  const date = value => new Date(value).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const initial = () => ({ version: 2, documents: structuredClone(PilotResearch.documents), included: PilotResearch.documents.map(doc => doc.id), analysis: null, comparison: [], chosen: null, rationale: '', draft: null, decisions: [], activity: [], step: 1, checkedAt: now() });
  let state;
  try { const saved = JSON.parse(localStorage.getItem(key)); state = saved?.version === 2 && Array.isArray(saved.documents) ? saved : initial(); }
  catch { state = initial(); }
  // Update bundled document branding in an already-saved workspace.
  // Uploaded documents and historical decisions retain their original content.
  for (const doc of state.documents) {
    if (doc.origin === 'Bundled research library' && doc.text.startsWith('Ravugo Research')) {
      doc.text = doc.text.replace(/^Ravugo Research/, 'Ravugo Consulting LLC Research');
    }
  }
  let route = 'workflow', busy = false;

  function toast(message) {
    $('#toast').textContent = message; $('#toast').classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 4000);
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); $('#save-state').innerHTML = '<span></span> Saved on this device'; }
    catch { $('#save-state').textContent = 'Session only · storage unavailable'; }
  }
  function log(message) { state.activity.unshift({ message, at: now() }); state.activity = state.activity.slice(0, 30); }
  function invalidate() { state.analysis = null; state.comparison = []; state.chosen = null; state.rationale = ''; state.draft = null; state.step = 1; }
  const selectedDocs = () => state.documents.filter(doc => state.included.includes(doc.id));
  const candidates = () => state.analysis?.opportunities.filter(o => state.comparison.includes(o.id)) || [];
  const chosen = () => candidates().find(o => o.id === state.chosen);
  const ready = step => step === 1 || (step === 2 && !!state.analysis) || (step === 3 && candidates().length > 0) || (step === 4 && !!state.draft);
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
    $('#library-status').textContent = `Local library index · Checked ${date(state.checkedAt)}`;
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
    openDialog('Research source details', `<div class="detail-note"><b>Research data</b><p>The included interview transcripts are synthetic documents used to exercise the workflow. You can add your own research files; no live SharePoint connection is configured.</p></div><dl class="source-facts"><dt>Bundled source</dt><dd>research/manifest.json and six TXT transcripts</dd><dt>Library index</dt><dd>research-data.js — regenerated from the source documents</dd><dt>Last checked</dt><dd>${date(state.checkedAt)}</dd><dt>Your documents</dt><dd>Upload files, paste a transcript, or select a source folder. These are read locally and added to the workspace.</dd><dt>Refresh behavior</dt><dd>Reloads the bundled index and reports actual document changes. To reread files in a folder, choose “Open source folder” again.</dd><dt>Processing</dt><dd>TXT, DOCX, text PDF, and CSV extraction runs on this device. Scanned PDFs need OCR; legacy DOC files must be saved as DOCX.</dd><dt>Analysis</dt><dd>Keyword grouping for onboarding topics. No live LLM call. Exact source quotes are preserved for review.</dd><dt>Storage</dt><dd>Workspace data and drafts are stored in this browser when local storage is available.</dd></dl>`);
  }
  function showGuide() {
    openDialog('Your first product review', `<p class="guide-intro">You are helping Ravugo Consulting LLC decide how to improve onboarding. The interviews are already available, so you can start immediately.</p><ol class="guide-list"><li><b>Select interviews</b><p>Open Product workflow. Read a transcript if you want context, then select “Analyze selected transcripts.”</p></li><li><b>Review opportunities</b><p>Read the supporting quotes, edit the wording if needed, and select opportunities to compare.</p></li><li><b>Choose your priority</b><p>Optionally add RICE estimates. Choose one opportunity for the PRD and write why it matters now.</p></li><li><b>Finish the PRD</b><p>Edit the draft, record open questions, and mark it reviewed. Your decision remains in the Decision log.</p></li></ol><button class="primary-btn" id="guide-start">Open product workflow →</button>`);
    $('#guide-start').onclick = () => { $('#detail-dialog').close(); location.hash = '#workflow'; navigate(); };
  }

  function renderOpportunities() {
    const opportunities = state.analysis?.opportunities || [];
    $('#opportunity-list').innerHTML = opportunities.map(o => `<article class="opportunity-card ${state.comparison.includes(o.id) ? 'selected' : ''}"><div class="opp-top"><label class="opp-title-wrap"><input type="checkbox" data-compare="${o.id}" ${state.comparison.includes(o.id) ? 'checked' : ''}><span class="opp-title">${esc(o.title)}</span></label><span class="evidence-count">${o.documentCount} documents · ${o.evidence.length} passages</span></div><p class="opp-desc">${esc(o.problem)}</p><details class="evidence-details"><summary>Read source quotes (${o.evidence.length})</summary>${o.evidence.map(e => `<div class="evidence-passage"><div><b>${esc(e.title)}</b><span>${esc(e.location)}</span><button class="text-action" data-quote="${esc(e.id)}">Open full transcript ↗</button></div><blockquote>${esc(e.text)}</blockquote></div>`).join('')}</details><details class="edit-opportunity"><summary>Edit opportunity wording</summary><label>Opportunity title<input data-opp="${o.id}" data-field="title" value="${esc(o.title)}"></label><label>Problem statement<textarea data-opp="${o.id}" data-field="problem" rows="3">${esc(o.problem)}</textarea></label></details></article>`).join('') || '<div class="empty-state"><h3>No matching onboarding patterns found</h3><p>The current analyzer looks for account verification, saved progress, requirements, and profile changes. Read your source documents and return to select relevant transcripts. Broader synthesis will need the planned LLM integration.</p></div>';
    $('#opportunity-selection').textContent = `${state.comparison.length} selected`;
    $('#to-prioritize').disabled = !state.comparison.length;
  }
  function scoreText(o) { const value = PilotDomain.score(o.rice); return value == null ? 'Not estimated' : `${value.toFixed(1)} RICE`; }
  function renderPriorities() {
    $('#priority-list').innerHTML = candidates().map(o => `<article class="priority-card ${o.id === state.chosen ? 'winner' : ''}" data-priority="${o.id}"><div class="priority-card-head"><b>${esc(o.title)}</b><span class="score-pill" data-score="${o.id}">${scoreText(o)}</span></div><p class="estimate-note">Supported by ${o.documentCount} documents. Add your delivery estimates below.</p><div class="rice-grid">${[['reach','Reach · users/qtr','0','1',''],['impact','Impact · 1–3','1','1','3'],['confidence','Confidence · %','1','1','100'],['effort','Effort · weeks','0.1','0.1','']].map(([field,label,min,step,max]) => `<label>${label}<input type="number" data-rice="${o.id}" data-field="${field}" min="${min}" step="${step}" ${max ? `max="${max}"` : ''} value="${esc(o.rice[field])}" placeholder="Estimate"></label>`).join('')}</div><label class="choose-opportunity"><input type="radio" name="decision-opportunity" data-choose="${o.id}" ${o.id === state.chosen ? 'checked' : ''}> Choose for PRD</label></article>`).join('');
    $('#decision-rationale').value = state.rationale;
    updateChoice();
  }
  function updateChoice() { $('#decision-choice').textContent = chosen()?.title || 'Choose an opportunity'; $('#approve-decision').disabled = !chosen(); }
  function renderPrd() {
    if (!state.draft) return;
    const draft = state.draft;
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
    $('#summary-grid').innerHTML = [['Source documents',state.documents.length],['Opportunities',state.analysis?.opportunities.length || 0],['Saved decisions',state.decisions.length],['Reviewed PRDs',state.decisions.filter(d => d.reviewedAt).length]].map(([label,count]) => `<div class="summary-card"><span>${label}</span><b>${count}</b></div>`).join('');
    const step = state.draft ? 4 : candidates().length ? 3 : state.analysis ? 2 : 1;
    const next = { 1: ['Review the interview library', 'The source documents are ready. Choose which interviews to include and look for customer problems.', 'Start product review →'], 2: ['Inspect the proposed opportunities', 'The analysis is ready. Read the source quotes and choose what to compare.', 'Review opportunities →'], 3: ['Choose an opportunity to invest in', 'Compare the evidence and estimates, then write your decision rationale.', 'Continue prioritization →'], 4: [state.draft?.reviewedAt ? 'Your PRD has been reviewed' : 'Review your PRD draft', 'Your decision and evidence are recorded. Open the draft to edit or download it.', 'Open product brief →'] }[step];
    $('#overview-next-title').textContent = next[0]; $('#overview-next-copy').textContent = next[1]; $('#resume-workflow').textContent = next[2]; $('#resume-workflow').onclick = () => { state.step = step; location.hash = '#workflow'; navigate(); };
    $('#overview-activity').innerHTML = state.activity.length ? `<div class="activity-list">${state.activity.slice(0, 5).map(a => `<div><span>${esc(a.message)}</span><small>${date(a.at)}</small></div>`).join('')}</div>` : '<div class="empty-state compact"><p>No review activity yet. Start with the interviews in Product workflow.</p></div>';
  }
  function renderDecisions() {
    $('#decision-history').innerHTML = state.decisions.length ? state.decisions.map(d => `<article class="decision-history-card"><div class="decision-history-top"><span class="mini-label">PRODUCT DECISION · ${date(d.createdAt)}</span><span class="draft-chip ${d.reviewedAt ? 'reviewed' : ''}">${d.reviewedAt ? 'PRD reviewed' : 'PRD needs review'}</span></div><h3>${esc(d.opportunity.title)}</h3><p>${esc(d.rationale)}</p><div class="decision-history-footer"><span>${d.opportunity.documentCount} source documents · ${scoreText(d.opportunity)} · Ralph Ugboko</span><button class="quiet-btn" data-open-decision="${esc(d.id)}">Open PRD →</button></div><details class="evidence-details"><summary>Read the evidence used for this decision</summary>${d.opportunity.evidence.map(e => `<div class="evidence-passage"><b>${esc(e.title)} · ${esc(e.location)}</b><blockquote>${esc(e.text)}</blockquote></div>`).join('')}</details></article>`).join('') : '<div class="empty-state"><h3>No product decisions yet</h3><p>After reviewing opportunities, choose one and save your rationale. The decision and its evidence will appear here.</p><a class="primary-btn link-btn" href="#workflow">Start a product review →</a></div>';
  }
  function navigate() {
    const requested = location.hash.slice(1); route = ['overview','workflow','research','decisions'].includes(requested) ? requested : 'workflow';
    $$('.workspace-view').forEach(view => view.classList.toggle('hidden', view.id !== `view-${route}`));
    $$('.nav-item').forEach(link => { const active = link.getAttribute('href') === `#${route}`; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
    const labels = { overview: ['Project overview','See where the onboarding review stands and pick up your next step.'], workflow: ['Product workflow','Choose transcripts → review opportunities → make a decision → review a PRD.'], research: ['Research library','Keep the original interviews close. Add documents and inspect the full conversation.'], decisions: ['Decision log','See what was chosen, why it was chosen, and the evidence behind each product decision.'] };
    $('#page-title').textContent = labels[route][0]; $('#page-description').textContent = labels[route][1];
    if (route === 'workflow') goStep(ready(state.step) ? state.step : 1, false);
    if (route === 'overview') renderOverview();
    if (route === 'research') renderDocuments($('#research-documents'), false);
    if (route === 'decisions') renderDecisions();
  }

  async function importFiles(files) {
    if (busy) return;
    busy = true; updateSelection();
    const supported = [...files].filter(file => /\.(txt|pdf|docx|csv)$/i.test(file.name)).slice(0, 30);
    if (!supported.length) { busy = false; updateSelection(); toast('Choose TXT, PDF, DOCX, or CSV files. Save legacy DOC files as DOCX.'); return; }
    const errors = []; let changes = 0, duplicates = 0;
    $('#footer-status').textContent = 'Reading transcript files…';
    for (const file of supported) {
      try {
        const doc = await PilotIngest.readFile(file);
        const existing = state.documents.findIndex(item => item.origin !== 'Bundled research library' && item.path === doc.path);
        if (existing >= 0 && state.documents[existing].text === doc.text) { duplicates++; continue; }
        if (existing >= 0) { doc.id = state.documents[existing].id; state.documents[existing] = doc; }
        else state.documents.unshift(doc);
        state.included = [...new Set([...state.included, doc.id])]; changes++;
      } catch (error) { errors.push(`${file.name}: ${error.message}`); }
    }
    if (changes) { invalidate(); log(`Imported or updated ${changes} transcript${changes === 1 ? '' : 's'}.`); }
    busy = false; save(); navigate(); updateSelection(); $('#footer-status').textContent = 'Research → decision → reviewed PRD';
    if (errors.length) openDialog('File import results', `<p>${changes} imported or updated; ${duplicates} unchanged.</p><ul class="import-errors">${errors.map(error => `<li>${esc(error)}</li>`).join('')}</ul><p>TXT and DOCX preserve text; PDFs must have selectable text.</p>`);
    else toast(changes ? `${changes} transcript${changes === 1 ? '' : 's'} added or updated. Analyze them in Product workflow.` : 'No document changes found.');
  }

  async function refreshLibrary() {
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
    finally { button.disabled = false; button.textContent = 'Refresh library'; }
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('button, a'); if (!target) return;
    if (target.matches('[data-close]')) target.closest('dialog').close();
    if (target.matches('[data-guide]')) showGuide();
    if (target.matches('[data-source-details], #source-details-top')) showSourceDetails();
    if (target.matches('[data-upload]')) $('#transcript-files').click();
    if (target.matches('[data-folder]')) $('#transcript-folder').click();
    if (target.matches('[data-paste]')) $('#paste-dialog').showModal();
    if (target.matches('[data-doc]')) showDocument(target.dataset.doc);
    if (target.matches('[data-quote]')) { const passage = state.analysis?.records.find(e => e.id === target.dataset.quote); if (passage) showDocument(passage.docId, passage.text); }
    if (target.matches('[data-step]')) goStep(Number(target.dataset.step));
    if (target.matches('[data-back]')) goStep(Number(target.dataset.back));
    if (target.matches('[data-open-decision]')) { state.draft = structuredClone(state.decisions.find(d => d.id === target.dataset.openDecision)); state.step = 4; location.hash = '#workflow'; navigate(); }
  });
  $('#transcript-files').onchange = event => { importFiles(event.target.files); event.target.value = ''; };
  $('#transcript-folder').onchange = event => { importFiles(event.target.files); event.target.value = ''; };
  $('#paste-form').onsubmit = event => {
    event.preventDefault(); const title = $('#transcript-title').value.trim(), text = $('#transcript-text').value.trim(); if (!title || !text) return;
    if (text.length > 250000) { toast('Split this transcript into documents under 250,000 characters.'); return; }
    const doc = { id: `DOC-${crypto.randomUUID()}`, file: `${title}.txt`, title, format: 'TXT', text, modified: now(), owner: 'Added by Ralph Ugboko', origin: 'Pasted transcript', path: `Manual transcripts / ${title}.txt` };
    state.documents.unshift(doc); state.included.push(doc.id); invalidate(); log(`Added transcript: ${title}.`); save(); event.target.reset(); $('#paste-dialog').close(); navigate(); toast('Transcript added. Analyze it in Product workflow.');
  };
  const drop = $('#drop-zone');
  ['dragenter','dragover'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.remove('dragging'); }));
  drop.addEventListener('drop', event => importFiles(event.dataTransfer.files));
  $('#refresh-library').onclick = refreshLibrary;
  $('#analyze-btn').onclick = () => {
    if (busy || !selectedDocs().length) return;
    state.analysis = PilotDomain.synthesize(selectedDocs()); state.comparison = state.analysis.opportunities.map(o => o.id); state.chosen = null; state.rationale = ''; state.draft = null;
    log(`Analyzed ${state.analysis.sourceIds.length} transcripts; identified ${state.analysis.opportunities.length} candidate opportunities.`); goStep(2);
  };
  $('#opportunity-list').onchange = event => {
    if (!event.target.matches('[data-compare]')) return;
    const id = event.target.dataset.compare; state.comparison = event.target.checked ? [...new Set([...state.comparison,id])] : state.comparison.filter(item => item !== id);
    if (!state.comparison.includes(state.chosen)) state.chosen = null;
    state.draft = null; save(); renderOpportunities(); updateSteps();
  };
  $('#opportunity-list').oninput = event => { if (!event.target.matches('[data-opp]')) return; const o = state.analysis.opportunities.find(item => item.id === event.target.dataset.opp); o[event.target.dataset.field] = event.target.value; if (event.target.dataset.field === 'title') event.target.closest('.opportunity-card').querySelector('.opp-title').textContent = event.target.value; state.draft = null; updateSteps(); save(); };
  $('#to-prioritize').onclick = () => goStep(3);
  $('#priority-list').oninput = event => {
    if (!event.target.matches('[data-rice]')) return;
    const o = candidates().find(item => item.id === event.target.dataset.rice); o.rice[event.target.dataset.field] = event.target.value; state.draft = null;
    $(`[data-score="${o.id}"]`).textContent = scoreText(o); save(); updateSteps();
  };
  $('#priority-list').onchange = event => { if (!event.target.matches('[data-choose]')) return; state.chosen = event.target.dataset.choose; state.draft = null; $$('[data-priority]').forEach(card => card.classList.toggle('winner', card.dataset.priority === state.chosen)); updateChoice(); updateSteps(); save(); };
  $('#decision-rationale').oninput = event => { state.rationale = event.target.value; state.draft = null; updateSteps(); save(); };
  $('#approve-decision').onclick = () => {
    const o = chosen(); if (!o) return;
    if (!o.title.trim() || !o.problem.trim()) { toast('Add an opportunity title and problem statement before saving.'); return; }
    if (!state.rationale.trim()) { toast('Write a short reason for choosing this opportunity.'); $('#decision-rationale').focus(); return; }
    const invalid = [...$('#priority-list').querySelectorAll(`[data-rice="${o.id}"]`)].find(input => input.value !== '' && !input.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    state.draft = { id: crypto.randomUUID(), createdAt: now(), opportunity: structuredClone(o), rationale: state.rationale.trim(), fields: PilotDomain.draft(o, state.rationale.trim()), reviewedAt: null };
    state.decisions.unshift(structuredClone(state.draft)); log(`Saved product decision: ${o.title}.`); goStep(4);
  };
  $('#prd-fields').oninput = event => {
    if (!event.target.matches('[data-prd]') || !state.draft) return;
    state.draft.fields.find(field => field.key === event.target.dataset.prd).value = event.target.value; state.draft.reviewedAt = null; $('#review-confirm').checked = false; updateDraftHistory(); updateReviewStatus(); save();
  };
  $('#review-confirm').onchange = updateReviewStatus;
  $('#mark-reviewed').onclick = () => {
    if (!state.draft || !$('#review-confirm').checked) return;
    if (state.draft.fields.some(field => ['title','problem','decision','solution'].includes(field.key) && !field.value.trim())) { toast('Complete the title, problem, rationale, and solution before marking the PRD reviewed.'); return; }
    state.draft.reviewedAt = now(); updateDraftHistory(); log(`Reviewed PRD: ${state.draft.opportunity.title}.`); updateReviewStatus(); save(); toast('PRD reviewed. The decision log is updated.');
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
  $('#new-review').onclick = () => { invalidate(); log('Started a new product review. Source documents and saved decisions retained.'); goStep(1); toast('New review started. Your documents and previous decisions are retained.'); };
  window.addEventListener('hashchange', navigate);
  updateSelection(); navigate(); save();
})();

