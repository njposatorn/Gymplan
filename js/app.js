// UI หลักของแอป: state เก็บใน localStorage, render ด้วย template string, จัดการ event แบบ delegation

const STORE_KEY = 'gymplan_v1';
const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet');
const $timer = document.getElementById('rest-timer');
const $toast = document.getElementById('toast');

let state = loadState();
let ui = { tab: 'home', onboardStep: 0, exSearch: '', exDuration: 0, progressEx: null, progressMetric: 'e1rm', openSession: null, customMuscles: [] };

// ---------- state ----------

function defaultState() {
  return {
    v: 1,
    profile: null,
    gyms: [{ id: 'g1', name: 'ยิมของฉัน', equipment: [] }],
    activeGym: 'g1',
    exclusions: [],
    program: { split: 'ppl', next: 0 },
    sessions: [],
    bodyweight: [],
    active: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) { /* ใช้ค่าเริ่มต้น */ }
  return defaultState();
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('บันทึกไม่สำเร็จ: พื้นที่เก็บข้อมูลเต็มหรือถูกปิดไว้'); }
}

// ---------- helpers ----------

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = ts => new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
const fmtDay = ts => new Date(ts).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const fmtNum = n => Math.round(n).toLocaleString('th-TH');

function toast(msg, ms = 2600) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => $toast.classList.remove('show'), ms);
}

function muscleChip(m, extra = '') {
  return `<span class="chip chip-${m} ${extra}">${esc(MUSCLES[m])}</span>`;
}

function exMeta(ex) {
  const bits = [MUSCLES[ex.muscle], ex.type === 'c' ? 'Compound' : 'Isolation'];
  if (ex.bw) bits.push('น้ำหนักตัว');
  return bits.join(' · ');
}

