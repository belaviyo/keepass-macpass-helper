'use strict';

function restore() {
  chrome.storage.local.get({
    host: 'http://localhost:19455',
    foramt: '[login] - [name]',
    charset: 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
    length: 12,
    embedded: false,
    faqs: true
  }, prefs => {
    document.getElementById('host').value = prefs.host;
    document.getElementById('format').value = prefs.format;
    document.getElementById('charset').value = prefs.charset;
    document.getElementById('length').value = prefs.length;
    document.getElementById('embedded').checked = prefs.embedded;
    document.getElementById('faqs').checked = prefs.faqs;
  });
}

function save() {
  chrome.storage.local.set({
    host: document.getElementById('host').value,
    format: document.getElementById('format').value,
    charset: document.getElementById('charset').value,
    length: Math.max(document.getElementById('length').value, 3),
    embedded: document.getElementById('embedded').checked,
    faqs: document.getElementById('faqs').checked
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
    restore();
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
