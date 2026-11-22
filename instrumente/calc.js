// Lex Master — site/instrumente/calc.js
// Calculatoarele publice (termene, taxa judiciară de timbru, dobânda legală), aceeași logică ca în aplicație
// (Shared/Tools/TermEngine.swift, LexMaster/Engine/Tools/StampEngine.swift, InterestEngine.swift) pe aceleași date
// (data/*.json, copiate din LexMaster/Resources/Tools cu tools/build_site_tools.py).
// Testele: node tools/site_calc_check.mjs. Funcțiile de calcul sunt pure; legarea de pagină e la final.

// ------------------------------------------------------------------ zile (calendar gregorian, fără fus orar)
export function day(y, m, d) { return { y, m, d }; }
export function fromIso(s) { const [y, m, d] = s.split('-').map(Number); return day(y, m, d); }
export function iso(t) { return `${String(t.y).padStart(4, '0')}-${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`; }
function jdn(t) { const a = Math.floor((14 - t.m) / 12), y = t.y + 4800 - a, m = t.m + 12 * a - 3; return t.d + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045; }
function fromJdn(j) {
  const a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4), d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
  return day(100 * b + d - 4800 + Math.floor(m / 10), m + 3 - 12 * Math.floor(m / 10), e - Math.floor((153 * m + 2) / 5) + 1);
}
export function addDays(t, n) { return fromJdn(jdn(t) + n); }
export function diffDays(a, b) { return jdn(b) - jdn(a); }
export function cmp(a, b) { return jdn(a) - jdn(b); }
export function weekday(t) { return (jdn(t) % 7) + 1; } // 1 = luni … 7 = duminică
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const dim = (m, y) => (m === 2 ? (isLeap(y) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31);
export function addMonths(t, n) {
  const total = t.y * 12 + (t.m - 1) + n, y = Math.floor(total / 12), m = total - y * 12 + 1, max = dim(m, y);
  return t.d > max ? { day: day(y, m, max), clamped: true } : { day: day(y, m, t.d), clamped: false };
}
export const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
export const WEEKDAYS = ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'];
export function text(t) { return `${t.d} ${MONTHS[t.m - 1]} ${t.y}`; }
export function long(t) { return `${WEEKDAYS[weekday(t) - 1]}, ${text(t)}`; }

// ------------------------------------------------------------------ paștele ortodox și sărbătorile legale
export function orthodoxEaster(y) {
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const m = Math.floor((d + e + 114) / 31), z = ((d + e + 114) % 31) + 1;
  return addDays(day(y, m, z), 13);
}
export function holidays(data, y) {
  const out = new Map();
  const put = (t, n) => { const k = iso(t); out.set(k, out.has(k) ? `${out.get(k)} și ${n}` : n); };
  const ok = (t, f) => !f || cmp(t, fromIso(f)) >= 0;
  for (const f of data.fixed) { if (f.day > dim(f.month, y)) continue; const t = day(y, f.month, f.day); if (ok(t, f.validFrom)) put(t, f.name); }
  const p = orthodoxEaster(y);
  for (const mo of data.mobileOffsets) { const t = addDays(p, mo.offset); if (ok(t, mo.validFrom)) put(t, mo.name); }
  return out;
}
export function reason(data, t) {
  const h = holidays(data, t.y).get(iso(t));
  if (h) return `${t.d} ${MONTHS[t.m - 1]}, ${h}`;
  if (weekday(t) === 6) return 'sâmbătă';
  if (weekday(t) === 7) return 'duminică';
  return null;
}
export function nextWorking(data, t) {
  const skipped = [];
  let cur = t;
  for (let i = 0; i < 40; i++) { const r = reason(data, cur); if (!r) break; skipped.push({ day: cur, reason: r }); cur = addDays(cur, 1); }
  return { day: cur, skipped };
}

// ------------------------------------------------------------------ termene (aceleași reguli ca TermEngine)
export const REGIMES = {
  civilProc: { title: 'Procesual civil', units: ['days', 'weeks', 'months', 'years'], cite: 'art. 181 C.proc.civ.' },
  penalProc: { title: 'Procesual penal', units: ['days', 'months', 'years'], cite: 'art. 269 C.proc.pen.' },
  preventive: { title: 'Măsuri preventive', units: ['days'], cite: 'art. 271 C.proc.pen.' },
  civilSubst: { title: 'Civil (prescripție, decădere)', units: ['days', 'weeks', 'months', 'years'], cite: 'art. 2552–2554 C.civ.' },
  penalSubst: { title: 'Penal (prescripție, reabilitare)', units: ['days', 'weeks', 'months', 'years'], cite: 'art. 186 C.pen.' },
};
export function amount(n, unit) {
  const de = n >= 20 ? 'de ' : '';
  const w = { days: ['o zi', 'zile'], weeks: ['o săptămână', 'săptămâni'], months: ['o lună', 'luni'], years: ['un an', 'ani'], hours: ['o oră', 'ore'] }[unit];
  return n === 1 ? w[0] : `${n} ${de}${w[1]}`;
}

/** { last, raw, steps: [{text, cite}] } sau { error } */
export function term(holidayData, regime, start, n, unit) {
  const r = REGIMES[regime];
  if (!r || !r.units.includes(unit)) return { error: 'Combinația aleasă nu e acoperită (de exemplu, C.proc.pen. nu are termene pe săptămâni, iar măsurile preventive se socotesc pe zile).' };
  if (!(n > 0)) return { error: 'Introdu o durată mai mare decât zero.' };
  const steps = [];
  let raw;
  if (unit === 'days' && (regime === 'civilProc' || regime === 'penalProc' || regime === 'civilSubst')) {
    raw = addDays(start, n + 1);
    steps.push({ text: `Pe zile libere: nu se socotește ziua de start (${text(start)}) și nici ziua în care se împlinește; ultima zi este start + ${n} + 1: ${long(raw)}.`, cite: regime === 'civilProc' ? 'art. 181 alin. (1) pct. 2 C.proc.civ.' : regime === 'penalProc' ? 'art. 269 alin. (2) C.proc.pen.' : 'art. 2553 C.civ.' });
  } else if (regime === 'preventive') {
    raw = addDays(start, n - 1);
    steps.push({ text: `Ziua de început și ziua de sfârșit intră în durată: ultima zi a măsurii este ${long(raw)}.`, cite: 'art. 271 C.proc.pen.' });
  } else if (regime === 'penalSubst' && (unit === 'days' || unit === 'weeks')) {
    raw = addDays(start, (unit === 'weeks' ? 7 * n : n) - 1);
    steps.push({ text: `Socotind și ziua de început, termenul se termină pe ${long(raw)}.`, cite: 'art. 186 alin. (1) C.pen.' });
  } else if (regime === 'penalSubst') {
    const k = unit === 'months' ? n : 12 * n, c = addMonths(start, k), corresp = c.clamped ? addDays(c.day, 1) : c.day;
    raw = addDays(corresp, -1);
    steps.push({ text: `Luna și anul se socotesc împlinite cu o zi înainte de ziua corespunzătoare: ${long(raw)}.`, cite: 'art. 186 alin. (1) C.pen.' });
  } else {
    const c = unit === 'weeks' ? { day: addDays(start, 7 * n), clamped: false } : addMonths(start, unit === 'months' ? n : 12 * n);
    raw = c.day;
    steps.push({ text: c.clamped ? `Ziua corespunzătoare nu există în luna de sosire: termenul se împlinește în ultima zi a lunii, ${long(raw)}.` : `Se împlinește în ziua corespunzătoare: ${long(raw)}.`, cite: regime === 'civilProc' ? 'art. 181 alin. (1) pct. 3 C.proc.civ.' : regime === 'penalProc' ? 'art. 269 alin. (3) C.proc.pen.' : 'art. 2552 C.civ.' });
  }
  let last = raw;
  if (regime === 'civilProc' || regime === 'penalProc' || regime === 'civilSubst') {
    const nw = nextWorking(holidayData, raw);
    if (nw.skipped.length) {
      last = nw.day;
      steps.push({ text: `Ultima zi cade într-o zi nelucrătoare (${nw.skipped.map((s) => s.reason).join('; ')}): termenul trece la ${long(last)}.`, cite: regime === 'civilProc' ? 'art. 181 alin. (2) C.proc.civ.' : regime === 'penalProc' ? 'art. 269 alin. (4) C.proc.pen.' : 'art. 2554 C.civ.' });
    } else {
      steps.push({ text: 'Ultima zi e lucrătoare: nu e nevoie de prelungire.', cite: '' });
    }
  } else {
    steps.push({ text: 'Termenul nu se prelungește dacă ultima zi e nelucrătoare.', cite: REGIMES[regime].cite });
  }
  return { last, raw, steps };
}

// ------------------------------------------------------------------ bani
export const round2 = (x) => Math.round((x + Math.sign(x) * 1e-9) * 100) / 100;
export function lei(x) {
  const r = round2(x), cents = Math.round(Math.abs(r) * 100) % 100;
  const int = Math.floor(Math.abs(r)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${r < 0 ? '−' : ''}${int}${cents ? ',' + String(cents).padStart(2, '0') : ''} lei`;
}
export function parseAmount(raw) {
  let s = String(raw).trim().replace(/\s|lei/gi, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

// ------------------------------------------------------------------ taxa judiciară de timbru (OUG nr. 80/2013)
export function scale(stamp, v) {
  if (!(v > 0)) return 0;
  for (const t of stamp.scale) {
    if (t.upTo !== null && v > t.upTo) continue;
    let fee = t.base + t.rate * (v - t.over);
    if (t.min != null && fee < t.min) fee = t.min;
    return round2(fee);
  }
  return 0;
}

/** opts: { value, second, persons, units, fee, path: 'none'|'apel'|'recurs', ground: 'procedural'|'material', contested } */
export function firstInstance(stamp, type, o = {}) {
  const v = o.value || 0;
  switch (type.kind) {
    case 'scale': return scale(stamp, v);
    case 'scaleOfBase': return scale(stamp, round2(v * (type.basePercent ?? 0.2)));
    case 'partaj': return round2(scale(stamp, v) / 2) + (type.perPerson ?? 50) * (o.persons || 0);
    case 'partajOld': return round2(v * (o.allInOne === false ? 0.03 : 0.05)) + (type.perPerson ?? 50) * (o.persons || 0);
    case 'tiered': { for (const t of type.tiers) { if (t.upTo !== null && v > t.upTo) continue; return t.amount; } return 0; }
    case 'fixed': return type.amount ?? 0;
    case 'perUnit': return round2((type.amount ?? 0) * Math.max(1, o.units || 1));
    case 'percentOfFee': return round2((o.fee || 0) * (type.rate ?? 0.5));
    case 'percentCap': return Math.min(round2(v * (type.rate ?? 0.1)), type.cap ?? 300);
    case 'execContest': { const base = o.second > 0 && (o.second < v || !(v > 0)) ? o.second : v; return Math.min(scale(stamp, base), type.cap ?? 1000); }
    case 'exempt': return 0;
    default: return 0;
  }
}

export function stampFee(stamp, type, o = {}) {
  const first = firstInstance(stamp, type, o);
  const path = type.kind === 'exempt' ? 'none' : o.path || 'none';
  if (path === 'none') return first;
  const contested = o.contested > 0 ? o.contested : o.value;
  if (path === 'apel') {
    const a = stamp.appeal.apel;
    const base = type.appeal === 'evaluable' ? firstInstance(stamp, type, { ...o, value: contested }) : first;
    return Math.max(round2(base * a.rate), a.min);
  }
  if ((o.ground || 'procedural') === 'procedural') return stamp.appeal.recursProc.amount;
  const r = stamp.appeal.recursMaterial;
  if (type.appeal !== 'evaluable') return r.neevaluable;
  return Math.max(round2(firstInstance(stamp, type, { ...o, value: contested }) * r.rate), r.min);
}

export function validTypes(stamp, onIso) {
  const t = fromIso(onIso);
  return stamp.types.filter((x) => (!x.validFrom || cmp(t, fromIso(x.validFrom)) >= 0) && (!x.validUntil || cmp(t, fromIso(x.validUntil)) <= 0));
}

// ------------------------------------------------------------------ dobânda legală (OG nr. 13/2011, Legea nr. 72/2013)
function refRate(interest, t) {
  let cur = null;
  for (const r of [...interest.rates].sort((a, b) => (a.from < b.from ? -1 : 1))) { if (cmp(fromIso(r.from), t) <= 0) cur = r; else break; }
  return cur ? cur.rate : null;
}
/** dobânda simplă de la scadență (exclusiv) la plată (inclusiv); întoarce { total, segments } */
export function interestCalc(interest, principal, from, to, kindId, professional = true, actual = false) {
  const k = interest.kinds.find((x) => x.id === kindId);
  const segments = [];
  let total = 0;
  for (let t = addDays(from, 1); cmp(t, to) <= 0; t = addDays(t, 1)) {
    const look = k.semester ? day(t.y, t.m <= 6 ? 1 : 7, 1) : t;
    const ref = refRate(interest, look);
    if (ref === null) continue;
    let rate = ref + k.spread;
    if (!professional && !k.professionalOnly) rate *= 1 - interest.nonProfessional.reduction;
    rate = Math.round(rate * 10000) / 10000;
    const basis = actual && isLeap(t.y) ? 366 : 365;
    const last = segments[segments.length - 1];
    if (last && last.rate === rate && last.basis === basis && diffDays(last.to, t) === 1) { last.to = t; last.days += 1; }
    else segments.push({ from: t, to: t, days: 1, rate, basis });
  }
  for (const s of segments) { s.amount = (principal * s.rate) / 100 * s.days / s.basis; total += s.amount; s.amount = round2(s.amount); }
  return { total: round2(total), segments };
}

// ------------------------------------------------------------------ legarea de pagină (doar în browser)
const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const todayIso = () => { const d = new Date(); return iso(day(d.getFullYear(), d.getMonth() + 1, d.getDate())); };
async function load(name) { return (await fetch(`data/${name}.json`)).json(); }
function stepsHtml(steps) { return `<ol class="steps">${steps.map((s) => `<li>${esc(s.text)}${s.cite ? ` <span class="art">${esc(s.cite)}</span>` : ''}</li>`).join('')}</ol>`; }

export async function initTerm() {
  const [hol, terms] = await Promise.all([load('tool-holidays'), load('tool-terms')]);
  const sel = $('preset'), start = $('start'), n = $('n'), unit = $('unit'), regime = $('regime'), out = $('result');
  sel.innerHTML = '<option value="">Fără presetare</option>' + terms.presets.filter((p) => p.unit !== 'hours').map((p) => `<option value="${p.id}">${esc(p.title)} (${esc(amount(p.n, p.unit))})</option>`).join('');
  const want = new URLSearchParams(location.search).get('termen') || sel.dataset.default || '';
  sel.value = terms.presets.some((p) => p.id === want) ? want : '';
  start.value = todayIso();
  const apply = () => { const p = terms.presets.find((x) => x.id === sel.value); if (p) { regime.value = p.regime; n.value = p.n; unit.value = p.unit; } render(); };
  const render = () => {
    const p = terms.presets.find((x) => x.id === sel.value);
    const r = term(hol, regime.value, fromIso(start.value || todayIso()), Number(n.value), unit.value);
    if (r.error) { out.innerHTML = `<p>${esc(r.error)}</p>`; return; }
    out.innerHTML = `<p class="label">Ultima zi${p ? `: ${esc(p.title.toLowerCase())}` : ''}</p><p class="value">${esc(long(r.last))}</p>`
      + (p ? `<p class="muted">${esc(amount(p.n, p.unit))} de la ${esc(p.startEvent)} (${esc(p.cite)}).</p>` : '')
      + stepsHtml(r.steps);
  };
  sel.addEventListener('change', apply);
  for (const el of [start, n, unit, regime]) el.addEventListener('input', () => { sel.value = terms.presets.some((x) => x.id === sel.value && x.n === Number(n.value) && x.unit === unit.value && x.regime === regime.value) ? sel.value : ''; render(); });
  apply();
}

export async function initStamp() {
  const stamp = await load('tool-stamp');
  const sel = $('type'), value = $('value'), path = $('path'), ground = $('ground'), persons = $('persons'), units = $('units'), filed = $('filed'), out = $('result');
  filed.value = todayIso();
  const fill = () => {
    const list = validTypes(stamp, filed.value || todayIso());
    const keep = sel.value;
    const groups = [...new Set(list.map((t) => t.group))];
    sel.innerHTML = groups.map((g) => `<optgroup label="${esc(g)}">${list.filter((t) => t.group === g).map((t) => `<option value="${t.id}">${esc(t.title)}</option>`).join('')}</optgroup>`).join('');
    sel.value = list.some((t) => t.id === keep) ? keep : 'pretentii';
  };
  const render = () => {
    const t = stamp.types.find((x) => x.id === sel.value);
    if (!t) return;
    $('valueRow').hidden = !['scale', 'scaleOfBase', 'partaj', 'partajOld', 'tiered', 'percentCap', 'execContest'].includes(t.kind);
    $('unitsRow').hidden = t.kind !== 'perUnit';
    $('personsRow').hidden = !(t.kind === 'partaj' || t.kind === 'partajOld');
    $('pathRow').hidden = t.appeal === 'none' || t.kind === 'exempt';
    $('groundRow').hidden = path.value !== 'recurs' || $('pathRow').hidden;
    const o = { value: parseAmount(value.value) || 0, persons: Number(persons.value) || 0, units: Number(units.value) || 1, path: $('pathRow').hidden ? 'none' : path.value, ground: ground.value };
    const fee = stampFee(stamp, t, o);
    out.innerHTML = `<p class="label">${o.path === 'apel' ? 'Taxa pentru apel' : o.path === 'recurs' ? 'Taxa pentru recurs' : 'Taxa de timbru'}</p><p class="value">${t.kind === 'exempt' ? '0 lei, scutit' : esc(lei(fee))}</p>`
      + `<p class="muted">${esc(t.title)} · ${esc(t.cite)} OUG nr. 80/2013</p>`
      + `<ul class="notes">${(t.notes || []).map((x) => `<li>${esc(x)}</li>`).join('')}<li>${esc(stamp.indexNote)}</li><li>${esc(stamp.roundingNote)}</li></ul>`;
  };
  filed.addEventListener('input', () => { fill(); render(); });
  for (const el of [sel, value, path, ground, persons, units]) el.addEventListener('input', render);
  fill();
  render();
}

export async function initInterest() {
  const data = await load('tool-interest');
  const kind = $('kind'), principal = $('principal'), from = $('from'), to = $('to'), rel = $('relation'), actual = $('actual'), out = $('result');
  kind.innerHTML = data.kinds.map((k) => `<option value="${k.id}">${esc(k.title)}</option>`).join('');
  kind.value = 'penalizatoare';
  const t = new Date();
  to.value = todayIso();
  from.value = iso(day(t.getFullYear() - 1, t.getMonth() + 1, Math.min(28, t.getDate())));
  const render = () => {
    const k = data.kinds.find((x) => x.id === kind.value);
    $('relationRow').hidden = !!k.professionalOnly;
    const p = parseAmount(principal.value);
    if (!(p > 0) || !from.value || !to.value || from.value >= to.value) { out.innerHTML = '<p>Introdu debitul, scadența și o dată a plății după scadență.</p>'; return; }
    const r = interestCalc(data, p, fromIso(from.value), fromIso(to.value), k.id, k.professionalOnly || rel.value === 'pro', actual.checked);
    out.innerHTML = `<p class="label">Dobânda ${esc(k.title.toLowerCase())}</p><p class="value">${esc(lei(r.total))}</p>`
      + `<p class="muted">${esc(k.cite)}. Total cu debitul: ${esc(lei(r.total + p))}.</p>`
      + `<table><thead><tr><th>Perioada</th><th>Zile</th><th>Rata</th><th>Dobânda</th></tr></thead><tbody>${r.segments.map((s) => `<tr><td>${iso(s.from)} – ${iso(s.to)}</td><td>${s.days}</td><td>${String(s.rate).replace('.', ',')} %</td><td>${esc(lei(s.amount))}</td></tr>`).join('')}</tbody></table>`
      + `<p class="muted">${esc(data.ratesNote)}</p>`;
  };
  for (const el of [kind, principal, from, to, rel, actual]) el.addEventListener('input', render);
  render();
}
