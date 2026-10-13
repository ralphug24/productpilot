import test from 'node:test';
import assert from 'node:assert/strict';
const { default: JSZip } = await import('./vendor/jszip.min.js');
globalThis.JSZip = JSZip;
await import('./domain.js');
await import('./prd-export.js');
const evidence = { docId: 'INT-001', filename: 'interview.txt', title: 'Interview one', location: 'At 01:20', modified: '2026-10-08T14:20:00-04:00', text: 'Participant: I could not resume setup after it timed out.' };
function fixture() {
  const opportunity = { title: 'Let customers resume onboarding', problem: 'Customers described lost progress.', documentCount: 1, evidence: [evidence], proposal: 'Save completed answers.', requirements: 'Retain completed answers.\nShow the next unfinished step.', criteria: 'Saved answers remain editable.\nA returning user can resume setup.', metric: 'Resumed-session completion rate.' };
  return { createdAt: '2026-10-12T17:00:00-04:00', reviewedAt: null, opportunity, fields: PilotDomain.draft(opportunity, 'Repeated work prevents customers from finishing setup.') };
}
test('export is a genuine DOCX package with headings, bullets, and page fields', async () => {
  const archive = PilotPrdExport.buildPackage(fixture());
  const bytes = await archive.generateAsync({ type: 'uint8array' });
  const reloaded = await JSZip.loadAsync(bytes);
  for (const name of ['[Content_Types].xml','_rels/.rels','word/document.xml','word/styles.xml','word/numbering.xml','word/footer1.xml','word/_rels/document.xml.rels']) assert.ok(reloaded.file(name), name);
  const content = await reloaded.file('word/document.xml').async('string');
  assert.match(content, /w:pStyle w:val="Title"/);
  assert.match(content, /w:pStyle w:val="Heading1"/);
  assert.match(content, /w:numPr/);
  assert.match(content, /Draft — needs review/);
  assert.match(await reloaded.file('word/footer1.xml').async('string'), /w:instr="PAGE"/);
});
test('source quotes move to an appendix and edited body content is preserved', async () => {
  const draft = fixture();
  const problem = draft.fields.find(field => field.key === 'problem');
  problem.value += '\n\nPM note: prioritize interrupted sessions & cross-device access.';
  const content = await PilotPrdExport.buildPackage(draft).file('word/document.xml').async('string');
  const appendixIndex = content.indexOf('Appendix A Source evidence');
  assert.ok(appendixIndex > 0);
  assert.ok(content.indexOf(evidence.text) > appendixIndex);
  assert.equal(content.split(evidence.text).length - 1, 1);
  assert.match(content.slice(0, appendixIndex), /PM note:.*&amp; cross-device access/);
  assert.match(content, /interview.txt/);
  assert.match(content, /At 01:20/);
});
test('export retains reviewed status, custom sections, and safely escapes user text', async () => {
  const draft = fixture(); draft.reviewedAt = '2026-10-12T18:00:00-04:00';
  draft.fields[0].value = 'Setup <requirements> & "review"';
  draft.fields.push({ key: 'risk', label: 'Risks', value: 'Preserve user edits <exactly> & include dependencies.' });
  const content = await PilotPrdExport.buildPackage(draft).file('word/document.xml').async('string');
  assert.match(content, /Setup &lt;requirements&gt; &amp; &quot;review&quot;/);
  assert.match(content, /Preserve user edits &lt;exactly&gt; &amp; include dependencies/);
  assert.match(content, /<w:t xml:space="preserve">Reviewed<\/w:t>/);
  assert.doesNotMatch(content, /Draft — needs review/);
  assert.match(PilotPrdExport.filename(draft), /^ravugo-consulting-llc-.*\.docx$/);
});
test('previously saved drafts with older citation formatting still get a clean main body', () => {
  const source = `${evidence.docId} · ${evidence.location}: “${evidence.text}”`;
  assert.equal(PilotPrdExport.mainProblem(`Edited problem statement.\n\n${source}\n\nA decision note.`, [evidence]), 'Edited problem statement.\n\nA decision note.');
});
