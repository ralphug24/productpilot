(() => {
  'use strict';
  let url;
  try {
    url = new URL(window.PilotFeedback?.formUrl);
    if (url.protocol !== 'https:' || !['forms.office.com', 'forms.cloud.microsoft'].includes(url.hostname)) return;
  } catch { return; }
  document.querySelectorAll('[data-feedback]').forEach(link => { link.href = url.href; });
  document.querySelectorAll('[data-form-ready]').forEach(element => { element.hidden = false; });
  document.querySelectorAll('[data-form-pending]').forEach(element => { element.hidden = true; });
})();
