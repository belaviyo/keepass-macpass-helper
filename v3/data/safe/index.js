/* global Safe */
'use strict';

document.getElementById('encrypt').addEventListener('click', () => {
  document.forms[0].dataset.action = 'encrypt';
});
document.getElementById('decrypt').addEventListener('click', () => {
  document.forms[0].dataset.action = 'decrypt';
});
document.getElementById('cancel').addEventListener('click', () => {
  chrome.runtime.sendMessage({cmd: 'close-me'});
});

document.addEventListener('submit', async e => {
  const result = document.getElementById('result');
  try {
    e.preventDefault();
    const data = document.getElementById('data').value;
    const passphrase = document.getElementById('passphrase').value;

    const safe = new Safe();
    await safe.open(passphrase);
    const s = await safe[e.target.dataset.action](data);
    if (e.target.dataset.action === 'encrypt') {
      result.value = 'data:application/octet-binary;base64,' + s;
    }
    else {
      result.value = s;
    }
  }
  catch (e) {
    console.error(e);
    result.value = e.message || 'Operation was unsuccessful';
  }
});

document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
  window.focus();
  document.getElementById('passphrase').focus();
}, 100));

addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    document.getElementById('cancel').click();
  }
});
