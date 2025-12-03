let port;
try {
  port = document.getElementById('kph-tsGhyft');
  port.remove();
}
catch (e) {
  port = document.createElement('span');
  port.id = 'kph-tsGhyft';
  document.documentElement.append(port);
}

port.addEventListener('copy-data', e => {
  e.preventDefault();
  e.stopImmediatePropagation();

  const FLAGS = ['AT', 'UP', 'UV', 'BE'];
  chrome.runtime.sendMessage({
    cmd: 'passkey-interface',
    data: {
      ...e.detail,
      FLAGS,
      CREATE_BY: 'KPH@' + chrome.runtime.getManifest().version
    }
  });
});

// expose safe public data
chrome.runtime.sendMessage({
  cmd: 'passkey-public-data'
}).then(r => {
  port.dataset.args = JSON.stringify(r);
});
