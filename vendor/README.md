# Local transcript readers

- PDF.js 5.6.205, Mozilla contributors, Apache 2.0. The two self-contained distribution modules are wrapped as classic scripts so local file previews can extract text without fetching modules. `prepare-vendor.mjs` preserves the code, replaces `import.meta.url` with the source script URL, and exposes exports on the global object. The worker handler runs locally through PDF.js's fallback worker path. This adaptation supports text extraction; it is not a PDF rendering feature.
- JSZip 3.10.1, Stuart Knightley and contributors. Included minified distribution, with its original license. Used to read DOCX document XML.

See the accompanying license files. No external CDN request or model service is required to read transcript text.
