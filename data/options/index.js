'use strict';

function restore() {
  chrome.storage.local.get({
    host: 'http://localhost:19455',
    foramt: '[login] - [name]',
    charset: 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
    length: 12,
    faqs: navigator.userAgent.toLowerCase().indexOf('firefox') === -1 ? true : false
  }, (prefs) => {
    document.getElementById('host').value = prefs.host;
    document.getElementById('format').value = prefs.format;
    document.getElementById('charset').value = prefs.charset;
    document.getElementById('length').value = prefs.length;
    document.getElementById('faqs').checked = prefs.faqs;
  });
}

function save() {
  const host = document.getElementById('host').value;
  const format = document.getElementById('format').value;
  const charset = document.getElementById('charset').value;
  const length = Math.max(document.getElementById('length').value, 3);
  const faqs = document.getElementById('faqs').checked;
  chrome.storage.local.set({
    host,
    format,
    charset,
    length,
    faqs
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
    restore();
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
