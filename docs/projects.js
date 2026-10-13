(function () {
  'use strict';
  const key = 'productpilot-projects-v3';
  const clone = value => structuredClone(value);
  const timestamp = () => new Date().toISOString();
  function create(name, objective, documents = [], focus = 'general') {
    return { id: crypto.randomUUID(), name, objective, focus, documents: clone(documents), included: documents.map(d => d.id), opportunities: [], analysis: null, comparison: [], chosen: null, rationale: '', draft: null, decisions: [], activity: [], step: 1, checkedAt: timestamp(), createdAt: timestamp() };
  }
  function retain(project, opportunities, method = 'Rules baseline') {
    project.opportunities ||= [];
    return opportunities.map(incoming => {
      const existing = project.opportunities.find(o => o.id === incoming.id);
      const opportunity = { ...clone(incoming), createdAt: existing?.createdAt || timestamp(), updatedAt: timestamp(), status: existing?.status || 'needs_review', notes: existing?.notes || '', method, rice: clone(existing?.rice || incoming.rice) };
      if (existing?.edited) Object.assign(opportunity, { title: existing.title, problem: existing.problem, edited: true });
      if (existing) Object.assign(existing, opportunity); else project.opportunities.push(opportunity);
      return existing || opportunity;
    });
  }
  function normalize(project) {
    project.opportunities ||= [];
    // Previously saved reviews become a project without discarding their drafts.
    for (const decision of [...(project.decisions || [])].reverse()) {
      if (!project.opportunities.some(o => o.id === decision.opportunity.id)) {
        const [opportunity] = retain(project, [decision.opportunity], decision.method || 'Rules baseline');
        opportunity.status = 'prioritized';
      }
      decision.projectName ||= project.name;
      decision.projectId ||= project.id;
    }
    if (project.analysis) project.analysis.opportunities = project.analysis.opportunities.map(opportunity => project.opportunities.find(o => o.id === opportunity.id) || retain(project, [opportunity], project.analysis.method || 'Rules baseline')[0]);
    if (project.draft) { project.draft.projectName ||= project.name; project.draft.projectId ||= project.id; }
    return project;
  }
  function load(storage, documents) {
    let saved;
    try { saved = JSON.parse(storage.getItem(key)); } catch { /* recover from the previous workspace below */ }
    if (saved?.version === 3 && saved.projects?.length) {
      saved.projects.forEach(normalize);
      if (!saved.projects.some(p => p.id === saved.activeProjectId)) saved.activeProjectId = saved.projects[0].id;
      return saved;
    }
    const project = create('Onboarding experience', 'Improve onboarding using customer interview evidence.', documents, 'onboarding');
    let legacy;
    try { legacy = JSON.parse(storage.getItem('productpilot-workspace-v2')); } catch { /* start from the included research */ }
    if (legacy?.version === 2 && Array.isArray(legacy.documents)) {
      for (const field of ['documents','included','analysis','comparison','chosen','rationale','draft','decisions','activity','step','checkedAt']) if (field in legacy) project[field] = clone(legacy[field]);
    }
    normalize(project);
    return { version: 3, activeProjectId: project.id, projects: [project] };
  }
  function persist(storage, workspace) { storage.setItem(key, JSON.stringify(workspace)); }
  function activateBacklog(project, id) {
    const opportunity = project.opportunities.find(o => o.id === id);
    if (!opportunity) return;
    const current = project.analysis?.opportunities || [];
    if (!current.some(o => o.id === id)) current.push(opportunity);
    project.analysis = { ...(project.analysis || {}), opportunities: current, records: current.flatMap(o => o.evidence), sourceIds: [...new Set(current.flatMap(o => o.evidence.map(e => e.docId)))] };
    project.comparison = [...new Set([...project.comparison, id])];
    project.step = 3;
  }
  globalThis.PilotProjects = { create, load, persist, retain, activateBacklog };
})();
