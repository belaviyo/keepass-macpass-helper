/* global engine */
const args = new URLSearchParams(location.search);

const copy = content => navigator.clipboard.writeText(content).catch(e => {
  alert(e.message);
});

document.getElementById('data').value = args.get('data');

document.getElementById('save-name').onclick = () => copy(document.getElementById('name').value);
document.getElementById('save-value').onclick = () => copy(document.getElementById('data').value);

onbeforeunload = e => {
  event.preventDefault();
  event.returnValue = '';
};
document.getElementById('done').onclick = () => {
  onbeforeunload = () => {};
  close();
};
document.getElementById('refresh').onclick = () => {
  onbeforeunload = () => {};
  location.reload();
};

engine.prepare('none').then(() => {
  if (engine.ssdb) {
    const json = JSON.parse(args.get('data'));

    document.getElementById('ssdb').disabled = false;
    document.getElementById('ssdb').onclick = async () => {
      document.getElementById('ssdb').disabled = true;
      try {
        const uuid = (await engine.ssdb.convert(args.get('href'))).at(0);
        await engine.ssdb.append(uuid, {
          'Url': args.get('href'),
          'SubmitUrl': '',
          'Login': json.USERNAME + ' (' + json.CREDENTIAL_ID + ')',
          'Name': 'Passkey',
          'Password': '11',
          'StringFields': [{
            Key: 'PASSKEY_STORAGE',
            Value: args.get('data')
          }]
        });
        document.getElementById('ssdb').value = 'Saved';
      }
      catch (e) {
        console.error(e);
        alert(e.message);
        document.getElementById('ssdb').value = 'Error';
      }
    };
  }
  else {
    document.getElementById('ssdb-info').style.display = 'contents';
  }
});

document.getElementById('keepass').onclick = () => {
  alert(`Please manually save the data as a string field in your KeePass database.

This extension cannot insert or update string fields automatically.`);
};

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
