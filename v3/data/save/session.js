if (typeof chrome.storage.session === 'undefined') {
  chrome.storage.session = {
    get(prefs, callback) {
      chrome.runtime.sendMessage({
        cmd: 'session-storage-get',
        prefs
      }, callback);
    }
  };
}
