'use strict';

document.getElementById('permission').addEventListener('click', () => chrome.permissions.request({
  permissions: ['webNavigation'],
  origins: ['<all_urls>']
}, granted => granted && chrome.runtime.reload()));

document.getElementById('disable').addEventListener('click', () => chrome.runtime.sendMessage({
  cmd: 'disable-login'
}));