function youtubeLink(ex) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' form')}`;
}

// ---------- render ----------

function render() {
  if (!state.profile) { $app.innerHTML = renderOnboarding(); return; }
  if (state.active) { $app.innerHTML = renderWorkout(); return; }
  const views = { home: renderHome, history: renderHistory, progress: renderProgress, settings: renderSettings };
  $app.innerHTML = `<main class="view">${views[ui.tab]()}</main>${renderNav()}`;
}

function renderNav() {
  const tabs = [
    ['home', 'หน้าหลัก', '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
    ['history', 'ประวัติ', '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>'],
    ['progress', 'Progress', '<path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/>'],
    ['settings', 'ตั้งค่า', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'],
  ];
  return `<nav class="tabbar">${tabs.map(([id, label, icon]) => `
    <button class="tab ${ui.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">
      <svg viewBox="0 0 24 24">${icon}</svg><span>${label}</span>
    </button>`).join('')}</nav>`;
}

// ---------- onboarding ----------

function renderOnboarding() {
  const steps = ['ข้อมูลของคุณ', 'อุปกรณ์ในยิม', 'ท่าที่ไม่เล่น', 'รูปแบบโปรแกรม'];
  const s = ui.onboardStep;
  const body = [renderProfileForm, renderEquipmentEditor, renderExclusionEditor, renderSplitPicker][s]();
  return `<main class="view onboard">
    <div class="ob-head">
      <div class="brand">Gym<b>Plan</b></div>
      <div class="steps">${steps.map((t, i) => `<span class="${i <= s ? 'on' : ''}"></span>`).join('')}</div>
      <h1>${steps[s]}</h1>
      <p class="muted">ขั้นที่ ${s + 1} จาก ${steps.length}</p>
    </div>
    ${body}
    <div class="ob-actions">
      ${s > 0 ? '<button class="btn ghost" data-act="ob-back">ย้อนกลับ</button>' : '<span></span>'}
      <button class="btn primary" data-act="ob-next">${s === steps.length - 1 ? 'เริ่มใช้งาน' : 'ถัดไป'}</button>
    </div>
  </main>`;
}

function draftProfile() {
  if (!ui.draft) ui.draft = state.profile ? { ...state.profile } : { level: 'beginner', goal: 'muscle', days: 3, minutes: 60 };
  return ui.draft;
}

function renderProfileForm() {
  const p = draftProfile();
  const radio = (name, opts, cur) => `<div class="seg">${Object.entries(opts).map(([k, v]) =>
    `<button class="${String(cur) === String(k) ? 'on' : ''}" data-act="draft" data-k="${name}" data-v="${k}">${esc(v)}</button>`).join('')}</div>`;
  return `<section class="card">
    <label class="lbl">ระดับประสบการณ์</label>
    ${radio('level', Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, v.name])), p.level)}
    <label class="lbl">เป้าหมาย</label>
    ${radio('goal', Object.fromEntries(Object.entries(GOALS).map(([k, v]) => [k, v.name])), p.goal)}
    <label class="lbl">เล่นได้กี่วันต่อสัปดาห์</label>
    ${radio('days', { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' }, p.days)}
    <label class="lbl">เวลาต่อครั้ง (นาที)</label>
    ${radio('minutes', { 30: '30', 45: '45', 60: '60', 75: '75', 90: '90' }, p.minutes)}
  </section>`;
}

function renderEquipmentEditor() {
  const gym = currentGym(state);
  const eq = new Set(gym.equipment);
  return `<section class="card">
    <label class="lbl">ชื่อยิม</label>
    <input class="input" data-input="gym-name" value="${esc(gym.name)}" placeholder="เช่น ยิมใกล้บ้าน">
    <div class="row gap mt">
      <button class="btn small ghost" data-act="eq-all">เลือกทั้งหมด</button>
      <button class="btn small ghost" data-act="eq-none">ล้าง</button>
      <span class="muted small">${eq.size} ชิ้น</span>
    </div>
  </section>
  ${EQUIPMENT_GROUPS.map(g => `<section class="card">
    <h3>${esc(g.name)}</h3>
    <div class="checks">${g.items.map(i => `
      <button class="check ${eq.has(i.id) ? 'on' : ''}" data-act="eq-toggle" data-id="${i.id}">
        <span class="box"></span>${esc(i.name)}
      </button>`).join('')}</div>
  </section>`).join('')}
  <p class="muted small center">ท่าที่ใช้น้ำหนักตัว (Push-up, Plank ฯลฯ) เล่นได้เสมอโดยไม่ต้องเลือกอุปกรณ์</p>`;
}

function renderSplitPicker() {
  return `<section class="card">
    ${Object.entries(SPLITS).map(([k, sp]) => `
      <button class="option ${state.program.split === k ? 'on' : ''}" data-act="split" data-id="${k}">
        <div><b>${esc(sp.name)}</b><div class="muted small">${esc(sp.desc)} · ${sp.days.map(d => esc(d.name.split(' (')[0])).join(' / ')}</div></div>
        <span class="radio"></span>
      </button>`).join('')}
    <p class="muted small">เล่นตามลำดับวันในโปรแกรม แต่จะเลือกเล่นเฉพาะส่วนเองในวันไหนก็ได้</p>
  </section>`;
}

// ---------- exclusions ----------

function renderExclusionEditor() {
  const q = ui.exSearch.trim().toLowerCase();
  const results = q ? EXERCISES.filter(e => e.name.toLowerCase().includes(q) || (FAMILIES[e.family] || '').toLowerCase().includes(q)).slice(0, 12) : [];
  const active = activeExclusions(state.exclusions);
  const uncovered = uncoveredMusclesSafe();
  const durations = { 0: 'ถาวร', 14: '2 สัปดาห์', 28: '4 สัปดาห์', 56: '8 สัปดาห์' };

  return `<section class="card">
    <p class="muted small">ท่าที่เลือกไว้ตรงนี้จะไม่ถูกจัดเข้าโปรแกรมเลย ระบบจะหาท่าที่เล่นกล้ามเนื้อเดียวกันมาแทน</p>
    <label class="lbl">ค้นหาท่า</label>
    <input class="input" type="search" data-input="ex-search" value="${esc(ui.exSearch)}" placeholder="เช่น deadlift, squat, dips">
    <label class="lbl">ระยะเวลา</label>
    <div class="seg">${Object.entries(durations).map(([k, v]) =>
      `<button class="${+ui.exDuration === +k ? 'on' : ''}" data-act="ex-duration" data-v="${k}">${v}</button>`).join('')}</div>
    <div id="ex-results">${renderExSearchResults(results)}</div>
  </section>

  <section class="card">
    <h3>เลือกตามอาการบาดเจ็บ</h3>
    <p class="muted small">แตะบริเวณที่เจ็บ แล้วติ๊กเลือกท่าที่จะกันเอง</p>
    <div class="chips">${Object.entries(STRESS).map(([k, v]) =>
      `<button class="chip btn-chip" data-act="injury" data-id="${k}">${esc(v)}</button>`).join('')}</div>
  </section>

  <section class="card">
    <h3>ท่าที่ไม่เล่น <span class="muted">(${active.length})</span></h3>
    ${uncovered.length ? `<div class="warn">⚠ ไม่เหลือท่าให้เล่น: ${uncovered.map(m => esc(MUSCLES[m])).join(', ')} ลองเปิดบางท่ากลับมา หรือเพิ่มอุปกรณ์</div>` : ''}
    ${active.length ? active.map(x => `
      <div class="ex-row">
        <div>
          <b>${esc(x.kind === 'family' ? FAMILIES[x.id] : EX_BY_ID[x.id]?.name)}</b>
          <div class="muted small">${x.kind === 'family' ? `${EXERCISES.filter(e => e.family === x.id).length} ท่า · ` : ''}${x.reason ? esc(x.reason) + ' · ' : ''}${x.until ? 'ถึง ' + fmtDate(x.until) : 'ถาวร'}</div>
        </div>
        <button class="btn small ghost" data-act="ex-remove" data-kind="${x.kind}" data-id="${x.id}">เปิดกลับ</button>
      </div>`).join('') : '<p class="muted small">ยังไม่มี ข้ามขั้นนี้ไปได้เลย</p>'}
  </section>`;
}

function uncoveredMusclesSafe() {
  const tmp = { ...state, profile: state.profile || draftProfile() };
  return uncoveredMuscles(tmp);
}

function renderExSearchResults(results) {
  if (!ui.exSearch.trim()) return '';
  if (!results.length) return '<p class="muted small mt">ไม่พบท่า</p>';
  return results.map(ex => {
    const famCount = EXERCISES.filter(e => e.family === ex.family).length;
    const ex1 = exclusionFor(ex, state.exclusions);
    return `<div class="ex-row">
      <div><b>${esc(ex.name)}</b><div class="muted small">${esc(exMeta(ex))}</div></div>
      ${ex1 ? '<span class="tag">กันไว้แล้ว</span>' : `<div class="col-btns">
        <button class="btn small danger" data-act="ex-add" data-kind="ex" data-id="${ex.id}">ไม่เล่นท่านี้</button>
        ${famCount > 1 ? `<button class="btn small ghost" data-act="ex-add" data-kind="family" data-id="${ex.family}">ทั้งตระกูล (${famCount})</button>` : ''}
      </div>`}
    </div>`;
  }).join('');
}

function addExclusion(kind, id, reason = '') {
  state.exclusions = state.exclusions.filter(x => !(x.kind === kind && x.id === id));
  const days = +ui.exDuration;
  state.exclusions.push({ kind, id, reason, added: Date.now(), until: days ? Date.now() + days * 864e5 : null });
  save();
}

function openInjurySheet(area) {
  const list = EXERCISES.filter(e => e.stress.includes(area));
  openSheet(`<h2>ท่าที่รับแรงที่${esc(STRESS[area])}</h2>
    <p class="muted small">ติ๊กเฉพาะท่าที่ทำแล้วเจ็บ ท่าอื่นยังเล่นได้ตามปกติ</p>
    <div class="checks">${list.map(e => `
      <button class="check ${isExcluded(e, state.exclusions) ? 'on' : ''}" data-act="sheet-check" data-id="${e.id}">
        <span class="box"></span><span>${esc(e.name)}<small class="muted"> · ${esc(MUSCLES[e.muscle])}</small></span>
      </button>`).join('')}</div>
    <div class="sheet-actions">
      <button class="btn ghost" data-act="sheet-close">ยกเลิก</button>
      <button class="btn primary" data-act="injury-apply" data-id="${area}">บันทึก</button>
    </div>`);
}

// ---------- home ----------

function renderHome() {
  const sp = SPLITS[state.program.split];
  const day = sp.days[state.program.next % sp.days.length];
  const weekCount = state.sessions.filter(s => s.date >= weekStart()).length;
  const streak = streakWeeks(state.sessions);
  const gym = currentGym(state);
  const uncovered = uncoveredMuscles(state);
  const expired = state.exclusions.filter(x => x.until && x.until <= Date.now());
  const last = state.sessions[state.sessions.length - 1];

  return `
  <header class="home-head">
    <div class="brand">Gym<b>Plan</b></div>
    <button class="gym-pill" data-act="gym-switch">📍 ${esc(gym.name)} ▾</button>
  </header>

  ${expired.map(x => `<section class="card notice">
    <b>ครบกำหนดพักท่า: ${esc(x.kind === 'family' ? FAMILIES[x.id] : EX_BY_ID[x.id]?.name)}</b>
    <p class="muted small">อาการดีขึ้นแล้ว จะเปิดท่านี้กลับมาเล่นไหม?</p>
    <div class="row gap"><button class="btn small primary" data-act="expired-unlock" data-kind="${x.kind}" data-id="${x.id}">เปิดกลับมา</button>
    <button class="btn small ghost" data-act="expired-extend" data-kind="${x.kind}" data-id="${x.id}">กันต่ออีก 2 สัปดาห์</button></div>
  </section>`).join('')}

  <section class="stats">
    <div class="stat"><span class="num">${weekCount}<small>/${state.profile.days}</small></span><span class="muted small">ครั้งสัปดาห์นี้</span></div>
    <div class="stat"><span class="num">${streak}</span><span class="muted small">สัปดาห์ติดต่อกัน</span></div>
    <div class="stat"><span class="num">${state.sessions.length}</span><span class="muted small">ครั้งทั้งหมด</span></div>
  </section>

  <section class="card hero">
    <div class="muted small">${esc(sp.name)} · วันที่ ${state.program.next % sp.days.length + 1}/${sp.days.length}</div>
    <h2>${esc(day.name)}</h2>
    <div class="chips">${[...new Set(day.slots.map(s => s.split(':')[0]))].map(m => muscleChip(m)).join('')}</div>
    <button class="btn primary big" data-act="start-program">เริ่มเล่นวันนี้</button>
    <div class="row gap mt">
      <button class="btn small ghost" data-act="skip-day">ข้ามไปวันถัดไป</button>
      <button class="btn small ghost" data-act="choose-day">เลือกวันอื่น</button>
    </div>
  </section>

  <section class="card">
    <h3>เลือกเล่นเฉพาะส่วน</h3>
    <div class="chips">${Object.keys(MUSCLES).map(m => `<button class="chip btn-chip ${ui.customMuscles.includes(m) ? 'on' : ''}" data-act="custom-toggle" data-id="${m}">${esc(MUSCLES[m])}</button>`).join('')}</div>
    <button class="btn secondary mt" data-act="start-custom" ${ui.customMuscles.length ? '' : 'disabled'}>จัดท่าให้ ${ui.customMuscles.length ? `(${ui.customMuscles.length} ส่วน)` : ''}</button>
  </section>

  ${uncovered.length ? `<section class="card warn">⚠ ยิมนี้ไม่มีท่าสำหรับ: ${uncovered.map(m => esc(MUSCLES[m])).join(', ')} <button class="link" data-act="goto" data-id="settings">แก้อุปกรณ์</button></section>` : ''}

  ${last ? `<section class="card">
    <h3>ครั้งล่าสุด</h3>
    <div class="row between"><div><b>${esc(last.title)}</b><div class="muted small">${fmtDay(last.date)} · ${last.items.length} ท่า · ${fmtTime(last.duration)} นาที</div></div>
    <button class="btn small ghost" data-act="goto" data-id="history">ดูประวัติ</button></div>
  </section>` : ''}`;
}

// ---------- workout ----------

function renderWorkout() {
  const w = state.active;
  const anyDone = w.items.some(i => i.sets.some(s => s.done));
  const doneSets = w.items.reduce((t, i) => t + i.sets.filter(s => s.done).length, 0);
  const totalSets = w.items.reduce((t, i) => t + i.sets.length, 0);
  return `<main class="view workout">
    <header class="wo-head">
      <button class="icon-btn" data-act="wo-cancel" aria-label="ยกเลิก">✕</button>
      <div class="wo-title"><b>${esc(w.title)}</b><span class="muted small"><span id="wo-clock">${w.startedAt ? fmtTime((Date.now() - w.startedAt) / 1000) : 'ยังไม่เริ่ม'}</span> · ${doneSets}/${totalSets} เซ็ต</span></div>
      <button class="btn small primary" data-act="wo-finish">จบ</button>
    </header>
    <div class="progressbar"><span style="width:${totalSets ? doneSets / totalSets * 100 : 0}%"></span></div>
    ${w.warnings.map(t => `<div class="card warn">⚠ ${esc(t)}</div>`).join('')}
    ${!anyDone ? `<div class="row gap center-row"><button class="btn small ghost" data-act="wo-regen">🔀 จัดท่าใหม่ทั้งหมด</button><span class="muted small">~${Math.round(estimateMinutes(w.items))} นาที</span></div>` : ''}
    ${w.items.map((it, idx) => renderItem(it, idx)).join('')}
    <button class="btn ghost full" data-act="wo-add">+ เพิ่มท่า</button>
    <div class="spacer"></div>
  </main>`;
}

function renderItem(it, idx) {
  const ex = EX_BY_ID[it.exId];
  const last = lastPerformance(it.exId, state.sessions);
  const allDone = it.sets.length && it.sets.every(s => s.done);
  const repLabel = ex.timed ? 'วินาที' : 'ครั้ง';
  return `<section class="card item ${allDone ? 'done' : ''}" data-key="${it.key}">
    <div class="item-head">
      <div class="item-idx">${idx + 1}</div>
      <div class="grow">
        <b>${esc(ex.name)}</b>
        <div class="muted small">${esc(exMeta(ex))} · ${it.rx.sets} × ${it.rx.lo}–${it.rx.hi} ${repLabel} · พัก ${fmtTime(it.rx.rest)}</div>
      </div>
      <button class="icon-btn" data-act="item-menu" data-key="${it.key}" aria-label="ตัวเลือก">⋯</button>
    </div>
    ${last ? `<div class="last small">ครั้งก่อน (${fmtDate(last.date)}): ${last.sets.map(s => `${ex.bw && !+s.w ? '' : fmtW(s.w) + '×'}${s.r}`).join(', ')}</div>` : ''}
    <div class="sug small ${it.suggestion.up ? 'up' : ''}">${it.suggestion.up ? '▲ ' : '💡 '}${esc(it.suggestion.text)}</div>
    <div class="sets">
      <div class="set-row set-headrow"><span>เซ็ต</span><span>${ex.bw ? '+kg' : 'kg'}</span><span>${repLabel}</span><span></span></div>
      ${it.sets.map((s, i) => `
      <div class="set-row ${s.done ? 'done' : ''}">
        <span class="set-n">${i + 1}</span>
        <input class="input num" type="number" inputmode="decimal" step="any" min="0" value="${esc(s.w)}" placeholder="${ex.bw ? '0' : '-'}" data-input="set" data-key="${it.key}" data-i="${i}" data-f="w">
        <input class="input num" type="number" inputmode="numeric" min="0" value="${esc(s.r)}" placeholder="${it.rx.hi}" data-input="set" data-key="${it.key}" data-i="${i}" data-f="r">
        <button class="tick ${s.done ? 'on' : ''}" data-act="set-done" data-key="${it.key}" data-i="${i}" aria-label="เสร็จเซ็ตนี้">✓</button>
      </div>`).join('')}
    </div>
    <div class="row gap">
      <button class="btn small ghost" data-act="set-add" data-key="${it.key}">+ เซ็ต</button>
      ${it.sets.length > 1 ? `<button class="btn small ghost" data-act="set-remove" data-key="${it.key}">− เซ็ต</button>` : ''}
    </div>
  </section>`;
}

function findItem(key) {
  return state.active.items.find(i => i.key === key);
}

function startWorkout(slots, title, dayRef) {
  state.active = buildWorkout(state, slots, title, dayRef);
  if (!state.active.items.length) {
    state.active = null;
    toast('จัดท่าไม่ได้ ลองเพิ่มอุปกรณ์หรือเปิดท่าที่กันไว้');
    return;
  }
  save();
  window.scrollTo(0, 0);
  render();
}

function openItemMenu(key) {
  const it = findItem(key);
  const ex = EX_BY_ID[it.exId];
  const famCount = EXERCISES.filter(e => e.family === ex.family).length;
  openSheet(`<h2>${esc(ex.name)}</h2>
    <p class="muted small">${esc(exMeta(ex))}${ex.stress.length ? ' · รับแรงที่ ' + ex.stress.map(s => STRESS[s]).join(', ') : ''}</p>
    <div class="menu">
      <button data-act="swap" data-key="${key}">🔄 สลับท่า <small>เครื่องไม่ว่าง / อยากเปลี่ยน</small></button>
      <a href="${youtubeLink(ex)}" target="_blank" rel="noopener">▶ ดูวิธีเล่นใน YouTube</a>
      <button data-act="item-up" data-key="${key}">↑ เลื่อนขึ้น</button>
      <button data-act="item-skip" data-key="${key}">⏭ ข้ามแค่วันนี้</button>
      <button class="danger" data-act="item-exclude" data-key="${key}" data-kind="ex">🚫 ไม่เล่นท่านี้อีก</button>
      ${famCount > 1 ? `<button class="danger" data-act="item-exclude" data-key="${key}" data-kind="family">🚫 ไม่เล่นทั้ง${esc(FAMILIES[ex.family])} (${famCount} ท่า)</button>` : ''}
    </div>
    <div class="sheet-actions"><button class="btn ghost" data-act="sheet-close">ปิด</button></div>`);
}

function openSwapSheet(key, note = '') {
  const it = findItem(key);
  const ex = EX_BY_ID[it.exId];
  const alts = alternativesFor(it.exId, state, state.active);
  openSheet(`<h2>เลือกท่าแทน ${esc(ex.name)}</h2>
    ${note ? `<p class="notice-text small">${esc(note)}</p>` : ''}
    <p class="muted small">ท่าที่เล่น${esc(MUSCLES[ex.muscle])}เหมือนกัน และใช้อุปกรณ์ที่มีในยิมนี้</p>
    <div class="menu">${alts.length ? alts.map(a => `
      <button data-act="swap-pick" data-key="${key}" data-id="${a.id}">${esc(a.name)} <small>${a.type === 'c' ? 'Compound' : 'Isolation'}${a.bw ? ' · น้ำหนักตัว' : ''}</small></button>`).join('')
      : '<p class="muted">ไม่มีท่าทดแทนจากอุปกรณ์ที่มี</p>'}</div>
    <div class="sheet-actions"><button class="btn ghost" data-act="sheet-close">${note ? 'ไม่ต้องแทน' : 'ยกเลิก'}</button></div>`);
}

function openAddSheet(muscle) {
  if (!muscle) {
    openSheet(`<h2>เพิ่มท่า: เลือกกล้ามเนื้อ</h2>
      <div class="chips">${Object.keys(MUSCLES).map(m => `<button class="chip btn-chip" data-act="add-muscle" data-id="${m}">${esc(MUSCLES[m])}</button>`).join('')}</div>
      <div class="sheet-actions"><button class="btn ghost" data-act="sheet-close">ยกเลิก</button></div>`);
    return;
  }
  const inW = new Set(state.active.items.map(i => i.exId));
  const list = usableExercises(state).filter(e => e.muscle === muscle && !inW.has(e.id));
  openSheet(`<h2>เพิ่มท่า${esc(MUSCLES[muscle])}</h2>
    <div class="menu">${list.length ? list.map(a => `<button data-act="add-pick" data-id="${a.id}">${esc(a.name)} <small>${a.type === 'c' ? 'Compound' : 'Isolation'}</small></button>`).join('') : '<p class="muted">ไม่มีท่าจากอุปกรณ์ที่มี</p>'}</div>
    <div class="sheet-actions"><button class="btn ghost" data-act="wo-add">ย้อนกลับ</button></div>`);
}

function toggleSetDone(key, i) {
  const it = findItem(key);
  const ex = EX_BY_ID[it.exId];
  const s = it.sets[i];
  if (!s.done) {
    if (s.r === '' || s.r == null) s.r = it.rx.hi;
    if ((s.w === '' || s.w == null) && ex.bw) s.w = 0;
    if (s.w === '' || s.w == null) { toast('ใส่น้ำหนักก่อนนะ'); return; }
    s.done = true;
    if (!state.active.startedAt) state.active.startedAt = Date.now();
    // ยกน้ำหนักเซ็ตถัดไปที่ยังว่างให้
    it.sets.forEach((n, j) => { if (j > i && !n.done && (n.w === '' || n.w == null)) n.w = s.w; });
    const prevBest = bestE1rm(it.exId, state.sessions);
    const cur = e1rm(s.w, s.r);
    const sessionBestBefore = Math.max(0, ...it.sets.filter((x, j) => j !== i && x.done).map(x => e1rm(x.w, x.r)));
    if (prevBest > 0 && cur > prevBest && cur > sessionBestBefore) toast(`🎉 PR ใหม่! ${ex.name} ≈ ${fmtW(Math.round(cur * 10) / 10)} kg (1RM)`, 3500);
    startRest(it.rx.rest);
  } else {
    s.done = false;
  }
  save();
  render();
}

function finishWorkout() {
  const w = state.active;
  const items = w.items
    .map(it => ({ exId: it.exId, rx: it.rx, sets: it.sets.filter(s => s.done).map(s => ({ w: +s.w || 0, r: +s.r || 0 })) }))
    .filter(it => it.sets.length);
  if (!items.length) {
    if (confirm('ยังไม่ได้ติ๊กเซ็ตไหนเลย ยกเลิกการฝึกครั้งนี้?')) { state.active = null; stopRest(); save(); render(); }
    return;
  }
  const date = Date.now();
  const prs = items.filter(it => {
    const prev = bestE1rm(it.exId, state.sessions);
    return prev > 0 && Math.max(...it.sets.map(s => e1rm(s.w, s.r))) > prev;
  }).map(it => EX_BY_ID[it.exId].name);
  const session = {
    id: w.id, title: w.title, date,
    duration: Math.round((date - (w.startedAt || date)) / 1000),
    items,
  };
  state.sessions.push(session);
  if (w.dayRef != null) {
    const n = SPLITS[state.program.split].days.length;
    state.program.next = (w.dayRef + 1) % n;
  }
  state.active = null;
  stopRest();
  save();
  ui.tab = 'home';
  render();
  const volume = items.reduce((t, it) => t + it.sets.reduce((a, s) => a + s.w * s.r, 0), 0);
  const sets = items.reduce((t, it) => t + it.sets.length, 0);
  openSheet(`<div class="summary">
    <div class="big-emoji">💪</div>
    <h2>เล่นเสร็จแล้ว!</h2>
    <p class="muted">${esc(session.title)}</p>
    <div class="stats">
      <div class="stat"><span class="num">${fmtTime(session.duration)}</span><span class="muted small">นาที</span></div>
      <div class="stat"><span class="num">${sets}</span><span class="muted small">เซ็ต</span></div>
      <div class="stat"><span class="num">${fmtNum(volume)}</span><span class="muted small">kg รวม</span></div>
    </div>
    ${prs.length ? `<div class="pr-box">🎉 PR ใหม่: ${prs.map(esc).join(', ')}</div>` : ''}
  </div>
  <div class="sheet-actions"><button class="btn primary full" data-act="sheet-close">เยี่ยม!</button></div>`);
}

// ---------- rest timer ----------

let rest = null;
function startRest(sec) {
  rest = { end: Date.now() + sec * 1000, total: sec };
  $timer.classList.add('show');
  tickRest();
}
function stopRest() {
  rest = null;
  $timer.classList.remove('show');
}
function tickRest() {
  if (!rest) return;
  const left = Math.max(0, (rest.end - Date.now()) / 1000);
  $timer.innerHTML = `<div class="rt-bar" style="width:${left / rest.total * 100}%"></div>
    <div class="rt-body"><span class="muted small">พัก</span><b>${fmtTime(Math.ceil(left))}</b>
    <button class="btn small ghost" data-act="rest-add">+15 วิ</button>
    <button class="btn small ghost" data-act="rest-skip">ข้าม</button></div>`;
  if (left <= 0) {
    beep();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    toast('หมดเวลาพัก ไปเซ็ตต่อไป!');
    stopRest();
  }
}
setInterval(() => {
  tickRest();
  const c = document.getElementById('wo-clock');
  if (c && state.active && state.active.startedAt) c.textContent = fmtTime((Date.now() - state.active.startedAt) / 1000);
}, 500);

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach(t => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch (e) { /* ไม่มีเสียงก็ไม่เป็นไร */ }
}

// ---------- history ----------

function renderHistory() {
  const list = [...state.sessions].reverse();
  return `<h1 class="page-title">ประวัติการเล่น</h1>
  ${list.length ? list.map(s => {
    const open = ui.openSession === s.id;
    const volume = s.items.reduce((t, it) => t + it.sets.reduce((a, x) => a + x.w * x.r, 0), 0);
    const muscles = [...new Set(s.items.map(it => EX_BY_ID[it.exId]?.muscle).filter(Boolean))];
    return `<section class="card session">
      <button class="session-head" data-act="session-toggle" data-id="${s.id}">
        <div><b>${esc(s.title)}</b><div class="muted small">${fmtDay(s.date)} · ${fmtTime(s.duration)} นาที · ${fmtNum(volume)} kg</div>
        <div class="chips small-chips">${muscles.map(m => muscleChip(m)).join('')}</div></div>
        <span class="chev ${open ? 'open' : ''}">›</span>
      </button>
      ${open ? `<div class="session-body">
        ${s.items.map(it => { const ex = EX_BY_ID[it.exId]; return `<div class="hist-ex"><b>${esc(ex?.name || it.exId)}</b>
          <div class="muted small">${it.sets.map(x => `${ex?.bw && !x.w ? '' : fmtW(x.w) + ' kg × '}${x.r}`).join(' · ')}</div></div>`; }).join('')}
        <button class="btn small danger mt" data-act="session-delete" data-id="${s.id}">ลบรายการนี้</button>
      </div>` : ''}
    </section>`;
  }).join('') : `<section class="card empty"><p>ยังไม่มีประวัติ</p><p class="muted small">เล่นเสร็จแล้วกด "จบ" ระบบจะบันทึกไว้ที่นี่</p></section>`}`;
}

// ---------- progress ----------

function renderProgress() {
  const done = [...new Set(state.sessions.flatMap(s => s.items.map(i => i.exId)))].filter(id => EX_BY_ID[id]);
  if (!ui.progressEx || !done.includes(ui.progressEx)) ui.progressEx = done[done.length - 1] || null;
  const perMuscle = setsPerMuscleThisWeek(state.sessions);
  const maxSets = Math.max(20, ...Object.values(perMuscle));

  let exBlock = `<section class="card empty"><p>ยังไม่มีข้อมูล</p><p class="muted small">เล่นให้ครบสักครั้ง แล้วกราฟจะขึ้นที่นี่</p></section>`;
  if (ui.progressEx) {
    const ex = EX_BY_ID[ui.progressEx];
    const rows = exerciseHistory(ui.progressEx, state.sessions);
    const metrics = { e1rm: '1RM โดยประมาณ', maxW: 'น้ำหนักสูงสุด', volume: 'Volume รวม' };
    if (ex.bw && rows.every(r => !r.maxW)) { ui.progressMetric = 'reps'; metrics.reps = 'จำนวนครั้งรวม'; delete metrics.e1rm; delete metrics.maxW; delete metrics.volume; }
    else if (ui.progressMetric === 'reps') ui.progressMetric = 'e1rm';
    const m = ui.progressMetric;
    const best = rows.reduce((b, r) => r[m] > b[m] ? r : b, rows[0]);
    const first = rows[0], lastR = rows[rows.length - 1];
    const change = first[m] ? (lastR[m] - first[m]) / first[m] * 100 : 0;
    const unit = m === 'reps' ? 'ครั้ง' : 'kg';
    exBlock = `<section class="card">
      <select class="input" data-input="progress-ex">${done.map(id => `<option value="${id}" ${id === ui.progressEx ? 'selected' : ''}>${esc(EX_BY_ID[id].name)}</option>`).join('')}</select>
      <div class="seg mt">${Object.entries(metrics).map(([k, v]) => `<button class="${m === k ? 'on' : ''}" data-act="metric" data-v="${k}">${v}</button>`).join('')}</div>
      <div class="kpis">
        <div><span class="muted small">ล่าสุด</span><b>${fmtW(Math.round(lastR[m] * 10) / 10)} <small>${unit}</small></b></div>
        <div><span class="muted small">ดีที่สุด</span><b>${fmtW(Math.round(best[m] * 10) / 10)} <small>${unit}</small></b></div>
        <div><span class="muted small">เปลี่ยนแปลง</span><b class="${change >= 0 ? 'pos' : 'neg'}">${change >= 0 ? '+' : ''}${change.toFixed(0)}%</b></div>
      </div>
      ${lineChart(rows.map(r => ({ x: r.date, y: r[m] })), unit)}
      ${m === 'e1rm' ? '<p class="muted small">1RM โดยประมาณ = น้ำหนัก × (1 + ครั้ง ÷ 30) ใช้เทียบความแข็งแรงแม้จำนวนครั้งไม่เท่ากัน</p>' : ''}
      <details class="mt"><summary class="small">ดูเป็นตาราง</summary>
        <table class="tbl"><thead><tr><th>วันที่</th><th>เซ็ต</th><th>${metrics[m]}</th></tr></thead><tbody>
        ${[...rows].reverse().map(r => `<tr><td>${fmtDate(r.date)}</td><td>${r.sets.map(s => `${ex.bw && !s.w ? '' : fmtW(s.w) + '×'}${s.r}`).join(', ')}</td><td>${fmtW(Math.round(r[m] * 10) / 10)}</td></tr>`).join('')}
        </tbody></table></details>
    </section>`;
  }

  return `<h1 class="page-title">Progress</h1>
  ${exBlock}
  <section class="card">
    <h3>จำนวนเซ็ตสัปดาห์นี้ แยกตามกล้ามเนื้อ</h3>
    <p class="muted small">แนะนำประมาณ 10–20 เซ็ต/สัปดาห์ สำหรับกล้ามเนื้อหลัก</p>
    <div class="bars">${Object.entries(perMuscle).map(([k, v]) => `
      <div class="bar-row" title="${esc(MUSCLES[k])}: ${v} เซ็ต">
        <span class="bar-lbl">${esc(MUSCLES[k])}</span>
        <span class="bar-track"><span class="bar-zone" style="left:${10 / maxSets * 100}%;width:${10 / maxSets * 100}%"></span><span class="bar-fill" style="width:${v / maxSets * 100}%"></span></span>
        <span class="bar-val">${v}</span>
      </div>`).join('')}</div>
  </section>
  <section class="card">
    <h3>น้ำหนักตัว</h3>
    <div class="row gap">
      <input class="input num grow" type="number" inputmode="decimal" step="0.1" placeholder="kg" id="bw-input">
      <button class="btn primary" data-act="bw-add">บันทึก</button>
    </div>
    ${state.bodyweight.length >= 2 ? lineChart(state.bodyweight.map(b => ({ x: b.date, y: b.kg })), 'kg') : state.bodyweight.length ? `<p class="muted small mt">ล่าสุด ${fmtW(state.bodyweight[0].kg)} kg (${fmtDate(state.bodyweight[0].date)})</p>` : '<p class="muted small mt">บันทึกอย่างน้อย 2 ครั้งเพื่อดูกราฟ</p>'}
  </section>`;
}

// กราฟเส้นแบบ SVG ชุดเดียว: เส้น 2px, จุด 8px, grid จาง, แตะ/ชี้เพื่อดูค่า
function lineChart(points, unit) {
  if (!points.length) return '';
  const W = 340, H = 180, P = { l: 40, r: 12, t: 14, b: 26 };
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  let yMin = Math.min(...ys), yMax = Math.max(...ys);
  if (yMin === yMax) { yMin -= 5; yMax += 5; }
  const pad = (yMax - yMin) * 0.15; yMin = Math.max(0, yMin - pad); yMax += pad;
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const sx = x => points.length === 1 ? (P.l + W - P.r) / 2 : P.l + (x - xMin) / (xMax - xMin) * (W - P.l - P.r);
  const sy = y => P.t + (1 - (y - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const ticks = [0, 0.5, 1].map(f => yMin + f * (yMax - yMin));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const data = esc(JSON.stringify(points.map(p => [sx(p.x), sy(p.y), fmtDate(p.x), fmtW(Math.round(p.y * 10) / 10)])));
  return `<div class="chart" data-points="${data}" data-unit="${esc(unit)}">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟ ${points.length} จุด">
      ${ticks.map(t => `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${sy(t)}" y2="${sy(t)}"/><text class="axis" x="${P.l - 6}" y="${sy(t) + 4}" text-anchor="end">${fmtW(Math.round(t))}</text>`).join('')}
      <text class="axis" x="${P.l}" y="${H - 6}">${fmtDate(xMin)}</text>
      ${points.length > 1 ? `<text class="axis" x="${W - P.r}" y="${H - 6}" text-anchor="end">${fmtDate(xMax)}</text>` : ''}
      <path class="line" d="${path}"/>
      ${points.map(p => `<circle class="dot" cx="${sx(p.x)}" cy="${sy(p.y)}" r="4"/>`).join('')}
      <line class="cross" x1="0" x2="0" y1="${P.t}" y2="${H - P.b}" style="display:none"/>
      <circle class="hover-dot" r="6" style="display:none"/>
    </svg>
    <div class="tip" style="display:none"></div>
  </div>`;
}

function chartHover(chart, clientX) {
  const pts = JSON.parse(chart.dataset.points);
  const svg = chart.querySelector('svg');
  const rect = svg.getBoundingClientRect();
  const vx = (clientX - rect.left) / rect.width * 340;
  let best = pts[0];
  for (const p of pts) if (Math.abs(p[0] - vx) < Math.abs(best[0] - vx)) best = p;
  const cross = svg.querySelector('.cross'), dot = svg.querySelector('.hover-dot'), tip = chart.querySelector('.tip');
  cross.setAttribute('x1', best[0]); cross.setAttribute('x2', best[0]); cross.style.display = '';
  dot.setAttribute('cx', best[0]); dot.setAttribute('cy', best[1]); dot.style.display = '';
  tip.innerHTML = `<span class="muted">${best[2]}</span><b>${best[3]} ${chart.dataset.unit}</b>`;
  tip.style.display = '';
  const left = best[0] / 340 * rect.width;
  tip.style.left = Math.min(Math.max(left, 50), rect.width - 50) + 'px';
  tip.style.top = (best[1] / 180 * rect.height - 8) + 'px';
}

// ---------- settings ----------

function renderSettings() {
  const sec = ui.settingsSection;
  if (sec === 'profile') return subPage('ข้อมูลของคุณ', renderProfileForm() + '<button class="btn primary full" data-act="profile-save">บันทึก</button>');
  if (sec === 'equipment') return subPage('อุปกรณ์: ' + currentGym(state).name, renderEquipmentEditor());
  if (sec === 'exclusions') return subPage('ท่าที่ไม่เล่น', renderExclusionEditor());
  if (sec === 'split') return subPage('รูปแบบโปรแกรม', renderSplitPicker());
  const p = state.profile;
  const gym = currentGym(state);
  return `<h1 class="page-title">ตั้งค่า</h1>
  <section class="card list">
    <button class="list-item" data-act="settings-open" data-id="profile"><span>ข้อมูลของคุณ</span><span class="muted small">${esc(LEVELS[p.level].name)} · ${esc(GOALS[p.goal].name)} ›</span></button>
    <button class="list-item" data-act="settings-open" data-id="split"><span>รูปแบบโปรแกรม</span><span class="muted small">${esc(SPLITS[state.program.split].name)} ›</span></button>
    <button class="list-item" data-act="settings-open" data-id="exclusions"><span>ท่าที่ไม่เล่น</span><span class="muted small">${activeExclusions(state.exclusions).length} รายการ ›</span></button>
  </section>
  <section class="card list">
    <h3>ยิมของฉัน</h3>
    ${state.gyms.map(g => `<div class="list-item">
      <button class="grow left" data-act="gym-select" data-id="${g.id}"><span class="radio ${g.id === gym.id ? 'on' : ''}"></span> ${esc(g.name)} <span class="muted small">${g.equipment.length} อุปกรณ์</span></button>
      ${state.gyms.length > 1 ? `<button class="icon-btn small" data-act="gym-delete" data-id="${g.id}" aria-label="ลบ">🗑</button>` : ''}
    </div>`).join('')}
    <div class="row gap mt">
      <button class="btn small secondary" data-act="settings-open" data-id="equipment">แก้อุปกรณ์ยิมนี้</button>
      <button class="btn small ghost" data-act="gym-add">+ เพิ่มยิม</button>
    </div>
  </section>
  <section class="card list">
    <h3>ข้อมูล</h3>
    <p class="muted small">ข้อมูลทั้งหมดเก็บไว้ในเครื่องนี้เท่านั้น ควรสำรองไว้เป็นระยะ</p>
    <div class="row gap wrap">
      <button class="btn small secondary" data-act="export">⬇ สำรองข้อมูล (.json)</button>
      <label class="btn small ghost">⬆ กู้คืน<input type="file" accept="application/json,.json" data-input="import" hidden></label>
      <button class="btn small danger" data-act="reset">ล้างข้อมูลทั้งหมด</button>
    </div>
  </section>
  <p class="muted small center">GymPlan prototype v0.1</p>`;
}

function subPage(title, body) {
  return `<header class="sub-head"><button class="icon-btn" data-act="settings-back" aria-label="กลับ">‹</button><h1>${esc(title)}</h1></header>${body}`;
}

// ---------- sheet ----------

function openSheet(html) {
  $sheet.innerHTML = `<div class="sheet-backdrop" data-act="sheet-close"></div><div class="sheet-panel">${html}</div>`;
  $sheet.classList.add('show');
  ui.sheetChecks = null;
}
function closeSheet() {
  $sheet.classList.remove('show');
  $sheet.innerHTML = '';
}

// ---------- events ----------

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, id, key, kind, v } = el.dataset;
  const i = el.dataset.i != null ? +el.dataset.i : null;
  const actions = {
    tab: () => { ui.tab = id; ui.settingsSection = null; window.scrollTo(0, 0); render(); },
    goto: () => { ui.tab = id; window.scrollTo(0, 0); render(); },

    // onboarding
    draft: () => { draftProfile()[el.dataset.k] = isNaN(+v) ? v : +v; render(); },
    'ob-next': () => {
      if (ui.onboardStep === 1 && !currentGym(state).equipment.length && !confirm('ยังไม่ได้เลือกอุปกรณ์ จะได้เฉพาะท่าน้ำหนักตัว ไปต่อไหม?')) return;
      if (ui.onboardStep < 3) { ui.onboardStep++; window.scrollTo(0, 0); render(); return; }
      state.profile = { ...draftProfile() }; ui.draft = null; save(); render();
    },
    'ob-back': () => { ui.onboardStep--; render(); },

    // equipment
    'eq-toggle': () => {
      const g = currentGym(state);
      g.equipment = g.equipment.includes(id) ? g.equipment.filter(x => x !== id) : [...g.equipment, id];
      save(); render();
    },
    'eq-all': () => { currentGym(state).equipment = [...ALL_EQUIPMENT]; save(); render(); },
    'eq-none': () => { currentGym(state).equipment = []; save(); render(); },
    split: () => { if (state.program.split !== id) state.program = { split: id, next: 0 }; save(); render(); },

    // exclusions
    'ex-duration': () => { ui.exDuration = +v; render(); },
    'ex-add': () => { addExclusion(kind, id); toast('กันไว้แล้ว ระบบจะไม่จัดท่านี้ให้'); render(); },
    'ex-remove': () => { state.exclusions = state.exclusions.filter(x => !(x.kind === kind && x.id === id)); save(); render(); },
    injury: () => openInjurySheet(id),
    'sheet-check': () => el.classList.toggle('on'),
    'injury-apply': () => {
      const reason = 'เจ็บ' + STRESS[id];
      $sheet.querySelectorAll('[data-act="sheet-check"]').forEach(b => {
        const ex = EX_BY_ID[b.dataset.id];
        const direct = state.exclusions.find(x => x.kind === 'ex' && x.id === ex.id);
        if (b.classList.contains('on') && !isExcluded(ex, state.exclusions)) addExclusion('ex', ex.id, reason);
        if (!b.classList.contains('on') && direct) state.exclusions = state.exclusions.filter(x => x !== direct);
      });
      save(); closeSheet(); render();
    },
    'expired-unlock': () => { state.exclusions = state.exclusions.filter(x => !(x.kind === kind && x.id === id)); save(); render(); },
    'expired-extend': () => { const x = state.exclusions.find(x => x.kind === kind && x.id === id); x.until = Date.now() + 14 * 864e5; save(); render(); },

    // home
    'start-program': () => {
      const sp = SPLITS[state.program.split];
      const idx = state.program.next % sp.days.length;
      startWorkout(sp.days[idx].slots, sp.days[idx].name, idx);
    },
    'skip-day': () => { state.program.next = (state.program.next + 1) % SPLITS[state.program.split].days.length; save(); render(); },
    'choose-day': () => {
      const sp = SPLITS[state.program.split];
      openSheet(`<h2>เลือกวัน</h2><div class="menu">${sp.days.map((d, j) => `<button data-act="pick-day" data-i="${j}">${esc(d.name)}</button>`).join('')}</div>
        <div class="sheet-actions"><button class="btn ghost" data-act="sheet-close">ยกเลิก</button></div>`);
    },
    'pick-day': () => { state.program.next = i; save(); closeSheet(); render(); },
    'custom-toggle': () => { ui.customMuscles = ui.customMuscles.includes(id) ? ui.customMuscles.filter(m => m !== id) : [...ui.customMuscles, id]; render(); },
    'start-custom': () => {
      const ms = Object.keys(MUSCLES).filter(m => ui.customMuscles.includes(m));
      startWorkout(slotsForMuscles(ms), ms.map(m => MUSCLES[m]).join(' + '), null);
      ui.customMuscles = [];
    },
    'gym-switch': () => {
      openSheet(`<h2>เลือกยิม</h2><div class="menu">${state.gyms.map(g => `<button data-act="gym-select" data-id="${g.id}">${g.id === state.activeGym ? '● ' : ''}${esc(g.name)} <small>${g.equipment.length} อุปกรณ์</small></button>`).join('')}
        <button data-act="gym-add">+ เพิ่มยิม</button></div><div class="sheet-actions"><button class="btn ghost" data-act="sheet-close">ปิด</button></div>`);
    },
    'gym-select': () => { state.activeGym = id; save(); closeSheet(); render(); },
    'gym-add': () => {
      const name = prompt('ชื่อยิมใหม่', 'ยิม ' + (state.gyms.length + 1));
      if (!name) return;
      const g = { id: uid(), name: name.trim(), equipment: [] };
      state.gyms.push(g); state.activeGym = g.id; save(); closeSheet();
      ui.tab = 'settings'; ui.settingsSection = 'equipment'; render();
    },
    'gym-delete': () => {
      if (!confirm('ลบยิมนี้?')) return;
      state.gyms = state.gyms.filter(g => g.id !== id);
      if (state.activeGym === id) state.activeGym = state.gyms[0].id;
      save(); render();
    },

    // workout
    'wo-cancel': () => { if (confirm('ยกเลิกการฝึกครั้งนี้? ข้อมูลที่กรอกจะหายไป')) { state.active = null; stopRest(); save(); render(); } },
    'wo-finish': finishWorkout,
    'wo-regen': () => { const w = state.active; startWorkout(w.slots, w.title, w.dayRef); },
    'wo-add': () => openAddSheet(null),
    'add-muscle': () => openAddSheet(id),
    'add-pick': () => { state.active.items.push(makeItem(EX_BY_ID[id], state)); save(); closeSheet(); render(); },
    'set-done': () => toggleSetDone(key, i),
    'set-add': () => { const it = findItem(key); const l = it.sets[it.sets.length - 1]; it.sets.push({ w: l ? l.w : '', r: l ? l.r : '', done: false }); save(); render(); },
    'set-remove': () => { findItem(key).sets.pop(); save(); render(); },
    'item-menu': () => openItemMenu(key),
    swap: () => openSwapSheet(key),
    'swap-pick': () => {
      const it = findItem(key);
      const fresh = makeItem(EX_BY_ID[id], state);
      Object.assign(it, { exId: fresh.exId, rx: fresh.rx, sets: fresh.sets, suggestion: fresh.suggestion });
      save(); closeSheet(); render();
    },
    'item-up': () => {
      const arr = state.active.items; const j = arr.findIndex(x => x.key === key);
      if (j > 0) [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
      save(); closeSheet(); render();
    },
    'item-skip': () => { state.active.items = state.active.items.filter(x => x.key !== key); save(); closeSheet(); render(); },
    'item-exclude': () => {
      const it = findItem(key); const ex = EX_BY_ID[it.exId];
      ui.exDuration = 0;
      addExclusion(kind, kind === 'family' ? ex.family : ex.id, 'ไม่เอาระหว่างเล่น');
      render();
      openSwapSheet(key, `กัน ${kind === 'family' ? FAMILIES[ex.family] : ex.name} แล้ว เลือกท่าแทนได้เลย`);
      // ถ้าไม่เลือกท่าแทน ให้เอาท่าเดิมออกตอนปิด
      ui.removeOnClose = key;
    },
    'rest-add': () => { if (rest) { rest.end += 15000; rest.total += 15; tickRest(); } },
    'rest-skip': stopRest,

    // history
    'session-toggle': () => { ui.openSession = ui.openSession === id ? null : id; render(); },
    'session-delete': () => { if (confirm('ลบประวัติครั้งนี้? ย้อนกลับไม่ได้')) { state.sessions = state.sessions.filter(s => s.id !== id); save(); render(); } },

    // progress
    metric: () => { ui.progressMetric = v; render(); },
    'bw-add': () => {
      const val = +document.getElementById('bw-input').value;
      if (!val) return;
      state.bodyweight.push({ date: Date.now(), kg: val });
      state.bodyweight.sort((a, b) => a.date - b.date);
      save(); render(); toast('บันทึกน้ำหนักตัวแล้ว');
    },

    // settings
    'settings-open': () => { ui.settingsSection = id; if (id === 'profile') ui.draft = null; window.scrollTo(0, 0); render(); },
    'settings-back': () => { ui.settingsSection = null; render(); },
    'profile-save': () => { state.profile = { ...draftProfile() }; ui.draft = null; save(); ui.settingsSection = null; render(); toast('บันทึกแล้ว'); },
    export: () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gymplan-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    reset: () => {
      if (!confirm('ล้างข้อมูลทั้งหมด รวมประวัติการเล่น? ย้อนกลับไม่ได้')) return;
      state = defaultState(); ui.onboardStep = 0; ui.tab = 'home'; ui.settingsSection = null; save(); render();
    },
    'sheet-close': () => {
      if (ui.removeOnClose) {
        state.active.items = state.active.items.filter(x => x.key !== ui.removeOnClose);
        ui.removeOnClose = null; save(); render();
      }
      closeSheet();
    },
  };
  if (act === 'swap-pick') ui.removeOnClose = null;
  if (actions[act]) { e.preventDefault(); actions[act](); }
});

document.addEventListener('input', e => {
  const el = e.target;
  const t = el.dataset.input;
  if (t === 'set') {
    const it = findItem(el.dataset.key);
    if (it) { it.sets[+el.dataset.i][el.dataset.f] = el.value; save(); }
  } else if (t === 'gym-name') {
    currentGym(state).name = el.value; save();
  } else if (t === 'ex-search') {
    ui.exSearch = el.value;
    const q = el.value.trim().toLowerCase();
    const results = q ? EXERCISES.filter(x => x.name.toLowerCase().includes(q) || (FAMILIES[x.family] || '').toLowerCase().includes(q)).slice(0, 12) : [];
    document.getElementById('ex-results').innerHTML = renderExSearchResults(results);
  }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.input === 'progress-ex') { ui.progressEx = el.value; render(); }
  if (el.dataset.input === 'import' && el.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.gyms || !data.sessions) throw new Error('bad');
        if (!confirm(`กู้คืนข้อมูล ${data.sessions.length} ครั้ง? ข้อมูลปัจจุบันจะถูกแทนที่`)) return;
        state = { ...defaultState(), ...data }; save(); render(); toast('กู้คืนเรียบร้อย');
      } catch (err) { toast('ไฟล์ไม่ถูกต้อง'); }
    };
    reader.readAsText(el.files[0]);
  }
});

// hover/แตะกราฟ
document.addEventListener('pointermove', e => { const c = e.target.closest('.chart'); if (c) chartHover(c, e.clientX); });
document.addEventListener('pointerdown', e => { const c = e.target.closest('.chart'); if (c) chartHover(c, e.clientX); });
document.addEventListener('pointerleave', e => {
  const c = e.target.closest && e.target.closest('.chart');
  if (!c) return;
  c.querySelector('.tip').style.display = 'none';
  c.querySelectorAll('.cross,.hover-dot').forEach(n => n.style.display = 'none');
}, true);

// PWA
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

render();
