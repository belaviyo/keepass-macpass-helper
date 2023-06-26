/* global Safe */

class SyncedStorage {
  get(key) {
    return new Promise(resolve => chrome.storage.sync.get(key, prefs => resolve(prefs[key])));
  }
  set(key, value) {
    if (key === '') {
      return Promise.reject(Error('EMPTY_KEY'));
    }
    return new Promise(resolve => chrome.storage.sync.set({
      [key]: value
    }, resolve));
  }
  remove(key) {
    return new Promise(resolve => chrome.storage.sync.remove(key, resolve));
  }
  clear() {
    return new Promise(resolve => chrome.storage.sync.clear(resolve));
  }
}

class SecureSyncedStorage {
  #prefix = 'A:';
  #safe = new Safe();
  #encoder = new TextEncoder();

  async #hash(string) {
    const ab = this.#encoder.encode(string);
    const buffer = await crypto.subtle.digest('SHA-256', ab);
    return [...new Uint8Array(buffer)].map(e => e.toString(16).padStart(2, '0')).join('');
  }
  open(password) {
    this.storage = new SyncedStorage();
    return this.#safe.open(password);
  }
  import(string) { // alternative method to open the db
    this.storage = new SyncedStorage();
    return this.#safe.import(string);
  }
  async convert(href) {
    const ek = await this.#safe.export();
    return ek + '@' + (new URL(href)).hostname;
  }
  async find(uuid, match = () => true, stat = () => {}) {
    const hash = await this.#hash(uuid);
    const values = await this.storage.get(this.#prefix + hash);

    if (values && values.length) {
      let failed = 0;
      return Promise.all(values.map(v => {
        // ignore wrong password
        return this.#safe.decrypt(v).catch(e => {
          console.warn('cannot decrypt; wrong password', e);
          failed += 1;

          return;
        });
      })).then(vs => {
        vs = vs.filter(a => a).map(JSON.parse);

        stat(failed, vs.length, values.length);
        return vs.filter(match);
      });
    }
    return [];
  }
  async append(uuid, object) {
    const value = await this.#safe.encrypt(JSON.stringify(object));
    const hash = await this.#hash(uuid);

    const values = (await this.storage.get(this.#prefix + hash)) || [];
    return this.storage.set(this.#prefix + hash, [
      ...values,
      value
    ]);
  }
  async remove(uuid, match = () => false) {
    const hash = await this.#hash(uuid);

    return this.find(uuid).then(values => {
      const ns = [];
      values.forEach((v, n) => {
        if (match(v) === false) {
          ns.push(n);
        }
      });

      if (ns.length && ns.length !== values.length) {
        return this.storage.get(this.#prefix + hash).then(as => {
          as = as.filter((v, n) => ns.includes(n) ? false : true);
          return this.storage.set(this.#prefix + hash, as);
        });
      }
      else if (ns.length === values.length) {
        return this.storage.remove(this.#prefix + hash);
      }
    });
  }
  clear() {
    return this.storage.clear();
  }
}

