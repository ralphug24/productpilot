(function () {
  'use strict';
  const endpoint = 'https://productpilot-api.ralphugboko.workers.dev/api/productpilot';
  let available = false;
  let session;
  try { session = localStorage.getItem('productpilot-ai-session'); if (!session) { session = crypto.randomUUID(); localStorage.setItem('productpilot-ai-session', session); } }
  catch { session = crypto.randomUUID(); }
  async function request(path, data) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch(`${endpoint}/${path}`, { method: data ? 'POST' : 'GET', headers: data ? {'Content-Type':'application/json','X-Pilot-Session':session} : {}, body: data ? JSON.stringify(data) : undefined, signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The AI service could not complete this request.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('AI took too long. Your existing research and backlog are retained; no automatic retry was made.');
      if (error instanceof TypeError) throw new Error('AI could not be reached. Use the local rules or try again later.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  async function connect() {
    const analysis = document.querySelector('#analysis-mode'), drafting = document.querySelector('#draft-mode');
    const description = document.querySelector('#ai-status');
    try {
      const status = await request('status'); available = !!status.available;
      analysis.querySelector('[value="ai"]').disabled = !available;
      drafting.querySelector('[value="ai"]').disabled = !available;
      analysis.querySelector('[value="ai"]').textContent = available ? 'AI research synthesis · Cloudflare Workers AI' : 'AI unavailable · use local rules or manual review';
      drafting.querySelector('[value="ai"]').textContent = available ? 'AI requirements draft · Cloudflare Workers AI' : 'AI unavailable · use starter template';
      description.textContent = available ? `Cloudflare Workers AI connected · ${status.modelLabel}. Opportunities require your evidence review. Shared free allowance may limit availability.` : 'Live AI is unavailable. Onboarding rules run locally; you can also add evidence-backed opportunities manually in the backlog.';
      if (available) { analysis.value = 'ai'; drafting.value = 'ai'; }
    } catch {
      description.textContent = 'Live AI is currently unreachable. Onboarding rules run locally; add other opportunities manually in the backlog.';
      analysis.querySelector('[value="ai"]').textContent = 'AI unavailable · service unreachable';
      drafting.querySelector('[value="ai"]').textContent = 'AI unavailable · use starter template';
    }
    updateMode();
  }
  function updateMode() {
    document.querySelector('#ai-disclosure').classList.toggle('hidden', document.querySelector('#analysis-mode').value !== 'ai');
    document.querySelector('#draft-method-note').textContent = document.querySelector('#draft-mode').value === 'ai' ? 'Sends the selected opportunity’s evidence, your rationale, and objective to Cloudflare Workers AI. Proposed sections still need review.' : 'Template sections are proposed requirements, not research findings.';
  }
  async function analyze(project, documents) {
    if (!available) throw new Error('Live AI is not available. Choose the rules method or add an opportunity manually.');
    const records = PilotDomain.excerpts(documents);
    if (!records.length) throw new Error('No customer passages were extracted. Check the selected transcripts.');
    return request('analyze', {project: {name:project.name, objective:project.objective}, records});
  }
  async function draft(project, opportunity, rationale, starter) {
    if (!available) throw new Error('Live AI is not available. Choose the starter template.');
    const result = await request('draft', {project:{name:project.name,objective:project.objective}, opportunity:{title:opportunity.title,problem:opportunity.problem,evidence:opportunity.evidence}, rationale});
    return starter.map(field => result.fields[field.key] ? {...field, value:result.fields[field.key], kind:'AI proposal · confirm with team'} : field);
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#analysis-mode').addEventListener('change', updateMode);
    document.querySelector('#draft-mode').addEventListener('change', updateMode);
  });
  globalThis.PilotAI = { connect, analyze, draft };
})();
