/* globals KeePass, jsOTP, safe */
'use strict';

var storage = {};
var login;

jsOTP.exec = (secret, silent = false) => {
  if (secret.indexOf('key=') !== -1) {
    return (new jsOTP.totp()).getOtp(secret.split('key=')[1].split('&')[0]);
  }
  else if (secret.indexOf('secret=') !== -1) {
    return (new jsOTP.totp()).getOtp(secret.split('secret=')[1].split('&')[0]);
  }
  else {
    if (silent === false) {
      notify('"otp" string-field entry should have a value of "key=OTP_SECRET" format');
    }
    return 'invalid sectet';
  }
};

function notify(message) {
  chrome.notifications.create({
    title: 'KeePassHelper',
    type: 'basic',
    iconUrl: 'data/icons/128.png',
    message
  });
}
jsOTP.secure = (id, ensecret, silent = false) => new Promise((resolve, reject) => chrome.tabs.executeScript(id, {
  code: `window.prompt('Please enter the passphrase to decrypt the encrypted OTP secret')`,
  runAt: 'document_start',
  allFrames: false
}, rtn => {
  if (chrome.runtime.lastError) {
    reject(chrome.runtime.lastError);
  }
  else {
    if (rtn && rtn.length) {
      safe.decrypt(ensecret, rtn[0]).then(secret => jsOTP.exec(secret, silent)).then(resolve, reject);
    }
    else {
      reject(new Error('return value is empty'));
    }
  }
}));

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

