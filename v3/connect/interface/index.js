/* global engine */

chrome.storage.local.get({
  engine: 'keepass'
}, async prefs => {
  try {
    await engine.prepare(prefs.engine);
    await engine.core.associate();
    window.close();
  }
  catch (e) {
    console.warn(e);
    alert(e.message);
  }
});
