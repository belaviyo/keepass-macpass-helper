/* global engine */

chrome.storage.local.get({
  engine: 'keepass'
}, async prefs => {
  try {
    await engine.prepare(prefs.engine);
    if (prefs.engine === 'keepassxc') {
      engine.core.timeout = 10 * 60 * 1000; // prevent it from breaking connection to let the user proceed.
    }
    await engine.core.associate();
    window.close();
  }
  catch (e) {
    console.warn(e);
    alert(e.message);
  }
});
