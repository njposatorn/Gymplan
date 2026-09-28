// ตัวจัดโปรแกรม: กรองท่าตามอุปกรณ์/ท่าที่ไม่เล่น แล้วเลือกท่าลงแต่ละช่อง

// slot = 'muscle[:c|i][:family]'
const SPLITS = {
  full: { name: 'Full Body', desc: '2–3 วัน/สัปดาห์ เหมาะกับมือใหม่', days: [
    { name: 'Full Body A', slots: ['quads:c', 'chest:c', 'back:c', 'hamstrings', 'shoulders', 'biceps:i', 'core'] },
    { name: 'Full Body B', slots: ['hamstrings:c', 'back:c', 'chest:c', 'quads', 'shoulders:i:lateral_raise', 'triceps:i', 'calves'] },
  ]},
  ul: { name: 'Upper / Lower', desc: '4 วัน/สัปดาห์', days: [
    { name: 'Upper', slots: ['chest:c', 'back:c', 'shoulders:c', 'back', 'chest:i', 'biceps:i', 'triceps:i'] },
    { name: 'Lower', slots: ['quads:c', 'hamstrings:c', 'quads', 'glutes', 'hamstrings:i', 'calves', 'core'] },
  ]},
  ppl: { name: 'Push / Pull / Legs', desc: '3 หรือ 6 วัน/สัปดาห์', days: [
    { name: 'Push (อก ไหล่ แขนหลัง)', slots: ['chest:c', 'shoulders:c', 'chest', 'chest:i', 'shoulders:i:lateral_raise', 'triceps:i', 'triceps:i'] },
    { name: 'Pull (หลัง แขนหน้า)', slots: ['back:c', 'back:c', 'back', 'shoulders:i:rear_delt', 'biceps:i', 'biceps:i', 'core'] },
    { name: 'Legs (ขา ก้น)', slots: ['quads:c', 'hamstrings:c', 'quads', 'glutes', 'hamstrings:i', 'calves'] },
  ]},
  bro: { name: 'Bro Split', desc: '5 วัน วันละส่วน', days: [
    { name: 'อก', slots: ['chest:c', 'chest:c', 'chest', 'chest:i', 'triceps:i'] },
    { name: 'หลัง', slots: ['back:c', 'back:c', 'back', 'back', 'biceps:i'] },
    { name: 'ขา', slots: ['quads:c', 'hamstrings:c', 'quads', 'glutes', 'hamstrings:i', 'calves'] },
    { name: 'ไหล่', slots: ['shoulders:c', 'shoulders:i:lateral_raise', 'shoulders:i:rear_delt', 'shoulders', 'core'] },
    { name: 'แขน', slots: ['biceps:i', 'triceps:i', 'biceps', 'triceps', 'biceps:i', 'triceps:i'] },
  ]},
};

const GOALS = {
  muscle: { name: 'เพิ่มกล้าม', c: { sets: 4, lo: 6, hi: 10, rest: 120 }, i: { sets: 3, lo: 10, hi: 15, rest: 75 } },
  strength: { name: 'เพิ่มแรง', c: { sets: 5, lo: 3, hi: 5, rest: 180 }, i: { sets: 3, lo: 8, hi: 10, rest: 90 } },
  fatloss: { name: 'ลดไขมัน / กระชับ', c: { sets: 3, lo: 10, hi: 15, rest: 75 }, i: { sets: 3, lo: 12, hi: 20, rest: 45 } },
  general: { name: 'สุขภาพทั่วไป', c: { sets: 3, lo: 8, hi: 12, rest: 90 }, i: { sets: 3, lo: 10, hi: 15, rest: 60 } },
};

const LEVELS = {
  beginner: { name: 'มือใหม่ (< 6 เดือน)', maxLevel: 2 },
  intermediate: { name: 'ระดับกลาง', maxLevel: 3 },
  advanced: { name: 'ขั้นสูง', maxLevel: 3 },
};

function hasEquipment(ex, eqSet) {
  return ex.equip.every(req => req.split('|').some(e => eqSet.has(e)));
}

function activeExclusions(exclusions, now = Date.now()) {
  return exclusions.filter(x => !x.until || x.until > now);
}

function isExcluded(ex, exclusions) {
  return activeExclusions(exclusions).some(x =>
    (x.kind === 'ex' && x.id === ex.id) || (x.kind === 'family' && x.id === ex.family));
}

function exclusionFor(ex, exclusions) {
  return activeExclusions(exclusions).find(x =>
    (x.kind === 'ex' && x.id === ex.id) || (x.kind === 'family' && x.id === ex.family));
}

