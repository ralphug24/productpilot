import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
await import('./domain.js');
await import('./ingest.js');
const manifest = JSON.parse(await readFile(new URL('./research/manifest.json', import.meta.url), 'utf8'));
const docs = await Promise.all(manifest.documents.map(async doc => ({ ...doc, text: await readFile(new URL(`./research/${doc.file}`, import.meta.url), 'utf8') })));

test('opportunities preserve exact source passages and exclude interviewer prompts', () => {
  const result = PilotDomain.synthesize(docs);
  assert.ok(result.opportunities.length >= 3);
  for (const opportunity of result.opportunities) {
    assert.equal(opportunity.documentCount, new Set(opportunity.evidence.map(e => e.docId)).size);
    for (const passage of opportunity.evidence) {
      assert.ok(docs.find(doc => doc.id === passage.docId).text.includes(passage.text));
      assert.match(passage.text, /Participant:/);
    }
  }
});
test('same document count with different contents produces different analysis', () => {
  const first = PilotDomain.synthesize([{ id: 'one', file: 'one.txt', text: 'Participant: The verification link expired and I could not access my account.' }]);
  const second = PilotDomain.synthesize([{ id: 'one', file: 'one.txt', text: 'Participant: My progress was not saved. I had to restart the long setup form.' }]);
  assert.ok(first.opportunities.some(o => o.id === 'access'));
  assert.ok(!second.opportunities.some(o => o.id === 'access'));
  assert.ok(second.opportunities.some(o => o.id === 'continuity'));
});
test('missing or invalid RICE estimates remain unknown', () => {
  assert.equal(PilotDomain.score({ reach: '', impact: 2, confidence: '', effort: '' }), null);
  assert.equal(PilotDomain.score({ reach: 100, impact: 2, confidence: 50, effort: 0 }), null);
  assert.equal(PilotDomain.score({ reach: 100, impact: 2, confidence: 101, effort: 3 }), null);
  assert.equal(PilotDomain.score({ reach: 100, impact: 2, confidence: 50, effort: 4 }), 25);
});
test('draft requirements follow the explicitly chosen opportunity', () => {
  const opportunity = PilotDomain.synthesize(docs).opportunities.find(o => o.id === 'continuity');
  const fields = PilotDomain.draft(opportunity, 'Interrupted sessions create repeated work.');
  assert.equal(fields.find(f => f.key === 'decision').value, 'Interrupted sessions create repeated work.');
  assert.match(fields.find(f => f.key === 'solution').value, /saved onboarding state/);
  assert.doesNotMatch(fields.find(f => f.key === 'criteria').value, /expired link/);
  assert.match(fields.find(f => f.key === 'metrics').value, /Baseline: not yet established/);
});
test('unmatched text does not generate a fabricated onboarding opportunity', () => {
  assert.equal(PilotDomain.synthesize([{ id: 'other', text: 'Participant: I enjoy the cafeteria and the office seating arrangements.' }]).opportunities.length, 0);
});
test('CSV handles embedded commas, escaped quotes, and multiline feedback', () => {
  assert.deepEqual(PilotIngest.parseCSV('feedback,id\r\n"A, B",1\r\n"He said ""hello""\nthen left",2'), [['feedback','id'],['A, B','1'],['He said "hello"\nthen left','2']]);
  assert.throws(() => PilotIngest.parseCSV('feedback\n"unclosed'), /unclosed/);
});
test('text import uses actual file contents and metadata', async () => {
  const doc = await PilotIngest.readFile({ name: 'interview.txt', size: 50, lastModified: 12345, text: async () => 'Participant: The form did not save my progress.' });
  assert.equal(doc.format, 'TXT');
  assert.equal(doc.text, 'Participant: The form did not save my progress.');
  assert.equal(doc.modified, new Date(12345).toISOString());
});
