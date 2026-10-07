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

/* multi-database metadata stored in chrome.storage.local:
   {active: <fileKey>|null, files: {[fileKey]: {type, name, key}}}
   - fileKey is the IndexedDB auto-increment key of the "files" store (as string)
   - type is either 'database' or 'key'
   - "key" of a database entry is the fileKey of its assigned key file */
const KWMETA = {
  read() {
    return new Promise(resolve => chrome.storage.local.get({
      'kwpass-meta': null
    }, prefs => resolve(prefs['kwpass-meta'])));
  },
  write(meta) {
    return new Promise(resolve => chrome.storage.local.set({
      'kwpass-meta': meta
    }, resolve));
  }
};

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

        resolve(fileId);
      };

      fileRequest.onerror = e => reject(Error('write, ' + e.target.error));
      transaction.onerror = e => reject(Error('write, ' + e.target.error));
    });
  }
  // update a stored file by its IndexedDB key ("key" of the files store).
  // "overwrite" controls whether the extension overwrites the original file or not
  edit(key, newBytes, overwrite = false) {
    return new Promise((resolve, reject) => {
      const fileId = Number(key);
      const transaction = this.db.transaction('files', 'readwrite');
      const fileStore = transaction.objectStore('files');
      const getRequest = fileStore.get(fileId);

      // make sure the key exists; put() would silently create a new entry
      getRequest.onsuccess = () => {
        if (getRequest.result === undefined) {
          reject(Error(`File ${fileId} does not exist.`));
          return;
        }
        fileStore.put(newBytes, fileId);
      };

      transaction.oncomplete = async () => {
        if (overwrite) {
          try {
            const handle = await this.handle(fileId);
            if (handle) {
              const permission = await handle.queryPermission({mode: 'readwrite'});
              if (permission === 'denied') {
                throw Error('Write failed. Download latest database from Options page and reattach.');
              }
              else if (permission === 'prompt') {
                const result = await handle.requestPermission({mode: 'readwrite'});
                if (result === 'denied') {
                  throw Error('Write operation cancelled by user.');
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
          catch (e) {
            reject(Error(`The internal database has been updated, but I can't write to the local file.
Go to the options page and toggle the "Write changes back to the local file" setting to re-grant write permission.

--
` + e.message));
          }
        }
        else {
          resolve();
        }
      };
      getRequest.onerror = e => reject(Error('edit, ' + e.target.error));
      transaction.onerror = e => reject(Error('edit, ' + e.target.error));
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

  // entry: {key, bytes, handle} — used by the options page renderer
  list() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('files', 'readonly');
      const entries = [];
      transaction.objectStore('files').openCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          entries.push({
            key: cursor.key,
            bytes: cursor.value
          });
          cursor.continue();
        }
      };
      transaction.onerror = e => reject(Error('list, ' + e.target.error));
      transaction.oncomplete = () => resolve(entries);
    }).then(async entries => {
      for (const entry of entries) {
        entry.handle = await this.handle(entry.key);
      }
      return entries;
    });
  }

  // lightweight listing ({key, handle}) without the file bytes — used by meta resolution
  entries() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('files', 'readonly');
      const entries = [];
      transaction.objectStore('files').openKeyCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          entries.push({
            key: cursor.key
          });
          cursor.continue();
        }
      };
      transaction.onerror = e => reject(Error('entries, ' + e.target.error));
      transaction.oncomplete = async () => {
        for (const entry of entries) {
          entry.handle = await this.handle(entry.key);
        }
        resolve(entries);
      };
    });
  }

  // remove individual entries from both stores by keys
  remove(keys) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['files', 'handles'], 'readwrite');
      const fileStore = transaction.objectStore('files');
      const handleStore = transaction.objectStore('handles');
      for (const key of keys) {
        fileStore.delete(key);
        handleStore.delete(key);
      }
      transaction.oncomplete = resolve;
      transaction.onerror = e => reject(Error('remove, ' + e.target.error));
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
  /* resolve the current meta: stored user selections merged over the legacy
     positional layout (first stored file = the database, second = its key file),
     so that installations from before multiple databases was supported keep working.
     Dangling references (removed files) are dropped on the way */
  async resolveMeta() {
    const entries = await this.file.entries();
    if (entries.length === 0) {
      return {active: null, files: {}};
    }
    const stored = await KWMETA.read();

    const files = {};
    entries.forEach((entry, index) => {
      const key = String(entry.key);
      const o = stored?.files?.[key];
      files[key] = {
        type: o?.type === 'database' || o?.type === 'key' ? o.type : (index === 0 ? 'database' : 'key'),
        name: o?.name || entry.handle?.name || (index === 0 ? 'Database' : 'Key file'),
        key: null
      };
      // legacy layout: the second file is the key file of the first (database) one
      if (index === 1 && files[String(entries[0].key)].type === 'database') {
        files[String(entries[0].key)].key = key;
      }
    });

    // stored selections win over the positional defaults
    for (const [key, o] of Object.entries(stored?.files || {})) {
      if (!files[key]) { // the file is gone
        continue;
      }
      if (o.key === null) {
        files[key].key = null;
      }
      else if (o.key) {
        files[key].key = files[o.key] ? o.key : null;
      }
    }

    const firstDb = entries.map(e => String(e.key)).find(key => files[key].type === 'database');
    const active = stored?.active && files[stored.active]?.type === 'database' ?
      stored.active : (firstDb || null);

    return {active, files};
  }
  /* apply a mutation to the resolved meta and persist the result;
     returns whatever the mutator returns */
  async patchMeta(mutator) {
    const meta = await this.resolveMeta();
    const result = mutator(meta);
    await KWMETA.write(meta);
    return result;
  }
  /* the active database entry and its assigned key file entry (bytes included) */
  async active() {
    const meta = await this.resolveMeta();
    if (!meta.active) {
      throw Error('No database. Use options page to add a database');
    }
    const entries = await this.file.list();
    const dbEntry = entries.find(e => String(e.key) === meta.active);
    if (!dbEntry) {
      throw Error('No database. Use options page to add a database');
    }
    const assigned = meta.files[meta.active]?.key;
    const keyEntry = assigned ? entries.find(e => String(e.key) === assigned) : null;

    return {meta, db: dbEntry, key: keyEntry || null};
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
      // only edit the active database file, not its assigned key file
      await this.file.edit(this.dbKey, new Uint8Array(ab), this.overwrite);
    }
    catch (e) {
      throw Error('Is database unlocked?\n\n' + e.message);
    }
  }
  async open(password) {
    password = kdbxweb.ProtectedValue.fromString(password);

    const {db, key} = await this.active();
    this.key = key?.bytes;
    this.dbKey = db.key;

    const credentials = new kdbxweb.Credentials(password, key?.bytes);
    return kdbxweb.Kdbx.load(db.bytes.buffer, credentials).then(instance => {
      this.db = instance;
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

    await this.file.edit(this.dbKey, new Uint8Array(ab), this.overwrite);
  }
  /* create a blank database, add it to the internal storage and activate it
     when there is no active database yet */
  async create(password) {
    const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password));
    this.db = kdbxweb.Kdbx.create(credentials, 'KeePassHelper Database');
    const ab = await this.db.save();
    const {db: fileKey} = await this.attach(new Uint8Array(ab));
    this.dbKey = fileKey;

    await this.patchMeta(meta => {
      meta.files[String(fileKey)] = {
        type: 'database',
        name: this.db.meta.name || 'Database',
        key: null
      };
      if (!meta.active) {
        meta.active = String(fileKey);
      }
    });
  }
  /* add a database and optionally its key file to the internal storage;
     returns the new IndexedDB file keys (meta registration is up to the caller) */
  async attach(fileBytes, keyBytes = null, fileHandle = null, keyHandle = null) {
    const db = await this.file.write(fileBytes, fileHandle);
    const key = keyBytes ? await this.file.write(keyBytes, keyHandle) : null;
    return {db, key};
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
    await this.file.clear();
    await KWMETA.write({
      active: null,
      files: {}
    });
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
