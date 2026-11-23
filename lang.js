// Language switch for every page of the site (Romanian / English), with no reload and no navigation.
// Both languages are in the same page ([data-lang="ro"] / [data-lang="en"]); CSS hides the inactive one.
// Order of choice: ?lang=… in the link, the last choice on this browser, then the browser language
// (Romanian browsers get Romanian, everyone else English). Loaded in <head>, so there is no flash of the other language.
(function () {
  var KEY = 'lexLang';
  var root = document.documentElement;
  function valid(l) { return l === 'ro' || l === 'en'; }
  function pick() {
    var q = new URLSearchParams(location.search).get('lang');
    if (valid(q)) return q;
    try { var s = localStorage.getItem(KEY); if (valid(s)) return s; } catch (e) {}
    var n = (navigator.languages && navigator.languages[0]) || navigator.language || 'ro';
    return /^ro\b/i.test(n) ? 'ro' : 'en';
  }
  function apply(l) {
    root.lang = l;
    var t = root.getAttribute('data-title-' + l);
    if (t) document.title = t;
    var bs = document.querySelectorAll('[data-lang-toggle]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].textContent = l === 'ro' ? 'English' : 'Română';
      bs[i].setAttribute('lang', l === 'ro' ? 'en' : 'ro');
      bs[i].setAttribute('aria-label', l === 'ro' ? 'Switch to English' : 'Schimbă în română');
    }
    try { document.dispatchEvent(new CustomEvent('lexlang', { detail: l })); } catch (e) {}
  }
  window.lexLang = function () { return root.lang === 'en' ? 'en' : 'ro'; };
  apply(pick());
  document.addEventListener('DOMContentLoaded', function () {
    apply(window.lexLang());
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-lang-toggle]') : null;
      if (!b) return;
      e.preventDefault();
      var l = window.lexLang() === 'ro' ? 'en' : 'ro';
      try { localStorage.setItem(KEY, l); } catch (x) {}
      try { var u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u); } catch (x) {}
      apply(l);
    });
  });
})();
