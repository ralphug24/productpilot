(function () {
  'use strict';
  const definitions = [
    { id: 'access', title: 'Make account verification easier to complete', pattern: /verif|expired|password|spam|replacement link/i, problem: 'The cited interview passages describe friction or uncertainty during account verification.', proposal: 'Make verification status visible and provide a clear recovery path for missing or expired messages.', requirements: 'Show the destination email and current verification status.\nProvide an accessible way to request a replacement message.\nExplain expired-link errors and the next action.', criteria: 'A user can identify the email address used for verification.\nAn expired link leads to a clear recovery action.\nSuccessful verification shows confirmation and the next setup step.', metric: 'Verification completion rate; recovery completion rate; verification-related support contacts.' },
    { id: 'continuity', title: 'Let customers pause and resume onboarding', pattern: /save|saved|resume|repeat|restart|timed out|progress|remaining steps/i, problem: 'The cited interview passages describe lost progress, repeated work, or uncertainty about remaining setup steps.', proposal: 'Provide a saved onboarding state and a clear checklist so a customer can return to unfinished setup.', requirements: 'Retain completed answers according to an agreed retention policy.\nShow completed and remaining setup steps.\nOffer a visible way to continue an unfinished session.', criteria: 'Returning users can continue from the last completed step.\nSaved answers remain editable.\nThe checklist reflects actual completion and provides a clear next action.', metric: 'Onboarding completion rate; resumed-session completion rate; repeated-entry complaints.' },
    { id: 'clarity', title: 'Clarify requirements and how personal data is used', pattern: /required|optional|why.{0,40}(information|birth)|privacy|shared|plain language|explain.{0,60}(purpose|requirements)|personal details|sensitive field/i, problem: 'The cited interview passages describe uncertainty about requested information, requirements, or how personal data is used.', proposal: 'Explain why information is requested and distinguish required fields from optional ones.', requirements: 'Label required and optional fields consistently.\nExplain the purpose of sensitive fields at the point of entry.\nReview the wording with the privacy owner and accessibility reviewer.', criteria: 'Users can distinguish required from optional information before submission.\nA purpose explanation is available for agreed sensitive fields.\nThe published explanation matches the actual data-handling policy.', metric: 'Completion at sensitive-information steps; clarification-related support contacts; user comprehension in a usability study.' },
    { id: 'flexibility', title: 'Make profile correction and reuse easier', pattern: /edit|change|upload|reused|reuse|wrong phone|contact details again/i, problem: 'The cited interview passages describe difficulty correcting or reusing information during setup.', proposal: 'Allow customers to correct existing answers and reuse verified profile information where appropriate.', requirements: 'Make editable profile fields discoverable.\nPreserve unrelated answers when a field changes.\nIdentify fields that can be reused during booking.', criteria: 'A user can correct an eligible field without restarting setup.\nPreviously completed answers are preserved after a correction.\nReused details remain visible and editable where permitted.', metric: 'Successful profile corrections; repeated-entry rate; correction-related support contacts.' }
  ];

  function excerpts(documents) {
    return documents.flatMap(doc => {
      const sections = doc.sections?.length ? doc.sections : [{ text: doc.text }];
      return sections.flatMap((section, pageIndex) => {
        const lines = section.text.split(/\r?\n/).map((text, line) => ({ text: text.trim(), line: line + 1 })).filter(x => x.text);
        const participantLabel = /(?:^|\])\s*(?:participant(?:\s+p?\d+)?|p\d+|(?:customer|respondent|user)(?:\s+\d+)?)\s*:\s*\S/i;
        const participants = lines.filter(x => participantLabel.test(x.text));
        const candidates = participants.length ? participants : lines.filter(x => x.text.length > 35 && !/(?:^|\])\s*(?:interviewer|moderator|researcher|facilitator)\s*:/i.test(x.text));
        return candidates.flatMap((x, index) => {
          const chunks = [];
          for (let offset = 0; offset < x.text.length; offset += 1600) {
            const text = x.text.slice(offset, offset + 1600);
            const timestamp = text.match(/^\[([^\]]+)\]/)?.[1];
            chunks.push({ id: `${doc.id}-${pageIndex + 1}-${index}-${offset}`, docId: doc.id, text, location: section.page ? `Page ${section.page}` : timestamp ? `At ${timestamp}` : `Line ${x.line}`, filename: doc.file, title: doc.title, modified: doc.modified, path: doc.path });
          }
          return chunks;
        });
      });
    });
  }

  function synthesize(documents) {
    const records = excerpts(documents);
    const opportunities = definitions.map(def => {
      const evidence = records.filter(record => def.pattern.test(record.text));
      if (!evidence.length) return null;
      return { id: def.id, title: def.title, problem: def.problem, evidence, documentCount: new Set(evidence.map(e => e.docId)).size, rice: { reach: '', impact: 2, confidence: '', effort: '' }, proposal: def.proposal, requirements: def.requirements, criteria: def.criteria, metric: def.metric };
    }).filter(Boolean);
    return { opportunities, records, sourceIds: documents.map(doc => doc.id) };
  }

  function score(rice) {
    if (['reach', 'impact', 'confidence', 'effort'].some(key => rice[key] === '' || rice[key] == null)) return null;
    const { reach, impact, confidence, effort } = Object.fromEntries(Object.entries(rice).map(([k, v]) => [k, Number(v)]));
    if (![reach, impact, confidence, effort].every(Number.isFinite) || reach < 0 || !Number.isInteger(reach) || impact < 1 || impact > 3 || !Number.isInteger(impact) || confidence < 1 || confidence > 100 || !Number.isInteger(confidence) || effort < 0.1 || Math.abs(effort * 10 - Math.round(effort * 10)) > 0.000001) return null;
    return reach * impact * confidence / 100 / effort;
  }
  function formatScore(value) {
    if (value == null) return 'Not estimated';
    if (value !== 0 && Math.abs(value) < 0.0001) return value.toExponential(2);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value);
  }

  function draft(opportunity, rationale) {
    const sources = opportunity.evidence.map(e => `${e.docId} · ${e.filename} · ${e.location}${e.modified ? ` · Source version: ${e.modified}` : ''}: “${e.text}”`).join('\n\n');
    return [
      { key: 'title', label: 'PRD title', value: opportunity.title, kind: 'Decision' },
      { key: 'problem', label: 'Customer problem & evidence', value: `${opportunity.problem}\n\nSupported by ${opportunity.documentCount} source documents.\n\n${sources}`, kind: 'Source quotes included' },
      { key: 'decision', label: 'Decision rationale', value: rationale, kind: 'Your decision' },
      { key: 'solution', label: 'Proposed solution', value: opportunity.proposal, kind: 'Proposal · confirm with team' },
      { key: 'requirements', label: 'Requirements & user story', value: `User story to refine: As a [customer segment], I want [capability that addresses this problem] so that [desired customer outcome].\n\n${opportunity.requirements}`, kind: 'Draft requirements' },
      { key: 'criteria', label: 'Acceptance criteria', value: opportunity.criteria, kind: 'Draft criteria' },
      { key: 'metrics', label: 'Success metrics & measurement', value: `${opportunity.metric}\n\nBaseline: not yet established.\nTarget: to be agreed after baseline measurement.\nEvaluation: confirm instrumentation and an appropriate evaluation plan with analytics.`, kind: 'Baseline & target needed' },
      { key: 'scope', label: 'Scope, dependencies & open questions', value: `Scope: the selected product opportunity.\nConfirm: engineering estimate, accessibility requirements, data retention, and relevant privacy constraints.\nOpen questions: which user segment is affected, how frequent is the issue, what instrumentation exists, and what trade-offs remain?\n${opportunity.openQuestions?.length ? `Additional questions:\n${opportunity.openQuestions.join('\n')}\n` : ''}${opportunity.assumptions?.length ? `Assumptions requiring confirmation:\n${opportunity.assumptions.join('\n')}\n` : ''}Evidence limits: these interviews describe experiences; they do not establish population frequency or causal product impact.`, kind: 'Review needed' }
    ];
  }

  globalThis.PilotDomain = { excerpts, synthesize, score, formatScore, draft };
})();
