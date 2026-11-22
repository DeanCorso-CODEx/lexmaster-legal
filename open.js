// Linkurile de duel și de prieten: încearcă aplicația (lexmaster://), altfel rămâne butonul App Store.
(function () {
  var p = new URLSearchParams(location.search);
  var v = (p.get('id') || p.get('cod') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
  var a = document.getElementById('open');
  var code = document.getElementById('code');
  if (code && v) code.textContent = 'Codul: ' + v.toUpperCase();
  if (!a) return;
  if (!v) { a.removeAttribute('href'); a.textContent = 'Linkul nu e complet'; return; }
  // butonul deschide aplicația (dacă e instalată); fără ea, bannerul de sus duce în App Store
  a.href = a.getAttribute('data-scheme') + v;
})();
