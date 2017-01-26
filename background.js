/* globals KeePass */
'use strict';

function onCommand (tab) {
  chrome.tabs.executeScript(tab.id, {
    file: 'data/cmd/inject.js',
    allFrames: true,
    matchAboutBlank: true,
    runAt: 'document_start'
  });
}
chrome.browserAction.onClicked.addListener(onCommand);

chrome.runtime.onMessage.addListener((request, sender, response) => {
  let id = sender.tab.id;
  let cmd = request.cmd;

  if (cmd === 'close-me' || request.cmd.startsWith('insert-')) {
    chrome.tabs.executeScript(id, {
      code: `
        if (iframe) {
          document.body.removeChild(iframe);
        }
      `,
      runAt: 'document_start',
      allFrames: false
    });
  }

  if (cmd === 'logins') {
    let keepass = new KeePass();
    keepass.itl({
      url: request.query,
    }, (e, r) => response({
      error: e,
      response: r
    }));
    return true;
  }
  else if (cmd === 'url-is') {
    chrome.tabs.sendMessage(id, request);
  }
  else if (request.cmd.startsWith('insert-')) {
    chrome.tabs.executeScript(id, {
      code: `
        (function (success) {
          if (success && ${cmd === 'insert-both'}) {
            let form = aElement.closest('form');
            if (form) {
              let password = form.querySelector('[type=password]');
              if (password) {
                password.focus();
                document.execCommand('selectAll', false, '');
                let v = document.execCommand('insertText', false, '${request.password}');
                if (v && '${request.detail}' !== 'no-submit') {
                  // submit
                  console.error(${request.detail});
                  let button = form.querySelector('input[type=submit]') || form.querySelector('[type=submit]');
                  if (button) {
                    button.click();
                  }
                  else {
                    let onsubmit = form.getAttribute('onsubmit');
                    if (onsubmit && onsubmit.indexOf('return false') === -1) {
                      form.onsubmit();
                    }
                    else {
                      form.submit();
                    }
                  }
                }
                window.focus();
                password.focus();
              }
            }
          }
          else {
            aElement.focus();
            window.focus();
          }
        })(
          aElement &&
          document.execCommand('selectAll', false, '') &&
          document.execCommand(
            'insertText',
            false,
            '${cmd === 'insert-password' ? request.password : request.login}'
          )
        );
        '';
      `,
      runAt: 'document_start',
      allFrames: true,
      matchAboutBlank: true
    });
  }
});
// Context Menu
chrome.contextMenus.create({
  id: 'open-commands',
  title: 'Keyboard Shortcut Settings',
  contexts: ['browser_action']
});
chrome.contextMenus.onClicked.addListener(() => chrome.tabs.create({
  url: 'chrome://extensions/configureCommands'
}));
// FAQs & Feedback
chrome.storage.local.get('version', prefs => {
  let version = chrome.runtime.getManifest().version;
  let isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
  if (isFirefox ? !prefs.version : prefs.version !== version) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/keepass-helper.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});
(function () {
  let {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
})();
