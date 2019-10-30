/* globals nacl */
/* eslint require-atomic-updates: 0 */

// https://github.com/keepassxreboot/keepassxc-browser/blob/develop/keepassxc-protocol.md

'use strict';

const keepassxc = {
  clientID: '',
  btoa(arrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  },
  atob(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  },
  textEncoder: new TextEncoder(), // always utf-8
  textDecoder: new TextDecoder('utf-8'),
  encrypt(request) {
    const messageData = keepassxc.textEncoder.encode(JSON.stringify(request));
    const messageNonce = keepassxc.atob(keepassxc.nonce);

    if (keepassxc.serverPublicKey) {
      const message = nacl.box(messageData, messageNonce, keepassxc.serverPublicKey, keepassxc.keyPair.secretKey);
      if (message) {
        return keepassxc.btoa(message);
      }
    }
    return '';
  },
  decrypt(response) {
    const m = keepassxc.atob(response.message);
    const n = keepassxc.atob(response.nonce);
    const res = nacl.box.open(m, n, keepassxc.serverPublicKey, keepassxc.keyPair.secretKey);
    return JSON.parse(keepassxc.textDecoder.decode(res));
  },
  nonce: null,
  post(request) {
    return new Promise(resolve => chrome.runtime.sendNativeMessage('org.keepassxc.keepassxc_browser', request, resolve));
  },
  securePost(messageData) {
    return keepassxc.post({
      'action': messageData.action,
      'message': keepassxc.encrypt(messageData),
      'nonce': keepassxc.nonce,
      'clientID': keepassxc.clientID
    }).then(resp => {
      if (resp) {
        if (resp.nonce) {
          return keepassxc.decrypt(resp);
        }
        else {
          return resp;
        }
      }
    });
  },
  init() {
    keepassxc.nonce = keepassxc.btoa(nacl.randomBytes(24));

    return new Promise((resolve, reject) => {
      // get or generate public and private keys
      chrome.storage.local.get({
        'xc-key-pair': {},
        'xc-server-public-key': '',
        'xc-client-id': 'keepass-helper-' + Math.random().toString(36).substring(7)
      }, async prefs => {
        keepassxc.clientID = prefs['xc-client-id'];
        if (prefs['xc-key-pair'].publicKey && prefs['xc-key-pair'].secretKey) {
          keepassxc.keyPair = {
            publicKey: keepassxc.atob(prefs['xc-key-pair'].publicKey),
            secretKey: keepassxc.atob(prefs['xc-key-pair'].secretKey)
          };
        }
        else {
          keepassxc.keyPair = nacl.box.keyPair();
          chrome.storage.local.set({
            'xc-client-id': keepassxc.clientID,
            'xc-key-pair': {
              publicKey: keepassxc.btoa(keepassxc.keyPair.publicKey),
              secretKey: keepassxc.btoa(keepassxc.keyPair.secretKey)
            }
          });
        }
        // get server public key
        if (prefs['xc-server-public-key']) {
          keepassxc.serverPublicKey = keepassxc.atob(prefs['xc-server-public-key']);
          return resolve();
        }
        else {
          const resp = await keepassxc.post({
            'action': 'change-public-keys',
            'nonce': keepassxc.nonce,
            'clientID': keepassxc.clientID,
            'publicKey': keepassxc.btoa(keepassxc.keyPair.publicKey)
          });
          if (resp && resp.success === 'true') {
            chrome.storage.local.set({
              'xc-server-public-key': resp.publicKey
            });
            keepassxc.serverPublicKey = keepassxc.atob(resp.publicKey);
            return resolve();
          }
          else {
            reject(Error('"change-public-keys" failed'));
          }
        }
      });
    });
  },
  databasehash() {
    return keepassxc.securePost({
      action: 'get-databasehash'
    });
  },
  async associate() {
    keepassxc.db = keepassxc.db || (await keepassxc.databasehash());
    if (!keepassxc.db || !keepassxc.db.hash) {
      throw Error('Cannot read database hash');
    }
    const idKey = keepassxc.btoa(nacl.box.keyPair().publicKey);
    const messageData = {
      action: 'associate',
      key: keepassxc.btoa(keepassxc.keyPair.publicKey),
      idKey
    };
    const resp = await keepassxc.securePost(messageData);
    if (resp && resp.success === 'true') {
      keepassxc.key = {
        id: resp.id,
        key: idKey
      };
      chrome.storage.local.set({
        ['xc-' + keepassxc.db.hash]: keepassxc.key
      });
      return;
    }
    else {
      if (resp) {
        throw Error('associate error: ' + resp.error);
      }
      else {
        throw Error('Cannot associate with KeePassXC');
      }
    }
  },
  async 'test-associate'() {
    keepassxc.db = keepassxc.db || (await keepassxc.databasehash());
    if (!keepassxc.db || !keepassxc.db.hash) {
      throw Error('Cannot read database hash');
    }
    return new Promise((resolve, reject) => chrome.storage.local.get({
      ['xc-' + keepassxc.db.hash]: {}
    }, async prefs => {
      if (prefs['xc-' + keepassxc.db.hash]) {
        keepassxc.key = prefs['xc-' + keepassxc.db.hash];
        const resp = await keepassxc.securePost(Object.assign({
          'action': 'test-associate'
        }, keepassxc.key));
        if (resp && resp.success === 'true') {
          resolve();
        }
        else {
          reject(Error('cannot associate/2'));
        }
      }
      else {
        reject(Error('cannot associate/1'));
      }
    }));
  },
  'get-logins'(url) {
    return keepassxc.securePost({
      'action': 'get-logins',
      'keys': [keepassxc.key],
      url
    }).then(resp => {
      if (resp.success === 'true') {
        return resp.entries;
      }
      throw Error(resp.error || 'Cannot retrieve credentials');
    });
  },
  'set-login'({url, submiturl, login, password}) {
    return keepassxc.securePost({
      'action': 'set-login',
      url,
      submiturl,
      login,
      password
    }).then(resp => {
      if (resp.success === 'true') {
        return;
      }
      throw Error(resp.error || 'Cannot retrieve credentials');
    });
  },
  // itl: init -> test -> logins
  async itl({url}, callback) {
    try {
      await keepassxc.init();
    }
    catch (e) {
      return callback(e.message + '. Does KeePassHelper have access to the native application?', null);
    }
    try {
      await keepassxc['test-associate']();
    }
    catch (e) {
      await keepassxc.associate();
    }
    try {
      const resp = await keepassxc['get-logins'](url).then(resp => {
        return {
          Entries: resp.map(e => Object.assign(e, {
            Login: e.login,
            Name: e.name,
            Password: e.password,
            StringFields: (e.stringFields || [])
          }))
        };
      });
      callback(null, resp);
    }
    catch (e) {
      callback(e.message, null);
    }
  },
  // its: init -> test -> set
  async its({url, submiturl, login, password}, callback) {
    try {
      await keepassxc.init();
    }
    catch (e) {
      return callback(e.message + '. Does KeePassHelper have access to the native application?', null);
    }
    try {
      await keepassxc['test-associate']();
    }
    catch (e) {
      await keepassxc.associate();
    }
    try {
      const resp = await keepassxc['set-login']({url, submiturl, login, password});
      callback(null, resp);
    }
    catch (e) {
      callback(e.message, null);
    }
  }
};
