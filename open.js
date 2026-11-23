// Duel and friend links: the button tries the app (lexmaster://); without it, the Smart App Banner leads to the App Store.
// Texts follow the page language (lang.js) and change with it, without a reload.
(function () {
  var p = new URLSearchParams(location.search);
  var v = (p.get('id') || p.get('cod') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
  var a = document.getElementById('open');
  var code = document.getElementById('code');
  var T = {
    ro: { code: 'Codul: ', broken: 'Linkul nu e complet' },
    en: { code: 'Code: ', broken: 'The link is incomplete' }
  };
  function lang() { return window.lexLang ? window.lexLang() : 'ro'; }
  function render() {
    var t = T[lang()] || T.ro;
    if (code && v) code.textContent = t.code + v.toUpperCase();
    if (a && !v) { a.removeAttribute('href'); a.textContent = t.broken; }
  }
  if (a && v) a.href = a.getAttribute('data-scheme') + v;
  render();
  document.addEventListener('lexlang', render);
})();
