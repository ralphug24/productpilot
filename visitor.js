(function () {
  'use strict';
  const key = 'productpilot-visitor-v1';
  const clean = name => String(name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const fresh = name => ({ id: crypto.randomUUID(), name: clean(name) || 'Guest visitor', introduced: !!clean(name) });
  function load(storage) {
    let visitor;
    try { visitor = JSON.parse(storage.getItem(key)); } catch { /* create a local visitor */ }
    if (!visitor || !/^[a-f0-9-]{36}$/.test(visitor.id || '') || !clean(visitor.name)) visitor = fresh();
    visitor.name = clean(visitor.name);
    try { save(storage,visitor); } catch { /* session-only identity */ }
    return visitor;
  }
  function save(storage, visitor) { storage.setItem(key,JSON.stringify(visitor)); }
  const initials = name => clean(name).split(' ').slice(0,2).map(part => [...part][0]?.toUpperCase() || '').join('');
  globalThis.PilotVisitor = { load, save, fresh, clean, initials };
})();
