/* global SimpleStorage */
'use strict';

class KeePass extends SimpleStorage {
  // convert String to Uint8Array
  static s2u(s) {
    return new Uint8Array(s.split('').map(c => c.charCodeAt(0)));
  }
  // converts b64 to Uint8Array
  static b2u(b64) {
    return KeePass.s2u(atob(b64));
  }
  // converts Array Buffer to String
  static b2s(ab) {
    return [...new Uint8Array(ab)].map(n => String.fromCharCode(n)).join('');
  }

  constructor() {
    super();

    this.host = null;
    this.timeout = 20000;
  }
  post(obj, timeout = this.timeout) {
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
  encrypt(iv) {
    const {b2u} = KeePass;

    const aiv = b2u(iv);
    return crypto.subtle.importKey('raw', b2u(this.key), 'AES-CBC', true, ['encrypt']).then(key => {
      return data => crypto.subtle.encrypt({
        name: 'AES-CBC',
        iv: aiv
      }, key, KeePass.s2u(data)).then(s => btoa(KeePass.b2s(s)));
    });
  }
  decrypt(iv) {
    const {b2u} = KeePass;

    return crypto.subtle.importKey('raw', b2u(this.key), 'AES-CBC', true, ['decrypt']).then(key => {
      const aiv = b2u(iv);
      return data => crypto.subtle.decrypt({
        name: 'AES-CBC',
        iv: aiv
      }, key, b2u(data)).then(ab => KeePass.b2s(ab));
    });
  }
  // internals
  async verify(request) {
    const iv = this.iv();

    request = {
      ...request,
      Nonce: iv,
      Verifier: await this.encrypt(iv).then(e => e(iv))
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
    const {host} = await this.read({
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
      const prefs = await this.read({
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
  async test() {
    if (this.key) {
      const request = await this.verify({
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
    const request = await this.verify({
      'RequestType': 'associate',
      'Key': this.key
    });
    // we are going to run this function in background; in case the popup get closed
    const r = await this.post(request, 120000, 'associate');

    if (r && r.Success) {
      this.id = r.Id;
      await this.write({
        id: r.Id,
        [r.Hash]: {
          id: r.Id,
          key: this.key
        }
      });
    }

    return r;
  }
  async logins({url, submiturl, realm}) {
    const request = await this.verify({
      'RequestType': 'get-logins',
      'TriggerUnlock': 'true',
      'SortSelection': 'false'
    });
    const iv = request.Nonce;
    const e = await this.encrypt(iv);

    request.Url = await e(url);
    if (submiturl) {
      request.SubmitUrl = await e(submiturl);
    }
    if (realm) {
      request.Realm = await e(realm);
    }
    const r = await this.post(request);
    if (r && r.Entries) {
      const iv = r.Nonce;
      const d = await this.decrypt(iv);

      for (let n = 0; n < r.Entries.length; n += 1) {
        const e = r.Entries[n];

        e.Login = await d(e.Login);
        e.Name = await d(e.Name);
        e.Password = await d(e.Password);

        for (let m = 0; m < (e.StringFields || []).length; m += 1) {
          const o = e.StringFields[m];
          o.Key = (await d(o.Key)).replace('KPH: ', '');
          o.Value = await d(o.Value);
        }
      }
    }
    return r;
  }
  async set({url, submiturl, login, password}) {
    const request = await this.verify({
      'RequestType': 'set-login'
    });
    const iv = request.Nonce;
    const e = await this.encrypt(iv);
    Object.assign(request, {
      'Login': await e(login),
      'Password': await e(password),
      'Url': await e(url),
      'SubmitUrl': await e(submiturl)
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
        this.search(query);
      }
      throw Error('Communication is rejected! Is your database open?');
    }
  }
}