function usableExercises(state) {
  const eq = new Set(currentGym(state).equipment);
  const maxLevel = LEVELS[state.profile.level].maxLevel;
  return EXERCISES.filter(ex => hasEquipment(ex, eq) && !isExcluded(ex, state.exclusions) && ex.level <= maxLevel);
}

function currentGym(state) {
  return state.gyms.find(g => g.id === state.activeGym) || state.gyms[0];
}

// กล้ามเนื้อที่ไม่มีท่าให้เล่นเลย (เพราะอุปกรณ์ไม่มี หรือกันท่าไปหมด)
function uncoveredMuscles(state) {
  const pool = usableExercises(state);
  return Object.keys(MUSCLES).filter(m => !pool.some(ex => ex.muscle === m));
}

function prescription(ex, profile) {
  const g = GOALS[profile.goal] || GOALS.general;
  const base = { ...g[ex.type] };
  if (profile.level === 'beginner' && ex.type === 'c') base.sets = Math.max(3, base.sets - 1);
  if (ex.timed) { base.lo = 30; base.hi = 60; base.rest = 60; }
  return base;
}

function parseSlot(s) {
  const [muscle, type, family] = s.split(':');
  return { muscle, type: type || null, family: family || null };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// เลือกท่าลงช่อง: ตรงกล้าม > ตรงประเภท > ไม่ซ้ำตระกูลที่เลือกไปแล้ว
function pickForSlot(slot, pool, chosen) {
  const usedIds = new Set(chosen.map(e => e.id));
  const usedFamilies = new Set(chosen.map(e => e.family));
  let cands = pool.filter(ex => ex.muscle === slot.muscle && !usedIds.has(ex.id));
  if (!cands.length) return null;
  const narrow = (list, fn) => { const f = list.filter(fn); return f.length ? f : list; };
  if (slot.family) cands = narrow(cands, ex => ex.family === slot.family);
  if (slot.type) cands = narrow(cands, ex => ex.type === slot.type);
  cands = narrow(cands, ex => !usedFamilies.has(ex.family));
  // ช่อง compound ให้ท่าที่ใช้อุปกรณ์ (มีน้ำหนักให้ progress) ก่อนท่าน้ำหนักตัว
  if (slot.type === 'c') cands = narrow(cands, ex => !ex.bw || ex.muscle === 'core');
  return pickRandom(cands);
}

function slotsForMuscles(muscles) {
  const slots = [];
  for (const m of muscles) {
    if (BIG_MUSCLES.includes(m)) slots.push(`${m}:c`, `${m}`);
    else slots.push(`${m}:i`);
  }
  // เลือกน้อยส่วนเกินไป เติมท่าให้ครบอย่างน้อย 5 ท่า
  let i = 0;
  while (slots.length < 5 && muscles.length) {
    const m = muscles[i % muscles.length];
    slots.push(BIG_MUSCLES.includes(m) ? `${m}:i` : m);
    i++;
    if (i > 12) break;
  }
  // เรียง compound ขึ้นก่อน
  return slots.sort((a, b) => (b.includes(':c') ? 1 : 0) - (a.includes(':c') ? 1 : 0));
}

function estimateMinutes(items) {
  return items.reduce((t, it) => t + it.rx.sets * (it.rx.rest + 45) / 60 + 1.5, 0);
}

function buildWorkout(state, slotStrings, title, dayRef) {
  const pool = usableExercises(state);
  const chosen = [];
  const missing = new Set();
  for (const s of slotStrings) {
    const slot = parseSlot(s);
    const ex = pickForSlot(slot, pool, chosen);
    if (ex) chosen.push(ex);
    else if (!pool.some(e => e.muscle === slot.muscle)) missing.add(slot.muscle);
  }
  let items = chosen.map(ex => makeItem(ex, state));
  // ตัดท่าท้ายๆ ออกถ้าเกินเวลาที่มี (เหลืออย่างน้อย 3 ท่า)
  const limit = state.profile.minutes || 60;
  while (items.length > 3 && estimateMinutes(items) > limit) items.pop();
  const warnings = [...missing].map(m => `ไม่มีท่าสำหรับ "${MUSCLES[m]}" จากอุปกรณ์ที่มี/ท่าที่กันไว้`);
  return { id: uid(), title, dayRef, createdAt: Date.now(), startedAt: null, items, warnings, slots: slotStrings };
}

function makeItem(ex, state) {
  const rx = prescription(ex, state.profile);
  const last = lastPerformance(ex.id, state.sessions);
  const sug = suggestion(ex, rx, last);
  const sets = [];
  for (let i = 0; i < rx.sets; i++) {
    const prev = last && last.sets[i];
    sets.push({
      w: sug.weight != null ? sug.weight : '',
      r: prev ? prev.r : '',
      done: false,
    });
  }
  return { key: uid(), exId: ex.id, rx, sets, suggestion: sug };
}

function alternativesFor(exId, state, workout) {
  const ex = EX_BY_ID[exId];
  const inWorkout = new Set(workout ? workout.items.map(i => i.exId) : []);
  return usableExercises(state)
    .filter(e => e.muscle === ex.muscle && !inWorkout.has(e.id))
    .sort((a, b) => (a.type === ex.type ? 0 : 1) - (b.type === ex.type ? 0 : 1) || a.level - b.level);
}

// ---------- ประวัติ / progress ----------

function e1rm(w, r) {
  w = +w; r = +r;
  if (!w || !r) return 0;
  return r === 1 ? w : w * (1 + r / 30);
}

function lastPerformance(exId, sessions) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const it = sessions[i].items.find(x => x.exId === exId);
    if (it && it.sets.length) return { date: sessions[i].date, sets: it.sets, rx: it.rx };
  }
  return null;
}

