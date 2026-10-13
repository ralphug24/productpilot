(function () {
  'use strict';
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const MAX_TEXT = 250000;
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); if (row.some(x => x.trim())) rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (quoted) throw new Error('The CSV has an unclosed quoted field.');
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  async function readFile(file) {
    if (file.size > MAX_FILE_BYTES) throw new Error('Use a file smaller than 10 MB.');
    const extension = file.name.split('.').pop().toLowerCase();
    let text = '', sections;
    if (extension === 'txt') text = await file.text();
    else if (extension === 'csv') {
      const rows = parseCSV(await file.text());
      const column = rows[0]?.findIndex(h => /^(feedback|message|text|comment|response|review)$/i.test(h.trim()));
      if (column == null || column < 0) throw new Error('CSV needs a feedback, message, text, comment, response, or review column.');
      text = rows.slice(1).map(row => row[column]?.trim()).filter(Boolean).join('\n');
    } else if (extension === 'docx') {
      if (!globalThis.JSZip) throw new Error('The local Word reader is unavailable. Reload the page.');
      const archive = await JSZip.loadAsync(await file.arrayBuffer());
      const entry = archive.file('word/document.xml');
      if (!entry) throw new Error('This file is not a readable DOCX document.');
      const xml = new DOMParser().parseFromString(await entry.async('string'), 'application/xml');
      if (xml.getElementsByTagName('parsererror').length) throw new Error('The DOCX document contains invalid XML.');
      text = Array.from(xml.getElementsByTagNameNS('*', 'p')).map(p => Array.from(p.getElementsByTagNameNS('*', 't')).map(t => t.textContent).join('')).filter(Boolean).join('\n');
    } else if (extension === 'pdf') {
      if (!globalThis.pdfjsLib) throw new Error('The local PDF reader is unavailable. Reload the page.');
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useWorkerFetch: false, isEvalSupported: false }).promise;
      try {
        if (pdf.numPages > 100) throw new Error('Use a PDF with 100 pages or fewer.');
        sections = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const pageText = content.items.filter(item => typeof item.str === 'string').map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('').trim();
          sections.push({ page: pageNumber, text: pageText });
          page.cleanup();
        }
        text = sections.map(s => s.text).join('\n\n');
      } finally { await pdf.destroy(); }
      if (!text.trim()) throw new Error('This PDF has no selectable text. Export a text PDF, TXT, or DOCX transcript; scanned PDFs need OCR.');
    } else if (extension === 'doc') throw new Error('Save legacy Word .doc files as .docx first.');
    else throw new Error('Supported formats: TXT, PDF, DOCX, and CSV.');
    text = text.replace(/\u0000/g, '').trim();
    if (!text) throw new Error('No readable transcript text was found.');
    if (text.length > MAX_TEXT) throw new Error('The extracted transcript exceeds 250,000 characters. Split it into smaller documents.');
    return { id: `DOC-${crypto.randomUUID()}`, file: file.name, title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), format: extension.toUpperCase(), text, ...(sections ? { sections } : {}), modified: new Date(file.lastModified || Date.now()).toISOString(), owner: 'Imported on this device', origin: file.webkitRelativePath ? 'Selected source folder' : 'File upload', path: file.webkitRelativePath || file.name };
  }
  globalThis.PilotIngest = { parseCSV, readFile };
})();
