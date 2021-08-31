/* globals safe */
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

document.addEventListener('submit', e => {
  e.preventDefault();
  const data = document.getElementById('data').value;
  const passphrase = document.getElementById('passphrase').value;
  const result = document.getElementById('result');

  safe[e.target.dataset.action](data, passphrase).then(s => result.value = s)
    .catch(e => result.value = e.message || 'Operation was unsuccessful');
});
