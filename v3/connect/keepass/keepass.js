/* global SimpleStorage */

'use strict';

// eslint-disable-next-line no-unused-vars
class KeePass extends SimpleStorage {
  // convert String to Uint8Array
  static s2u(s) {
    return new Uint8Array(s.split('').map(c => c.charCodeAt(0)));
  }
  // convert unit8 to base64
  static u2b(unit8) {
    return btoa([...unit8].map(n => String.fromCharCode(n)).join(''));
  }

  constructor() {
    super();

    this.host = null;
    this.timeout = 20000;
  }
  async post(obj, timeout = this.timeout, sign = false, names = []) {
    const controller = new AbortController();

    if (this.id) {
      obj.Id = this.id;
    }
    if (sign) {
      const iv = this.iv();
      const e = await this.encrypt(iv);

      obj.Nonce = KeePass.u2b(iv);
      obj.Verifier = await e(obj.Nonce);

      for (const name of names) {
        if (obj[name]) {
          obj[name] = await e(obj[name], true);
        }
        else {
          delete obj[name];
        }
      }
    }

    setTimeout(() => controller.abort(), timeout);
    const r = await fetch(this.host, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(obj),
      signal: controller.signal
    }).catch(() => ({
      ok: false,
      status: -1
    }));
    if (r.ok) {
      return r.json();
    }
    let j;
    try {
      j = await r.json();
    }
    catch (e) {
      if (r.status === 503) {
        throw Error(`KeePassHTTP Failed (${r.status}). Is a database currently open?`);
      }
      throw Error(`KeePassHTTP Failed (${r.status}).` +
        ` Either KeePass is not running or communication is broken`);
    }
    throw Error(j.Error || 'Unknown Error');
  }
  // tools
  iv(n = 16) {
    return crypto.getRandomValues(new Uint8Array(n));
  }
  encrypt(iv) {
    const utf8encoder = new TextEncoder();

    return crypto.subtle.importKey('raw', this.key, 'AES-CBC', true, ['encrypt']).then(key => {
      return (data, native) => {
        data = native ? utf8encoder.encode(data) : KeePass.s2u(data);

        return crypto.subtle.encrypt({
          name: 'AES-CBC',
          iv
        }, key, data).then(ab => {
          return KeePass.u2b(new Uint8Array(ab));
        });
      };
    });
  }
  decrypt(iv) {
    const utf8decoder = new TextDecoder();

    return crypto.subtle.importKey('raw', this.key, 'AES-CBC', true, ['decrypt']).then(key => {
      return b64 => {
        const data = atob(b64);

        return crypto.subtle.decrypt({
          name: 'AES-CBC',
          iv
        }, key, KeePass.s2u(data)).then(ab => utf8decoder.decode(ab));
      };
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
      r = await this.post({
        'RequestType': 'test-associate',
        'TriggerUnlock': false
      });
    }
    catch (e) {
      throw Error(e.message);
    }

    this.version = Number((r.Version || '1.8.4.1').replace(/\./g, ''));

    if (r && r.Hash) {
      const prefs = await this.read({
        [r.Hash]: {},
        id: '',
        key: ''
      });
      // overwrite based on database
      if (prefs[r.Hash].id && prefs[r.Hash].key) {
        this.id = prefs[r.Hash].id;
        this.key = KeePass.s2u(atob(prefs[r.Hash].key));
      }
      else {
        this.id = prefs.id;
        this.key = KeePass.s2u(atob(prefs.key));
      }
    }
    else {
      throw Error(`Cannot detect database's hash`);
    }
  }
  test() {
    if (this.key) {
      return this.post({
        'RequestType': 'test-associate',
        'TriggerUnlock': true
      }, undefined, true);
    }
    else {
      throw Error('There is no saved key');
    }
  }
  async associate() {
    this.key = this.iv(32);
    const Key = KeePass.u2b(this.key);

    // we are going to run this function in background; in case the popup get closed
    const r = await this.post({
      'RequestType': 'associate',
      Key
    }, 120000, true);

    if (r && r.Success) {
      this.id = r.Id;
      await this.write({
        id: r.Id,
        [r.Hash]: {
          id: r.Id,
          key: Key
        }
      });
    }

    return r;
  }
  async logins({url, submiturl, realm}) {
    const r = await this.post({
      'RequestType': 'get-logins',
      'TriggerUnlock': 'true',
      'SortSelection': 'false',
      'Url': url,
      'SubmitUrl': submiturl,
      'Realm': realm
    }, undefined, true, ['Url', 'SubmitUrl', 'Realm']);
    if (r && r.Entries) {
      const iv = KeePass.s2u(atob(r.Nonce));

      const d = await this.decrypt(iv);

      for (let n = 0; n < r.Entries.length; n += 1) {
        const e = r.Entries[n];

        e.Login = await d(e.Login);
        e.Name = await d(e.Name);
        e.Password = await d(e.Password);
        e.uuid = await d(e.Uuid);
        e.from = 'keepass';
        if (e.Group && e.Group.Name) {
          e.path = await d(e.Group.Name).then(s => s.split('/'));
          e.group = e.path.at(-1);
        }

        for (let m = 0; m < (e.StringFields || []).length; m += 1) {
          const o = e.StringFields[m];
          o.Key = (await d(o.Key)).replace('KPH: ', '');
          o.Value = await d(o.Value);
        }
      }
    }
    return r;
  }
  /* stringFields seems to be ignored, Title (Name) is also ignored */
  async set({url, submiturl, name, login, password, uuid, stringFields = []}) {
    const iv = this.iv();
    const e = await this.encrypt(iv);

    const obj = {
      'RequestType': 'set-login',
      'Url': await e(url, true),
      'SubmitUrl': await e(submiturl || '', true),
      'Name': await e(name || '', true), // Supports on KeePassHTTP > 2.1.0.0
      'Login': await e(login || '', true),
      'Password': await e(password || '', true)
    };

    if (uuid) {
      obj.Uuid = uuid; // Assuming Uuid is sent unencrypted
    }

    // Supports on KeePassHTTP > 2.1.0.0
    if (stringFields.length > 0) {
      obj.StringFields = {};

      for (const {key, value} of stringFields) {
        obj.StringFields[await e(key, true)] = await e(value, true);
      }
    }

    obj.Nonce = KeePass.u2b(iv);
    obj.Verifier = await e(obj.Nonce);

    if (this.id) {
      obj.Id = this.id;
    }
    return this.post(obj, undefined, false);
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