var onMessage = (request, sender, response) => {
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
        if (typeof aElement !== 'undefined' && aElement && !Array.isArray(aElement)) {
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
  else if (cmd === 'register-login') {
    login.json = request.json;
    login['auto-submit'] = request['auto-submit'];
    login.register();
  }
  else if (cmd === 'disable-login') {
    login.json = [];
    localStorage.setItem('json', '[]');
    login.register();
    chrome.tabs.remove(sender.tab.id);
  }
  else if (cmd === 'otp') {
    copy(jsOTP.exec(request.value), null, 'OTP token is copied to the clipboard');
  }
  else if (cmd === 'sotp') {
    tab().then(t => jsOTP.secure(t.id, request.value).then(token => {
      copy(token, t.id, 'OTP token is copied to the clipboard');
    })).catch(e => notify(e.message || 'Cannot decrypt using the provided passphrase'));
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
    let secret = '';
    const step = () => {
      const key = Math.random();
      storage[key] = {
        username: request.login,
        password: request.password,
        stringFields: request.stringFields.map(o => {
          o.Value = o.Value.replace('{TOTP}', secret);
          return o;
        })
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
            const once = aElement => {
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
                            custom.value = o.Value;
                          } catch (e) {}
                        }
                        onChange(custom);
                      }
                    });
                    // password
                    const passElement = form.querySelector('[type=password]');
                    if (passElement) {
                      passElement.focus();
                      let v = false;
                      // only insert if password element is focused
                      if (document.activeElement === passElement) {
                        document.execCommand('selectAll', false, '');
                        v = document.execCommand('insertText', false, password);
                      }
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
            if (aElement) {
              if (Array.isArray(aElement)) {
                aElement.forEach(e => {
                  e.focus();
                  once(e);
                });
              }
              else {
                once(aElement);
              }
            }
          });
        `,
        runAt: 'document_start',
        allFrames: true,
        matchAboutBlank: true
      }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
    };

    const otp = request.stringFields.filter(o => o.Key === 'otp').map(o => o.Value).shift();
    const sotp = request.stringFields.filter(o => o.Key === 'sotp').map(o => o.Value).shift();
    if (sotp && cmd === 'insert-both') {
      jsOTP.secure(id, sotp, true).then(s => {
        secret = s;
        step();
      }).catch(e => notify(e.message || 'Cannot decrypt using the provided passphrase'));
    }
    else if (otp && cmd === 'insert-both') {
      secret = jsOTP.exec(otp || '', true);
      step();
    }
    else {
      step();
    }
  }
};
chrome.runtime.onMessage.addListener(onMessage);

function tab() {
  return new Promise((resolve, reject) => chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    if (tabs && tabs.length) {
      resolve(tabs[0]);
    }
    else {
      reject(new Error('No active tab is detected'));
    }
  }));
}

function copy(str, tabId, msg) {
  if (/Firefox/.test(navigator.userAgent)) {
    const id = Math.random();
    storage[id] = str;
    const run = tabId => chrome.tabs.executeScript(tabId, {
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
      notify(chrome.runtime.lastError ? 'Cannot copy to the clipboard on this page!' : msg);
    });
    if (tabId) {
      run(tabId);
    }
    else {
      tab().then(tab => run(tab.id)).catch(e => notify(e.message));
    }
  }
  else {
    document.oncopy = e => {
      e.clipboardData.setData('text/plain', str);
      e.preventDefault();
      notify(msg);
    };
    document.execCommand('Copy', false, null);
  }
}

// auto login
login = {
  'json': JSON.parse(localStorage.getItem('json') || '[]'),
  'auto-submit': localStorage.getItem('auto-submit') === 'true',
  observe: d => {
    if (d.frameId === 0) {
      const o = login.json.filter(o => d.url.startsWith(o.url)).pop();
      if (o) {
        onMessage({
          cmd: 'logins',
          query: d.url
        }, {}, ({error, response}) => {
          if (!error && response) {
            const e = (response.Entries || []).filter(e => e.Login === o.username).pop();
            if (e) {
              // do we have a username field?
              chrome.tabs.executeScript(d.tabId, {
                runAt: 'document_start',
                allFrames: true,
                code: `(() => {
                  const forms = [...document.querySelectorAll('input[type=password]')]
                    .map(p => p.form)
                    .filter(f => f &&
                      (f.name || '').indexOf('reg') === -1 &&
                      (f.id || '').indexOf('reg') === -1 &&
                      (f.action || '').indexOf('join') === -1
                    );
                  aElement = [];

                  forms.forEach(f => {
                    aElement.push(...[...f.querySelectorAll('input:not([type=password])')]
                      .filter(i => (i.type === 'text' || i.type === 'email')));
                  });
                  return aElement.length;
                })()`
              }, (arr = []) => {
                // if there is a username input (aElement exists)
                if (arr.some(i => i)) {
                  onMessage({
                    tabId: d.tabId,
                    cmd: 'insert-both',
                    login: e.Login,
                    password: e.Password,
                    detail: login['auto-submit'] ? '' : 'no-submit',
                    stringFields: e.StringFields
                  });
                }
              });
            }
          }
        });
      }
    }
  },
  register: () => {
    if (chrome.webNavigation) {
      chrome.webNavigation.onDOMContentLoaded.removeListener(login.observe);
      if (login.json.length) {
        chrome.webNavigation.onDOMContentLoaded.addListener(login.observe);
      }
    }
    else if (login.json.length) {
      chrome.windows.create({
        url: 'data/permission/index.html',
        type: 'popup',
        width: 400,
        height: 250,
        left: screen.availLeft + Math.round((screen.availWidth - 400) / 2),
        top: screen.availTop + Math.round((screen.availHeight - 250) / 2)
      });
    }
  }
};
login.register();

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
    chrome.contextMenus.create({
      id: 'auto-login',
      title: 'Perform auto-login for this URL',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      id: 'encrypt-data',
      title: 'Encrypt or decrypt a string data',
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
  else if (info.menuItemId === 'auto-login') {
    let key = document.cookie.split(`${(new URL(tab.url)).hostname}=`);
    if (key.length > 1) {
      key = key[1].split(';')[0];
    }
    else {
      key = '';
    }

    chrome.tabs.executeScript(tab.id, {
      runAt: 'document_start',
      allFrames: false,
      code: `window.prompt('What is the username to match with KeePass database? This username must exactly match with one of the credentials stored in your KeePass database for this URL', '${key}')`
    }, (arr = []) => {
      if (chrome.runtime.lastError) {
        return notify(chrome.runtime.lastError.message);
      }
      const username = (arr[0] || '').trim();
      if (username) {
        login.json.push({
          url: tab.url.split('?')[0],
          username
        });
        localStorage.setItem('json', JSON.stringify(login.json));
        login.register();
        notify(`A new automatic login is registered for this URL.

To fill the credential automatically refresh the page.`);
      }
    });
  }
  else if (info.menuItemId === 'encrypt-data') {
    chrome.tabs.executeScript(tab.id, {
      file: '/data/safe/inject.js',
      runAt: 'document_start'
    }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
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
      copy(password, tab.id, 'Generated password is copied to the clipboard');
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
  'faqs': navigator.userAgent.indexOf('Firefox') === -1,
  'last-update': 0,
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    const now = Date.now();
    const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 30;
    chrome.storage.local.set({
      version,
      'last-update': doUpdate ? Date.now() : prefs['last-update']
    }, () => {
      // do not display the FAQs page if last-update occurred less than 30 days ago.
      if (doUpdate) {
        const p = Boolean(prefs.version);
        chrome.tabs.create({
          url: chrome.runtime.getManifest().homepage_url + '?version=' + version +
            '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
          active: p === false
        });
      }
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL(
    (new URL(chrome.runtime.getManifest().homepage_url)).origin +
      '/feedback.html?name=' + name + '&version=' + version
  );
}
