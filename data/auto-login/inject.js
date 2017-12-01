'use strict';

document.addEventListener('DOMContentLoaded', () => chrome.storage.local.get({
  json: []
}, prefs => {
  if (prefs.json.length) {
    const o = prefs.json.filter(o => document.location.href.startsWith(o.url)).shift();
    if (o) {
      chrome.runtime.sendMessge({
        cmd: 'logins',
        query: document.location.href
      }, ({error, response}) => {
        console.log(error, response);
      });
    }
  }
}));
