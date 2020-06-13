'use strict';

document.getElementById('cancel').addEventListener('click', () => {
  chrome.runtime.sendMessage({
    cmd: 'prompt-resolved'
  });
  window.close();
});
document.querySelector('form').addEventListener('submit', e => {
  e.preventDefault();
  chrome.runtime.sendMessage({
    cmd: 'prompt-resolved',
    password: document.getElementById('password').value
  });
  window.close();
});

document.getElementById('password').addEventListener('input', e => {
  document.getElementById('ok').disabled = e.target.value === '';
});

window.addEventListener('blur', () => chrome.runtime.sendMessage({
  cmd: 'bring-to-front'
}));
window.onbeforeunload = () => chrome.runtime.sendMessage({
  cmd: 'prompt-resolved'
});
