/* global kdbxweb, tldjs */

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
  search({url, submiturl}) {
    const {hostname} = new URL(url || submiturl);

    const domain = tldjs.getDomain(url);
    const matches = [];
    const step = group => {
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
            Password = e.fields.get('Password').getText();
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
      for (const {Key, Value} of stringFields) {
        entry.fields.set(Key, Value);
      }
      entry.fields.set('Title', name || '');
      entry.fields.set('UserName', login || '');
      entry.fields.set('URL', url || submiturl);
      entry.fields.set('Password', kdbxweb.ProtectedValue.fromString(password || ''));
      entry.times.update();

      const ab = await this.db.save();
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
  async attach(fileBytes, keyBytes) {
    await this.dettach();
    await this.file.write(fileBytes);
    if (keyBytes) {
      await this.file.write(keyBytes);
    }
  }
  dettach() {
    return this.file.clear();
  }
  export() {
    this.db.save().then(ab => {
      const blob = new Blob([new Uint8Array(ab)], {
        type: 'octet/stream'
      });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'keepass.kdbx';
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(href);
      }, 1000);
    });
  }
}
