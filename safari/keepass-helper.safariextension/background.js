/* globals safari */
'use strict';

var saved = safari.extension.settings.version;
var version = safari.extension.displayVersion;

if (version !== saved) {
  if (safari.extension.settings.welcome === 'true') {
    var tab = safari.application.activeBrowserWindow.openTab();
    tab.url = 'http://add0n.com/keepass-helper.html?version=' + version +
      '&type=' + (saved ? ('upgrade&p=' + saved) : 'install');
  }
  safari.extension.settings.version = version;
}
