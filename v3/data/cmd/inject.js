'use strict';

// find the active editable element
function editable() {
  const es = [
    document.activeElement
  ];
  // detect activeElement if there is a self iframe
  for (const f of document.querySelectorAll('dialog.kphelper iframe')) {
    if (f.activeElement) {
      es.unshift(f.activeElement);
    }
  }

  for (const e of es) {
    const node = e && e.nodeName.toLowerCase();
    if (e && e.nodeType === 1 && (node === 'textarea' ||
      (node === 'input' && /^(?:text|email|number|search|tel|url|password)$/i.test(e.type)))) {
      return e;
    }
    if (e && e.isContentEditable) {
      return e;
    }
  }
  return null;
}

// will be used to focus the element after text insertion
window.aElement = editable();

// Traverse the document and shadow roots

// try to find used usernames
{
  const passwords = document.extendedQuerySelectorAll('input[type=password]');
  const forms = passwords
    .map(p => p.form)
    .filter(f => f)
    .filter((f, i, l) => l.indexOf(f) === i);

  // https://github.com/belaviyo/keepass-macpass-helper/issues/69
  // https://login.aliexpress.com/
  if (forms.length === 0 && passwords.length) {
    const [password] = passwords;
    let parent = password.parentElement || password.parentNode;
    while (parent !== document.body) {
      const es = parent.extendedQuerySelectorAll('input[type=email],input[type=text]');
      if (es.length) {
        forms.push(parent);
        break;
      }
      if (parent.parentElement) {
        parent = parent.parentElement;
      }
      else {
        if (parent.getRootNode() instanceof ShadowRoot) {
          parent = parent.getRootNode().host;
        }
      }
    }
  }

  const usernames = forms.map(f => {
    return f.extendedQuerySelectorAll('input:not([type=password])').filter(i => {
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
