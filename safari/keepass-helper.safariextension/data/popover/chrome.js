/* globals safari */
'use strict';

var chrome = {
  storage: {},
  runtime: {}
};
chrome.storage.local = {
  get: (obj, callback) => {
    let prefs = {};
    Object.keys(obj).map(name => {
      prefs[name] = safari.extension.settings[name] || obj[name];
    });
    callback(prefs);
  },
  set: (prefs) => {
    Object.keys(prefs).forEach(name => safari.extension.settings[name] = prefs[name]);
  }
};

chrome.runtime.sendMessage = (obj) => {
  if (safari.application.activeBrowserWindow.activeTab.page) {
    safari.application.activeBrowserWindow.activeTab.page.dispatchMessage('command', obj);
    safari.extension.popovers[0].hide();
  }
};
