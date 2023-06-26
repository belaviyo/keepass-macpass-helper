/* global psbox engine Safe */

document.getElementById('ssdb').onclick = () => {
  psbox.querySelector('span').textContent = 'Unlock Secure Synced Storage';
  psbox.classList.remove('hidden');
  psbox.querySelector('input').select();
  psbox.querySelector('input').focus();
  psbox.onsubmit = e => {
    e.preventDefault();
    psbox.classList.add('hidden');

    const password = psbox.querySelector('input').value;
    if (password) {
      const safe = new Safe();
      safe.open(password).then(() => {
        safe.export().then(s => chrome.storage.session.set({
          'ssdb-exported-key': s
        }, () => location.reload()));
      });
    }
  };
};

engine.connected = new Proxy(engine.connected, {
  apply(target, self, args) {
    if (!engine.ssdb) {
      document.getElementById('ssdb').classList.remove('hidden');
      document.getElementById('ssdb').disabled = false;
    }

    return Reflect.apply(target, self, args);
  }
});
