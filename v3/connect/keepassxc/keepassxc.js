/* global nacl, SimpleStorage */

// https://github.com/keepassxreboot/keepassxc-browser/blob/develop/keepassxc-protocol.md

'use strict';

class KeePassXC extends SimpleStorage {
  constructor() {
    super();

    this.textEncoder = new TextEncoder(); // always utf-8
    this.textDecoder = new TextDecoder('utf-8');
    this.timeout = 5000;
  }
  async prepare() {
    this.nonce = this.btoa(crypto.getRandomValues(new Uint8Array(24)));

    const prefs = await this.read({
      'xc-native-id': 'org.keepasshelper.extension',
      'xc-client-id': 'keepass-helper-' + Math.random().toString(36).substring(7)
    });

    this.nativeID = prefs['xc-native-id'];
    this.clientID = prefs['xc-client-id'];

    this.keyPair = nacl.box.keyPair();

    this.write({
      'xc-client-id': this.clientID
    });

    // get server public key
    try {
      const resp = await this.post({
        'action': 'change-public-keys',
        'nonce': this.nonce,
        'clientID': this.clientID,
        'publicKey': this.btoa(this.keyPair.publicKey)
      });

      if (resp && resp.success === 'true') {
        this.serverPublicKey = this.atob(resp.publicKey);
      }
      else {
        throw Error('"change-public-keys" failed');
      }
    }
    catch (e) {
      // const id = chrome.runtime.getURL('').split('//')[1].split('/')[0];
      throw Error(e.message + `. Do I have access to the native application?`);
    }
  }
  // tools
  btoa(arrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  }
  atob(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  }
  encrypt(request) {
    const m = this.textEncoder.encode(JSON.stringify(request));
    const n = this.atob(this.nonce);

    if (this.serverPublicKey) {
      const message = nacl.box(m, n, this.serverPublicKey, this.keyPair.secretKey);
      if (message) {
        return this.btoa(message);
      }
    }
    return '';
  }
  decrypt(response) {
    const m = this.atob(response.message);
    const n = this.atob(response.nonce);
    const res = nacl.box.open(m, n, this.serverPublicKey, this.keyPair.secretKey);
    return JSON.parse(this.textDecoder.decode(res));
  }
  post(request) {
    return new Promise((resolve, reject) => {
      if (window.top !== window && /Firefox/.test(navigator.userAgent)) {
        chrome.runtime.sendMessage({
          cmd: 'native',
          id: this.nativeID,
          request
        }, resolve);
      }
      else {
        if (chrome.runtime.sendNativeMessage) {
          Promise.race([
            new Promise(r => chrome.runtime.sendNativeMessage(this.nativeID, request, r)),
            new Promise(r => setTimeout(r, this.timeout, undefined))
          ]).then(resolve);
        }
        else {
          reject(Error('native access it not configured. Use the options page to allow it'));
        }
      }
    });
  }
  securePost(messageData) {
    return this.post({
      'action': messageData.action,
      'message': this.encrypt(messageData),
      'nonce': this.nonce,
      'clientID': this.clientID
    }).then(resp => {
      if (resp) {
        if (resp.nonce) {
          return this.decrypt(resp);
        }
        else {
          return resp;
        }
      }
    });
  }
  databasehash() {
    return this.securePost({
      action: 'get-databasehash'
    });
  }
  // public methods
  async 'test-associate'() {
    // resolve if already connected
    if (this.connected) {
      return;
    }
    const resp1 = await this.databasehash();
    if (!resp1.hash) {
      throw Error('Requesting database info from KeePassXC failed');
    }
    this.db = resp1;

    // check all existing hashes
    const prefs = await this.read(null);
    if (!prefs['xc-' + this.db.hash]) {
      throw Error('cannot associate/1');
    }

    const resp2 = await this.securePost(Object.assign({
      'action': 'test-associate'
    }, prefs['xc-' + this.db.hash]));
    if (!resp2 || resp2.success !== 'true') {
      throw Error('cannot associate/2');
    }

    // all existing KeePassXC associated keys
    this.keys = [];
    for (const key of Object.keys(prefs).filter(name => name.startsWith('xc-') && prefs[name]?.id)) {
      this.keys.push(prefs[key]);
    }
    if (this.keys.length === 0) {
      throw Error('cannot associate/3');
    }

    this.connected = true;
  }
  async associate() {
    const idKey = this.btoa(nacl.box.keyPair().publicKey);
    const messageData = {
      action: 'associate',
      key: this.btoa(this.keyPair.publicKey),
      idKey
    };
    const resp = await this.securePost(messageData);

    if (resp && resp.success === 'true') {
      this.key = {
        id: resp.id,
        key: idKey
      };

      await this.write({
        ['xc-' + resp.hash]: this.key
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
  }
  'get-logins'(url) {
    return this.securePost({
      'action': 'get-logins',
      'keys': this.keys,
      url
    }).then(resp => {
      if (resp.errorCode === '15') { // no match
        return [];
      }
      if (resp.success === 'true') {
        return resp.entries;
      }
      throw Error(resp.error || 'Cannot retrieve credentials');
    });
  }
  /* stringFields seems to be ignored, Title (Name) is also ignored */
  'set-login'({url, submiturl, login, password, uuid, stringFields = []}) {
    return this.securePost({
      'action': 'set-login',
      url,
      submiturl,
      login,
      password,
      uuid,
      stringFields
    }).then(resp => {
      if (resp.success === 'true') {
        return;
      }
      throw Error(resp.error || 'Cannot set credential');
    });
  }
  'get-totp'(uuid) {
    return this.securePost({
      'action': 'get-totp',
      uuid
    }).then(resp => {
      if (resp.success === 'true') {
        return resp.totp;
      }
      return '';
    });
  }
  async search({url}) {
    try {
      await this['test-associate']();
    }
    catch (e) {
      await this.associate();
    }
    const resp = await this['get-logins'](url);

    return {
      Entries: resp.map(e => Object.assign(e, {
        from: 'keepassxc',
        Login: e.login,
        Name: e.name,
        Password: e.password,
        StringFields: (e.stringFields || []).map(o => Object.entries(o).reduce((p, [key, value]) => {
          p.Key = key.replace('KPH: ', ''),
          p.Value = value;
          return p;
        }, {}))
      }))
    };
  }
  async set(query) {
    try {
      await this['test-associate']();
    }
    catch (e) {
      await this.associate();
    }
    return this['set-login'](query);
  }
}
