/* globals sjcl, storage */
'use strict';

class KeePass {
  constructor() {
    this.host = null;
    this.timeout = 20000;
  }
  post(obj, timeout = this.timeout, type = '') {
    const controller = new AbortController();

    setTimeout(() => controller.abort(), timeout);
    return fetch(this.host, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(obj),
      signal: controller.signal
    }).then(r => {
      if (r.ok) {
        return r.json();
      }
      throw Error('Cannot connect to KeePassHTTP. Either KeePass is not running or communication is broken');
    });
  }
  // tools
  iv(n = 16) {
    const iv = [...crypto.getRandomValues(new Uint8Array(n))].map(n => String.fromCharCode(n)).join('');
    return btoa(iv);
  }
  encrypt(data, iv) {
    const enc = sjcl.mode.cbc.encrypt(
      new sjcl.cipher.aes(sjcl.codec.base64.toBits(this.key)),
      sjcl.codec.utf8String.toBits(data),
      sjcl.codec.base64.toBits(iv)
    );
    return sjcl.codec.base64.fromBits(enc);
  }
  decrypt(data, iv) {
    const dec = sjcl.mode.cbc.decrypt(
      new sjcl.cipher.aes(sjcl.codec.base64.toBits(this.key)),
      sjcl.codec.base64.toBits(data),
      sjcl.codec.base64.toBits(iv));
    return sjcl.codec.utf8String.fromBits(dec);
  }
  // internals
  verify(request) {
    const iv = this.iv();

    request = {
      ...request,
      Nonce: iv,
      Verifier: this.encrypt(iv, iv)
    };
    if (this.id) {
      request.Id = this.id;
    }
    return request;
  }
  // test
  blind() {
    return this.post({
      'RequestType': 'test-associate',
      'TriggerUnlock': false
    });
  }
  async prepare() {
    const {host} = await storage.remote({
      host: 'http://localhost:19455'
    });
    this.host = host;
    // find database hash
    let r;
    try {
      r = await this.blind();
    }
    catch (e) {
      throw Error(`Cannot connect to the database at "${host}"`);
    }
    if (r && r.Hash) {
      const prefs = await storage.remote({
        [r.Hash]: {},
        id: '',
        key: ''
      });
      // overwrite based on database
      if (prefs[r.Hash].id && prefs[r.Hash].key) {
        Object.assign(this, prefs[r.Hash]);
      }
      else {
        Object.assign(this, {
          id: prefs.id,
          key: prefs.key
        });
      }
    }
    else {
      throw Error(`Cannot detect database's hash`);
    }
  }
  test() {
    if (this.key) {
      const request = this.verify({
        'RequestType': 'test-associate',
        'TriggerUnlock': true
      });
      return this.post(request);
    }
    else {
      throw Error('There is no saved key');
    }
  }
  async associate() {
    this.key = this.iv(32);
    const request = this.verify({
      'RequestType': 'associate',
      'Key': this.key
    });
    // we are going to run this function in background; in case the popup get closed
    const r = await this.post(request, 120000, 'associate');
    this.id = r.Id;

    return r;
  }
  async logins({url, submiturl, realm}) {
    const request = this.verify({
      'RequestType': 'get-logins',
      'TriggerUnlock': 'true',
      'SortSelection': 'false'
    });
    const iv = request.Nonce;
    request.Url = this.encrypt(url, iv);
    if (submiturl) {
      request.SubmitUrl = this.encrypt(submiturl, iv);
    }
    if (realm) {
      request.Realm = this.encrypt(realm, iv);
    }
    const r = await this.post(request);
    if (r && r.Entries) {
      const iv = r.Nonce;
      r.Entries = r.Entries.map(e => Object.assign(e, {
        Login: this.decrypt(e.Login, iv),
        Name: this.decrypt(e.Name, iv),
        Password: this.decrypt(e.Password, iv),
        StringFields: (e.StringFields || []).map(o => Object.assign({
          Key: this.decrypt(o.Key, iv).replace('KPH: ', ''),
          Value: this.decrypt(o.Value, iv)
        }))
      }));
    }
    return r;
  }
  set({url, submiturl, login, password}) {
    const request = this.verify({
      'RequestType': 'set-login'
    });
    const iv = request.Nonce;
    Object.assign(request, {
      'Login': this.encrypt(login, iv),
      'Password': this.encrypt(password, iv),
      'Url': this.encrypt(url, iv),
      'SubmitUrl': this.encrypt(submiturl, iv)
    });
    return this.post(request);
  }
  // high-level access
  async search(query) {
    try {
      const r = await this.test();

      if (r && r.Success) {
        return this.logins(query);
      }
      throw Error('response is not valid');
    }
    catch (e) {
      console.warn(e);
      const r = await this.associate();
      if (r && r.Success) {
        return new Promise((resolve, reject) => chrome.storage.local.set({
          id: r.Id
        }, () => {
          this.id = r.Id;
          this.search(query).then(resolve, reject);
        }));
      }
      throw Error('Communication is rejected! Is your database open?');
    }
  }
}
