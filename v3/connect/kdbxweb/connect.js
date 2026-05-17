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
      const request = indexedDB.open(name, 2); // Updated version
      request.onerror = reject;
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', {
            autoIncrement: true
          });
        }

        // Create handles object store for storing file handles with same keys
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles');
        }
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

  write(bytes, handle = null) { // Added optional handle parameter
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files', 'handles'], 'readwrite');

      // Store the file with its data
      const fileStore = transaction.objectStore('files');
      const fileRequest = fileStore.add(bytes);

      fileRequest.onsuccess = () => {
        const fileId = fileRequest.result;

        // If a handle was provided, store it with the same key
        if (handle !== null) {
          const handleStore = transaction.objectStore('handles');
          handleStore.add(handle, fileId);
        }

        resolve();
      };

      fileRequest.onerror = e => reject(Error('write, ' + e.target.error));
      transaction.onerror = e => reject(Error('write, ' + e.target.error));
    });
  }
  // edit content based on the current stored index not keyPath.
  // "overwrite" controls whether the extension overwrites the original file or not
  edit(index, newBytes, overwrite = false) {
    return new Promise((resolve, reject) => {
      // Helper function to get all file keys
      const getAllFileKeys = () => {
        return new Promise((resolveKeys, rejectKeys) => {
          const transaction = this.db.transaction('files', 'readonly');
          const keys = [];
          transaction.objectStore('files').openKeyCursor().onsuccess = e => {
            const cursor = e.target.result;
            if (cursor) {
              keys.push(cursor.key);
              cursor.continue();
            }
          };
          transaction.onerror = e => rejectKeys(Error('getAllFileKeys, ' + e.target.error));
          transaction.oncomplete = () => resolveKeys(keys);
        });
      };

      getAllFileKeys().then(keys => {
        if (index < 0 || index >= keys.length) {
          reject(Error(`Index ${index} out of range. Only ${keys.length} files exist.`));
          return;
        }

        const fileId = keys[index];
        const transaction = this.db.transaction('files', 'readwrite');
        const fileStore = transaction.objectStore('files');
        const putRequest = fileStore.put(newBytes, fileId);

        transaction.oncomplete = async () => {
          if (overwrite) {
            const handle = await this.handle(fileId);
            if (handle) {
              const permission = await handle.queryPermission({mode: 'readwrite'});

              if (permission === 'denied') {
                return reject(Error('Write failed. Download latest database from Options page and reattach.'));
              }
              else if (permission === 'prompt') {
                const result = await handle.requestPermission({mode: 'readwrite'});
                if (result === 'denied') {
                  return reject(Error('Write operation cancelled by user.'));
                }
              }

              // Create a writable stream
              const writable = await handle.createWritable();
              await writable.write(newBytes);
              await writable.close();
              resolve();
            }
            else {
              resolve();
            }
          }
          else {
            resolve();
          }
        };
        putRequest.onerror = e => reject(Error('edit, ' + e.target.error));
        transaction.onerror = e => reject(Error('edit, ' + e.target.error));
      }).catch(reject);
    });
  }

  clear() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files', 'handles'], 'readwrite');

      // Clear both stores
      const fileClear = transaction.objectStore('files').clear();
      const handleClear = transaction.objectStore('handles').clear();

      let completed = 0;
      fileClear.onsuccess = handleClear.onsuccess = () => {
        completed += 1;
        if (completed === 2) {
          resolve();
        }
      };
      fileClear.onerror = e => reject(Error('clear, ' + e.target.error));
      handleClear.onerror = e => reject(Error('clear, ' + e.target.error));
    });
  }

  // retrieve a handle by file ID (used by read if needed)
  handle(keypath = null) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('handles', 'readonly');
      const store = transaction.objectStore('handles');

      // If keypath is provided, get that specific handle
      if (keypath) {
        const request = store.get(keypath);
        request.onsuccess = () => resolve(request.result);
        request.onerror = e => reject(Error('getHandle, ' + e.target.error));
      }
      // Get the first available handle
      else {
        const request = store.openCursor();
        request.onsuccess = e => {
          const cursor = e.target.result;
          if (cursor) {
            resolve(cursor.value);
          }
          else {
            resolve(null); // No handles available
          }
        };
        request.onerror = e => reject(Error('getHandle, ' + e.target.error));
      }
    });
  }
}

class KWPASS {
  constructor(overwrite = false) {
    this.overwrite = overwrite;
  }
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
      // only edit file (index = 0) not key (index = 1)
      await this.file.edit(0, new Uint8Array(ab), this.overwrite);
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

    await this.file.edit(0, new Uint8Array(ab), this.overwrite);
  }
  /* create a blank database */
  async create(password) {
    const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password));
    this.db = kdbxweb.Kdbx.create(credentials, 'KeePassHelper Database');
    const ab = await this.db.save();
    this.attach(new Uint8Array(ab));
  }
  async attach(fileBytes, keyBytes, fileHandle, keyHandle) {
    await this.file.write(fileBytes, fileHandle);
    if (keyBytes) {
      await this.file.write(keyBytes, keyHandle);
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
