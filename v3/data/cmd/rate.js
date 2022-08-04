chrome.storage.local.get({
  'rate': true,
  'crate': 0
}, prefs => {
  document.getElementById('rate').dataset.hide = prefs['rate'] === false || prefs.crate < 5 || Math.random() < 0.8;

  if (prefs.crate < 5) {
    prefs.crate += 1;
    chrome.storage.local.set({crate: prefs.crate});
  }
});

document.getElementById('rate').onclick = () => {
  let url = 'https://chrome.google.com/webstore/detail/keepassmacpass-helper/jgnfghanfbjmimbdmnjfofnbcgpkbegj/reviews/';
  if (/Edg/.test(navigator.userAgent)) {
    url = 'https://microsoftedge.microsoft.com/addons/detail/bfmglfdehkodoiinbclgoppembjfgjkj';
  }
  else if (/Firefox/.test(navigator.userAgent)) {
    url = 'https://addons.mozilla.org/firefox/addon/keepasshelper/reviews/';
  }
  else if (/OPR/.test(navigator.userAgent)) {
    url = 'https://addons.opera.com/extensions/details/keepasshelper/';
  }

  chrome.storage.local.set({
    'rate': false
  }, () => chrome.tabs.create({
    url
  }));
};
