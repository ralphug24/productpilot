(function () {
  'use strict';
  const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const xml = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const date = value => {
    if (!value || !Number.isFinite(new Date(value).getTime())) return 'Not recorded';
    return new Date(value).toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  const run = (text, bold = false) => `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
  function paragraph(text, style = 'Normal', options = {}) {
    const props = `<w:pStyle w:val="${style}"/>${options.bullet ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ''}${options.pageBreak ? '<w:pageBreakBefore/>' : ''}${options.keep ? '<w:keepLines/>' : ''}`;
    const prefix = options.prefix ? String(text).match(/^([^:\n]{1,60}:)(\s*)([\s\S]*)$/) : null;
    return `<w:p><w:pPr>${props}</w:pPr>${prefix ? run(prefix[1], true) + run(prefix[2] + prefix[3]) : run(text)}</w:p>`;
  }
  function bodyParagraphs(value, list = false) {
    return String(value ?? '').replace(/\r\n?/g, '\n').split(/\n+/).filter(line => line.trim()).map(line => {
      const text = line.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '').trim();
      const bullet = list && !/^As (?:a|an) /i.test(text);
      return paragraph(text, bullet ? 'ListParagraph' : 'Normal', { bullet, prefix: !bullet });
    }).join('');
  }
  function evidenceLine(e) {
    return `${e.docId} · ${e.filename} · ${e.location}${e.modified ? ` · Source version: ${e.modified}` : ''}: “${e.text}”`;
  }
  // Only relocate exact generated source blocks. Edited or additional prose stays intact.
  function mainProblem(value, evidence) {
    const original = new Set(evidence.flatMap(e => [evidenceLine(e), `${e.docId} · ${e.location}: “${e.text}”`, `${e.docId} · ${e.filename} · ${e.location}: “${e.text}”`]));
    return String(value ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).filter(block => !original.has(block.trim())).join('\n\n').trim();
  }
  function metadataTable(rows) {
    const cell = (text, width, label) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${label ? '<w:shd w:fill="F4F6F8"/>' : ''}</w:tcPr><w:p><w:pPr><w:pStyle w:val="Metadata"/></w:pPr>${run(text, label)}</w:p></w:tc>`;
    return `<w:tbl><w:tblPr><w:tblW w:w="10080" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="DDE3E9"/><w:left w:val="single" w:sz="4" w:color="DDE3E9"/><w:bottom w:val="single" w:sz="4" w:color="DDE3E9"/><w:right w:val="single" w:sz="4" w:color="DDE3E9"/><w:insideH w:val="single" w:sz="4" w:color="E5E9EE"/><w:insideV w:val="single" w:sz="4" w:color="E5E9EE"/></w:tblBorders><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="7680"/></w:tblGrid>${rows.map(([label, value]) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(label, 2400, true)}${cell(value, 7680, false)}</w:tr>`).join('')}</w:tbl>`;
  }
  function styles() {
    const heading = (id, name, size, before, outline) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${before}" w:after="140"/>${outline == null ? '' : `<w:outlineLvl w:val="${outline}"/>`}</w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="${size}"/></w:rPr></w:style>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="303A46"/><w:sz w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${heading('Title','Title',40,0,null)}${heading('Heading1','heading 1',28,320,0)}${heading('Heading2','heading 2',24,220,1)}<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="220"/></w:pPr><w:rPr><w:color w:val="000000"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Metadata"><w:name w:val="Metadata"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:color w:val="000000"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="100"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Evidence"><w:name w:val="Evidence"/><w:basedOn w:val="Normal"/><w:pPr><w:keepLines/><w:ind w:left="180"/><w:spacing w:after="180"/></w:pPr><w:rPr><w:sz w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="SourceMetadata"><w:name w:val="Source Metadata"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="90"/></w:pPr><w:rPr><w:sz w:val="18"/><w:color w:val="606A76"/></w:rPr></w:style></w:styles>`;
  }
  function buildPackage(draft) {
    if (!globalThis.JSZip) throw new Error('The Word export library is unavailable. Reload the page and try again.');
    if (!draft?.fields?.length) throw new Error('Save a product decision before downloading its PRD.');
    const fields = new Map(draft.fields.map(field => [field.key, String(field.value ?? '')]));
    const title = fields.get('title')?.trim() || draft.opportunity?.title || 'Product requirements';
    const evidence = draft.opportunity?.evidence || [];
    const reviewed = !!draft.reviewedAt;
    let body = paragraph('Ravugo Consulting LLC', 'Metadata') + paragraph(title, 'Title') + paragraph('Product requirements document', 'Subtitle');
    body += metadataTable([['Project', draft.projectName || 'Onboarding experience'], ['Status', reviewed ? 'Reviewed' : 'Draft — needs review'], ['Owner', 'Ralph Ugboko'], ['Decision saved', date(draft.createdAt)], ['Reviewed', reviewed ? date(draft.reviewedAt) : 'Pending human review']]);
    body += paragraph('This document records the selected product opportunity, the decision rationale, proposed requirements, and the questions to resolve before delivery. Product and engineering reviewers can use the source appendix to inspect the original interview passages.');
    const sections = [
      ['problem','Customer problem and evidence',false], ['decision','Product decision',false], ['solution','Proposed solution',false], ['requirements','Requirements and user story',true], ['criteria','Acceptance criteria',true], ['metrics','Success metrics and measurement',false], ['scope','Scope dependencies and open questions',false]
    ];
    for (const [key,label,list] of sections) {
      if (!fields.has(key)) continue;
      body += paragraph(label, 'Heading1');
      const value = key === 'problem' ? mainProblem(fields.get(key), evidence) : fields.get(key);
      body += value.trim() ? bodyParagraphs(value, list) : paragraph('Not yet specified.');
      if (key === 'problem' && evidence.length) body += paragraph('Original source passages are included in Appendix A.');
    }
    // Preserve future or custom sections instead of silently dropping them from the export.
    const known = new Set(['title', ...sections.map(([key]) => key)]);
    for (const field of draft.fields.filter(field => !known.has(field.key))) body += paragraph(field.label || 'Additional requirements', 'Heading1') + bodyParagraphs(field.value);
    if (evidence.length) {
      body += paragraph('Appendix A Source evidence', 'Heading1', { pageBreak: true });
      body += paragraph('These passages are the source snapshot retained with the product decision. IDs and locations let reviewers trace each quote back to its transcript.');
      const documents = new Map();
      for (const passage of evidence) {
        if (!documents.has(passage.docId)) documents.set(passage.docId, []);
        documents.get(passage.docId).push(passage);
      }
      for (const [id, passages] of documents) {
        body += paragraph(`${id} ${passages[0].title || passages[0].filename || 'Interview transcript'}`, 'Heading2');
        const source = passages[0];
        body += paragraph(`${source.filename || id}${source.path ? ` · ${source.path}` : ''}${source.modified ? ` · Source version ${date(source.modified)}` : ''}`, 'SourceMetadata');
        for (const passage of passages) body += paragraph(passage.location || 'Transcript passage', 'SourceMetadata') + paragraph(passage.text, 'Evidence', { keep: true });
      }
    }
    body += '<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="540" w:footer="540"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>';
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rIdCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}</w:body></w:document>`);
    zip.file('word/styles.xml', styles());
    zip.file('word/numbering.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="360"/></w:tabs><w:ind w:left="360" w:hanging="180"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>');
    zip.file('word/footer1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="16"/></w:rPr><w:t>Page </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>');
    zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}</dc:title><dc:creator>Ravugo Consulting LLC</dc:creator><dc:description>Product requirements document exported from ProductPilot</dc:description></cp:coreProperties>`);
    return zip;
  }
  function filename(draft) {
    const title = draft.fields.find(field => field.key === 'title')?.value || 'product-requirements';
    const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'product-requirements';
    return `ravugo-consulting-llc-${slug}.docx`;
  }
  globalThis.PilotPrdExport = { buildPackage, filename, mainProblem, exportDocx: draft => buildPackage(draft).generateAsync({ type: 'blob', mimeType: MIME, compression: 'DEFLATE' }) };
})();
