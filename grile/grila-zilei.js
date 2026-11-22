// Grila zilei: aceeași pentru toți, în aceeași zi (ora României); se schimbă la miezul nopții.
(function () {
  var box = document.getElementById('daily');
  var day = document.getElementById('day');
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var parts = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  var get = function (t) { return Number((parts.find(function (p) { return p.type === t; }) || {}).value); };
  var n = Math.floor(Date.UTC(get('year'), get('month') - 1, get('day')) / 86400000);
  fetch('grila-zilei.json').then(function (r) { return r.json(); }).then(function (d) {
    var list = d.questions || [];
    if (!list.length) return;
    var q = list[n % list.length];
    var key = q.options.filter(function (o) { return o.ok; }).map(function (o) { return o.id; }).join(', ') || 'niciuna dintre variante';
    day.textContent = 'Grila de azi, ' + new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()) + ' · ' + q.subject;
    box.innerHTML = '<article class="q"><p class="meta">' + esc(q.source) + '</p><h2 class="stem">' + esc(q.stem) + '</h2><ol class="opts">' +
      q.options.map(function (o) { return '<li><span class="l">' + esc(o.id) + '.</span> ' + esc(o.text) + '</li>'; }).join('') +
      '</ol><details><summary>Vezi răspunsul și explicația</summary><p class="key">Răspunsul corect: <strong>' + esc(key) + '</strong></p><ul class="expl">' +
      q.options.map(function (o) { return '<li class="' + (o.ok ? 'ok' : 'no') + '"><strong>' + esc(o.id) + '.</strong> ' + esc(o.e) + '</li>'; }).join('') + '</ul>' +
      (q.articles.length ? '<p class="art">Articolul: ' + esc(q.articles.join(' · ')) + '</p>' : '') +
      '</details><a class="open" href="lexmaster://q/' + encodeURIComponent(q.id) + '">Rezolv-o în aplicație</a></article>';
  }).catch(function () { /* rămâne grila scrisă în pagină */ });
})();
