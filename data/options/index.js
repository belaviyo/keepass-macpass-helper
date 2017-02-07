'use strict';

function restore() {
  chrome.storage.local.get({
    charset: 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
    length: 12,
    faqs: navigator.userAgent.toLowerCase().indexOf('firefox') === -1 ? true : false
  }, (prefs) => {
    document.getElementById('charset').value = prefs.charset;
    document.getElementById('length').value = prefs.length;
    document.getElementById('faqs').checked = prefs.faqs;
  });
}

function save() {
  let charset = document.getElementById('charset').value;
  let length = Math.max(document.getElementById('length').value, 3);
  let faqs = document.getElementById('faqs').checked;
  chrome.storage.local.set({
    charset,
    length,
    faqs
  }, () => {
    let status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
    restore();
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