function weightStep(ex) {
  if (ex.equip.some(r => r.includes('kettlebell')) && !ex.equip.some(r => r.includes('dumbbell'))) return 4;
  if (ex.equip.some(r => r.startsWith('dumbbell'))) return 2;
  return 2.5;
}

// progressive overload: ครั้งก่อนทำครบทุกเซ็ตถึงจำนวนครั้งสูงสุด → เพิ่มน้ำหนัก
function suggestion(ex, rx, last) {
  if (!last) return { weight: null, text: 'ครั้งแรก เริ่มจากน้ำหนักที่ทำได้ ' + rx.hi + ' ครั้งแบบยังเหลือแรง 2–3 ครั้ง' };
  const weights = last.sets.map(s => +s.w || 0);
  const topW = Math.max(...weights);
  const hitAll = last.sets.length >= rx.sets && last.sets.every(s => +s.r >= rx.hi);
  if (ex.bw && topW === 0) {
    return hitAll
      ? { weight: 0, text: 'ครั้งก่อนทำได้ครบ ลองเพิ่มจำนวนครั้ง หรือถือน้ำหนักเพิ่ม' }
      : { weight: 0, text: 'พยายามเพิ่มจำนวนครั้งจากครั้งก่อน' };
  }
  if (hitAll) {
    const w = +(topW + weightStep(ex)).toFixed(2);
    return { weight: w, up: true, text: `ครั้งก่อนทำครบ ${rx.hi} ครั้งทุกเซ็ต → เพิ่มเป็น ${fmtW(w)} kg` };
  }
  return { weight: topW, text: `ใช้ ${fmtW(topW)} kg ต่อ ทำให้ครบ ${rx.hi} ครั้งทุกเซ็ตแล้วค่อยเพิ่ม` };
}

function bestE1rm(exId, sessions, beforeTs = Infinity) {
  let best = 0;
  for (const s of sessions) {
    if (s.date >= beforeTs) continue;
    const it = s.items.find(x => x.exId === exId);
    if (!it) continue;
    for (const set of it.sets) best = Math.max(best, e1rm(set.w, set.r));
  }
  return best;
}

function exerciseHistory(exId, sessions) {
  const rows = [];
  for (const s of sessions) {
    const it = s.items.find(x => x.exId === exId);
    if (!it || !it.sets.length) continue;
    const maxW = Math.max(...it.sets.map(x => +x.w || 0));
    const best = Math.max(...it.sets.map(x => e1rm(x.w, x.r)));
    const volume = it.sets.reduce((t, x) => t + (+x.w || 0) * (+x.r || 0), 0);
    const reps = it.sets.reduce((t, x) => t + (+x.r || 0), 0);
    rows.push({ date: s.date, maxW, e1rm: best, volume, reps, sets: it.sets });
  }
  return rows;
}

function weekStart(ts = Date.now()) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // จันทร์ = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function setsPerMuscleThisWeek(sessions) {
  const start = weekStart();
  const out = Object.fromEntries(Object.keys(MUSCLES).map(m => [m, 0]));
  for (const s of sessions) {
    if (s.date < start) continue;
    for (const it of s.items) {
      const ex = EX_BY_ID[it.exId];
      if (ex) out[ex.muscle] += it.sets.length;
    }
  }
  return out;
}

function streakWeeks(sessions) {
  // จำนวนสัปดาห์ติดต่อกัน (นับถึงสัปดาห์นี้/สัปดาห์ก่อน) ที่มีการเล่นอย่างน้อย 1 ครั้ง
  const weeks = new Set(sessions.map(s => weekStart(s.date)));
  let w = weekStart();
  if (!weeks.has(w)) w -= 7 * 864e5;
  let n = 0;
  while (weeks.has(w)) { n++; w = weekStart(w - 3 * 864e5); }
  return n;
}

function fmtW(w) {
  return String(Math.round(+w * 100) / 100);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
