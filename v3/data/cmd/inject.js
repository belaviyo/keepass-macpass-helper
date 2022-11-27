'use strict';

function editable(e) {
  const node = e && e.nodeName.toLowerCase();
  if (e && e.nodeType === 1 && (node === 'textarea' ||
    (node === 'input' && /^(?:text|email|number|search|tel|url|password)$/i.test(e.type)))) {
    return e;
  }
  return e ? (e.isContentEditable ? e : null) : null;
}

// will be used to focus the element after text insertion
window.aElement = editable(document.activeElement);

// try to find used usernames
{
  const forms = [...document.querySelectorAll('input[type=password]')]
    .map(p => p.form)
    .filter(f => f)
    .filter((f, i, l) => l.indexOf(f) === i);

  // https://github.com/belaviyo/keepass-macpass-helper/issues/69
  // https://login.aliexpress.com/
  if (forms.length === 0) {
    const password = document.querySelector('input[type=password]');
    if (password) {
      let parent = password.parentElement;
      while (parent !== document.body && parent.querySelector('input[type=email],input[type=text]') === null) {
        parent = parent.parentElement;
      }

      if (parent.querySelector('input[type=email],input[type=text]')) {
        forms.push(parent);
      }
    }
  }

  const usernames = forms.map(f => {
    return [...f.querySelectorAll('input:not([type=password])')].filter(i => {
      return (i.type === 'text' || i.type === 'email') && i.getBoundingClientRect().width > 0;
    });
  }).flat();

  // select username field if it is not selected
  if (usernames.length && !window.aElement) {
    window.aElement = usernames[0];
    window.aElement.focus();
    window.aElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  // return (do not add ;)
  ({
    usernames: usernames.map(e => e.value),
    aElement: Boolean(window.aElement)
  // eslint-disable-next-line semi
  })
}
