/* global kdbxweb, tldjs */

kdbxweb.CryptoEngine.setArgon2Impl((password, salt, memory, iterations, length, parallelism, type, version) => {
  return import('/connect/kdbxweb/noble/hashes/argon2.js').then(({argon2d, argon2id}) => {
    const argon2 = type === 0 ? argon2d : argon2id;

    const bytes = argon2(new Uint8Array(password), new Uint8Array(salt), {
      t: iterations,
      m: memory,
      p: parallelism,
      dkLen: length,
      version
    });

    return bytes.buffer;
  });
});

class KWFILE {
  open(name = 'database') {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(name, 1);
      request.onerror = reject;
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = () => {
        request.result.createObjectStore('files', {
          autoIncrement: true
        });
      };
    });
  }
  read() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('files', 'readonly');
      const files = [];
      transaction.objectStore('files').openCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          files.push(cursor.value);
          cursor.continue();
        }
      };
      transaction.onerror = e => reject(Error('read, ' + e.target.error));
      transaction.oncomplete = () => resolve(files);
    });
  }
  write(bytes) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('files', 'readwrite');
      transaction.oncomplete = resolve;
      transaction.onerror = e => reject(Error('write, ' + e.target.error));
      transaction.objectStore('files').add(bytes);
    });
  }
  clear() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('files', 'readwrite');
      const req = transaction.objectStore('files').clear();
      req.onsuccess = resolve;
      req.onerror = e => {
        reject(Error('read, ' + e.target.error));
      };
    });
  }
}
class KWPASS {
  prepare() {
    this.file = new KWFILE();
    return this.file.open();
  }
  search({url, submiturl, login, password}, clean = true) {
    const {hostname} = new URL(url || submiturl);

    const domain = tldjs.getDomain(url);
    const matches = [];
    const step = group => {
      if (group.name === 'Recycle Bin') {
        return;
      }
      for (const g of (group.groups || [])) {
        step(g);
      }
      for (const entry of group.entries) {
        const entryUrl = entry.fields.get('URL');

        if (entryUrl && (
          entryUrl.includes('://' + hostname) ||
          entryUrl.includes('://' + domain) ||
          entryUrl.indexOf(hostname) === 0 ||
          entryUrl.indexOf(domain) === 0)) {
          matches.push(entry);
        }
      }
    };

    for (const group of this.db.groups) {
      step(group);
    }

    return Promise.resolve({
      Entries: matches.map(e => {
        let Password = '';
        if (e.fields.has('Password')) {
          const p = e.fields.get('Password');
          if (p) {
            Password = p.getText();
          }
        }
        const StringFields = [];
        for (const [key, value] of e.fields.entries()) {
          StringFields.push({
            Key: key.replace(/^KPH:\s*/, ''),
            Value: typeof value === 'object' ? value.getText() : value
          });
        }

        return {
          from: 'kwpass',
          uuid: e.uuid.id,
          group: e.parentGroup.name,
          Login: e.fields.get('UserName'),
          Name: e.fields.get('Title'),
          Password,
          StringFields
        };
      })
    });
  }
  async set(query) {
    const {url, submiturl, name, login, password, stringFields = []} = query;
    try {
      const group = this.db.getDefaultGroup();
      const entry = this.db.createEntry(group);
      entry.pushHistory();
      for (const {key, value} of stringFields) {
        entry.fields.set(key, value);
      }
      entry.fields.set('Title', name || '');
      entry.fields.set('UserName', login || '');
      entry.fields.set('URL', url || submiturl);
      entry.fields.set('Password', kdbxweb.ProtectedValue.fromString(password || ''));
      entry.times.update();

      const ab = await this.db.save();
      await this.dettach(true);
      return this.attach(new Uint8Array(ab), this.key);
    }
    catch (e) {
      throw Error('Is database unlocked? ' + e.message);
    }
  }
  async open(password) {
    password = kdbxweb.ProtectedValue.fromString(password);

    const files = await this.file.read();
    this.key = files[1];

    if (files.length < 1) {
      throw Error('No database. Use options page to add a database');
    }
    const credentials = new kdbxweb.Credentials(password, files[1]);
    return kdbxweb.Kdbx.load(files[0].buffer, credentials).then(db => {
      this.db = db;
    }).catch(e => {
      console.warn(e);
      throw Error('Cannot open database; ' + e.message);
    });
  }
  /* remove */
  async remove(uuids) {
    const rms = [];
    const step = group => {
      if (group.name === 'Recycle Bin') {
        return;
      }

      for (const g of (group.groups || [])) {
        step(g);
      }
      for (const entry of group.entries) {
        if (uuids.includes(entry.uuid.id)) {
          rms.push(entry);
        }
      }
    };

    for (const group of this.db.groups) {
      step(group);
    }
    for (const entry of rms) {
      this.db.remove(entry);
    }

    const ab = await this.db.save();
    await this.dettach(true);
    return this.attach(new Uint8Array(ab), this.key);
  }
  /* create a blank database */
  async create(password) {
    const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password));
    this.db = kdbxweb.Kdbx.create(credentials, 'KeePassHelper Database');
    const ab = await this.db.save();
    this.attach(new Uint8Array(ab));
  }
  async attach(fileBytes, keyBytes) {
    await this.file.write(fileBytes);
    if (keyBytes) {
      await this.file.write(keyBytes);
    }
  }
  async dettach(silent) {
    if (silent !== true) {
      const files = await this.file.read();
      if (files.length) {
        const a = confirm(`The old database will be removed from internal storage.
Any new credentials saved in this database will be lost. Are you sure you want to continue?`);
        if (a === false) {
          throw Error('ABORTED');
        }
      }
    }
    return this.file.clear();
  }
  async export() {
    this.db.upgrade(); // upgrade the db to latest version (currently KDBX4)

    const ab = await this.db.save();
    const blob = new Blob([new Uint8Array(ab)], {
      type: 'octet/stream'
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'KeePassHelper.kdbx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
}
