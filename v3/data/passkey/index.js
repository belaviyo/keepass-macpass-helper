const args = new URLSearchParams(location.search);

const copy = content => navigator.clipboard.writeText(content).catch(e => {
  alert(e.message);
});

document.getElementById('data').value = args.get('data');

document.getElementById('save-name').onclick = () => copy(document.getElementById('name').value);
document.getElementById('save-value').onclick = () => copy(document.getElementById('data').value);

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
