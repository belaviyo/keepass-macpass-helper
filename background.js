/* globals KeePass */
'use strict';

var storage = {};

function notify(message) {
  chrome.notifications.create({
    title: 'KeePassHelper',
    type: 'basic',
    iconUrl: 'data/icons/128.png',
    message
  });
}

function onCommand(id, callback = function() {}) {
  chrome.tabs.executeScript(id, {
    file: 'data/cmd/inject.js',
    allFrames: true,
    matchAboutBlank: true,
    runAt: 'document_start'
  }, () => {
    if (chrome.runtime.lastError) {
      notify(chrome.runtime.lastError.message);
    }
    callback();
  });
}
chrome.browserAction.onClicked.addListener(({id}) => onCommand(id));

chrome.runtime.onMessage.addListener((request, sender, response) => {
  const id = request.tabId || (sender.tab ? sender.tab.id : -1);
  const cmd = request.cmd;
  if (cmd === 'close-me' || cmd.startsWith('insert-')) {
    chrome.tabs.executeScript(id, {
      code: `{
        try {
          document.body.removeChild(iframe)
        }
        catch(e) {}
        delete iframe;
        window.focus();
      }`,
      runAt: 'document_start',
      allFrames: false
    }, () => chrome.runtime.lastError);
    chrome.tabs.executeScript(id, {
      code: `
        if (typeof aElement !== 'undefined' && aElement) {
          aElement.focus();
          window.focus();
        }
      `,
      runAt: 'document_start',
      allFrames: true
    }, () => chrome.runtime.lastError);
  }

  if (cmd === 'command') {
    onCommand(request.tabId, response);
    return true;
  }
  else if (cmd === 'introduce-me') {
    response({
      url: sender.tab.url,
      id: sender.tab.id
    });
  }
  else if (cmd === 'fetch-guesses') {
    chrome.tabs.sendMessage(id, request, response);
    return true;
  }
  else if (cmd === 'notify') {
    notify(request.message);
  }
  else if (cmd === 'logins') {
    const keepass = new KeePass();
    keepass.itl({
      url: request.query,
    }, (e, r) => response({
      error: e,
      response: r
    }));
    return true;
  }
  else if (cmd === 'save-form') {
    const keepass = new KeePass();
    keepass.its(request.data, e => {
      if (e) {
        notify(e.message || e);
      }
      else {
        notify('Successfully added to KeePass database');
      }
      response();
    });
    return true;
  }
  else if (cmd === 'guesses' || cmd === 'collect') {
    chrome.tabs.sendMessage(id, request);
  }
  else if (cmd === 'vars') {
    response(storage[request.id]);
    // multiple requests may need this value
    window.setTimeout(() => delete storage[request.id], 2000);
  }
  else if (request.cmd.startsWith('insert-')) {
    const key = Math.random();
    storage[key] = {
      username: request.login,
      password: request.password,
      stringFields: request.stringFields
    };

    chrome.tabs.executeScript(id, {
      code: `
        chrome.runtime.sendMessage({
          cmd: 'vars',
          id: ${key}
        }, ({username, password, stringFields = []}) => {
          function onChange (e) {
            e.dispatchEvent(new Event('change', {bubbles: true}));
            e.dispatchEvent(new Event('input', {bubbles: true}));
          }
          if (aElement) {
            (function (success) {
              if (!success) {
                try {
                  aElement.value = ${cmd === 'insert-password'} ? password : username;
                } catch (e) {}
              }
              onChange(aElement);
              if (${cmd === 'insert-both'}) {
                const form = aElement.closest('form');
                if (form) {
                  // string fields
                  stringFields.forEach(o => {
                    const custom = form.querySelector('[id="' + o.Key + '"]') || form.querySelector('[name="' + o.Key + '"]');
                    if (custom) {
                      custom.focus();
                      document.execCommand('selectAll', false, '');
                      const v = document.execCommand('insertText', false, o.Value);
                      if (!v) {
                        try {
                          custom.value = password;
                        } catch (e) {}
                      }
                      onChange(custom);
                    }
                  });
                  // password
                  const passElement = form.querySelector('[type=password]');
                  if (passElement) {
                    passElement.focus();
                    document.execCommand('selectAll', false, '');
                    const v = document.execCommand('insertText', false, password);
                    if (!v) {
                      try {
                        passElement.value = password;
                      } catch (e) {}
                    }
                    onChange(passElement);
                    if ('${request.detail}' !== 'no-submit') {
                      // submit
                      const button = form.querySelector('input[type=submit]') || form.querySelector('[type=submit]');
                      if (button) {
                        button.click();
                      }
                      else {
                        const onsubmit = form.getAttribute('onsubmit');
                        if (onsubmit && onsubmit.indexOf('return false') === -1) {
                          form.onsubmit();
                        }
                        else {
                          form.submit();
                        }
                      }
                    }
                    window.focus();
                    passElement.focus();
                  }
                }
              }
              else {
                aElement.focus();
                window.focus();
              }
            })(
              document.execCommand('selectAll', false, '') &&
              document.execCommand(
                'insertText',
                false,
                ${cmd === 'insert-password'} ? password : username
              )
            );
          }
        });
      `,
      runAt: 'document_start',
      allFrames: true,
      matchAboutBlank: true
    }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
  }
});

function copy(str, tabId) {
  if (/Firefox/.test(navigator.userAgent)) {
    const id = Math.random();
    storage[id] = str;
    chrome.tabs.executeScript(tabId, {
      allFrames: false,
      runAt: 'document_start',
      code: `
        chrome.runtime.sendMessage({
          cmd: 'vars',
          id: ${id}
        }, password => {
          document.oncopy = (event) => {
            event.clipboardData.setData('text/plain', password);
            event.preventDefault();
          };
          window.focus();
          document.execCommand('Copy', false, null);
        });
      `
    }, () => {
      notify(
        chrome.runtime.lastError ?
          'Cannot copy to the clipboard on this page!' :
          'Generated password is copied to the clipboard'
      );
    });
  }
  else {
    document.oncopy = e => {
      e.clipboardData.setData('text/plain', str);
      e.preventDefault();
      notify('Generated password is copied to the clipboard');
    };
    document.execCommand('Copy', false, null);
  }
}

// Context Menu
{
  const callback = () => {
    chrome.contextMenus.create({
      id: 'open-keyboards',
      title: 'Keyboard Shortcut Settings',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      id: 'generate-password',
      title: 'Generate a Random Password',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      id: 'save-form',
      title: 'Save a new login form in KeePass',
      contexts: ['browser_action']
    });
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-form') {
    chrome.tabs.executeScript(tab.id, {
      file: '/data/save/inject.js',
      runAt: 'document_start',
      allFrames: true
    }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
  }
  else if (info.menuItemId === 'open-keyboards') {
    chrome.tabs.create({
      url: 'chrome://extensions/configureCommands'
    });
  }
  else {
    chrome.storage.local.get({
      charset: 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
      length: 12
    }, prefs => {
      const array = new Uint8Array(prefs.length);
      window.crypto.getRandomValues(array);
      const password = [...array].map(n => Math.floor(n / 256 * prefs.charset.length) - 1)
        .map(n => prefs.charset[n]).join('');
      // copy to clipboard
      copy(password, tab.id);
    });
  }
});

// panel-view modes
{
  const c1 = bol => chrome.browserAction.setPopup({
    popup: bol ? '' : '/data/cmd/index.html'
  });
  const c2 = () => chrome.storage.local.get({
    embedded: false
  }, prefs => c1(prefs.embedded));

  chrome.runtime.onInstalled.addListener(c2);
  chrome.runtime.onStartup.addListener(c2);
  chrome.storage.onChanged.addListener(prefs => prefs.embedded && c1(prefs.embedded.newValue));
}

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': !/Firefox/.test(navigator.userAgent)
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/keepass-helper.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});
{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
}
