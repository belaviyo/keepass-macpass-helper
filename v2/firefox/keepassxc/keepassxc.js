/* globals nacl */
/* eslint require-atomic-updates: 0 */

// https://github.com/keepassxreboot/keepassxc-browser/blob/develop/keepassxc-protocol.md

'use strict';

const keepassxc = {
  nativeID: '',
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
    const m = keepassxc.textEncoder.encode(JSON.stringify(request));
    const n = keepassxc.atob(keepassxc.nonce);

    if (keepassxc.serverPublicKey) {
      const message = nacl.box(m, n, keepassxc.serverPublicKey, keepassxc.keyPair.secretKey);
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
    return new Promise(resolve => chrome.runtime.sendNativeMessage(keepassxc.nativeID, request, resolve));
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
        'xc-native-id': 'org.keepassxc.keepassxc_browser',
        'xc-client-id': 'keepass-helper-' + Math.random().toString(36).substring(7)
      }, async prefs => {
        keepassxc.nativeID = prefs['xc-native-id'];
        keepassxc.clientID = prefs['xc-client-id'];
        keepassxc.keyPair = nacl.box.keyPair();
        chrome.storage.local.set({
          'xc-client-id': keepassxc.clientID
        });
        // get server public key
        const resp = await keepassxc.post({
          'action': 'change-public-keys',
          'nonce': keepassxc.nonce,
          'clientID': keepassxc.clientID,
          'publicKey': keepassxc.btoa(keepassxc.keyPair.publicKey)
        });
        if (resp && resp.success === 'true') {
          keepassxc.serverPublicKey = keepassxc.atob(resp.publicKey);
          return resolve();
        }
        else {
          reject(Error('"change-public-keys" failed'));
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
    const resp = await keepassxc.databasehash();
    if (!resp.hash) {
      throw Error('Requesting database info from KeePassXC failed');
    }
    keepassxc.db = resp;
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
      console.error(e);
      return callback(e.message + '. Does KeePassHelper have access to the native application?', null);
    }
    try {
      await keepassxc['test-associate']();
    }
    catch (e) {
      try {
        await keepassxc.associate();
      }
      catch (e) {
        console.error(e);
        return callback(e.message + '. Does KeePassHelper have access to the native application?', null);
      }
    }
    try {
      const resp = await keepassxc['get-logins'](url);
      callback(null, {
        Entries: resp.map(e => Object.assign(e, {
          Login: e.login,
          Name: e.name,
          Password: e.password,
          StringFields: (e.stringFields || []).map(o => Object.entries(o).reduce((p, [key, value]) => {
            p.Key = key.replace('KPH: ', ''),
            p.Value = value;
            return p;
          }, {}))
        }))
      });
    }
    catch (e) {
      console.error(e);
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
