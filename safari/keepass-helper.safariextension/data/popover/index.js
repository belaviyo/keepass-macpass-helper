/* globals safari, KeePass */
'use strict';

/* rest */
var list = document.getElementById('list');
var search = document.querySelector('input[type=search]');
var usernames = [], tab, url;
var keepass = new KeePass();

function add (login, password) {
  let entry = document.createElement('option');
  entry.dataset.password = password || '';
  entry.textContent = entry.dataset.login = login;
  if (usernames.indexOf(login) !== -1) {
    entry.selected = true;
  }
  list.appendChild(entry);
}

function submit () {
  let query = search.value || url;
  search.value = query;
  list.textContent = '';
  Array.from(document.getElementById('toolbar').querySelectorAll('input')).forEach(input => {
    if (input.dataset.cmd !== 'close') {
      input.disabled = true;
    }
  });

  keepass.itl({
    url: query,
  }, (error, response) => {
    if (error) {
      return add(error);
    }
    response.Entries = response.Entries || [];
    response.Entries.forEach((e) => add(e.Login, e.Password));
    if (response.Success === 'false') {
      return add('Something went wrong!');
    }
    if (response.Entries.length === 0) {
      add('No match!');
    }
    else {
      // if no username is detected, select the first one
      let checked = document.querySelector('#list :checked');
      if (!checked) {
        checked = document.querySelector('option');
        checked.selected = true;
      }
      checked.dispatchEvent(new Event('change', {
        bubbles: true
      }));
      window.focus();
      document.querySelector('select').focus();
    }
  });
}

function copy (str) {
  document.oncopy = (event) => {
    event.clipboardData.setData('text/plain', str);
    event.preventDefault();
  };
  document.execCommand('Copy', false, null);
}

document.addEventListener('search', submit);

document.addEventListener('change', e => {
  let target = e.target;
  if (target.nodeName === 'OPTION') {
    let disabled = !target.dataset.password;
    Array.from(document.getElementById('toolbar').querySelectorAll('input')).forEach(input => {
      if (input.dataset.cmd !== 'close') {
        input.disabled = disabled;
      }
    });
  }
});

document.addEventListener('keydown', e => {
  let metaKey = e.metaKey || e.altKey;
  if (e.code === 'Escape') {
    document.querySelector('[data-cmd="close"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyC') {
    document.querySelector('[data-cmd="copy"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyX') {
    document.querySelector('[data-cmd="copy"]').dispatchEvent(
      new CustomEvent('click', {
        'detail': 'password',
        'bubbles': true
      })
    );
    e.preventDefault();
  }
  else if (metaKey && e.keyCode === 66) {
    if (e.shiftKey) {
      document.querySelector('[data-cmd="insert-both"]').click();
    }
    else {
      document.querySelector('[data-cmd="insert-both"]').dispatchEvent(
        new CustomEvent('click', {
          'detail': 'no-submit',
          'bubbles': true
        })
      );
    }
    e.preventDefault();
  }
  else if (metaKey && e.keyCode === 85) {
    document.querySelector('[data-cmd="insert-login"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.keyCode === 80) {
    document.querySelector('[data-cmd="insert-password"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.keyCode === 70) {
    search.focus();
    e.preventDefault();
  }
  else if (e.keyCode === 13) {
    if (e.target.nodeName === 'SELECT') {
      document.querySelector('[data-cmd="insert-both"]').click();
    }
  }
});

document.addEventListener('click', e => {
  let target = e.target;
  let cmd = target.dataset.cmd;
  if (cmd && cmd.startsWith('insert-')) {
    let checked = document.querySelector('#list :checked');
    chrome.runtime.sendMessage({
      cmd,
      detail: e.detail,
      login: checked.dataset.login,
      password: checked.dataset.password
    });
  }
  else if (cmd && cmd.startsWith('copy')) {
    let checked = document.querySelector('#list :checked');
    copy(checked.dataset[e.detail === 'password' ? 'password' : 'login']);
  }
  else if (cmd === 'close') {
    chrome.runtime.sendMessage({
      cmd: 'close-me'
    });
  }
});

/* safari related */
safari.application.addEventListener('popover', () => {
  chrome.runtime.sendMessage({
    cmd: 'inspect'
  });
  tab = safari.application.activeBrowserWindow.activeTab;
  url = tab.url || 'https://www.google.com';
  search.value = url;
  submit();
}, true);
safari.application.addEventListener('message', (e) => {
  if (e.name === 'page' && e.message.cmd === 'guesses') {
    usernames = e.message.guesses;
    Array.from(list.querySelectorAll('label')).forEach(entry => {
      if (usernames.indexOf(entry.dataset.login) !== -1) {
        entry.querySelector('input').checked = true;
      }
    });
  }
});
