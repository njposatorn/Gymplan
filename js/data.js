// ฐานข้อมูลอุปกรณ์ กล้ามเนื้อ และท่าออกกำลังกาย

const EQUIPMENT_GROUPS = [
  { id: 'free', name: 'Free weight', items: [
    { id: 'dumbbell', name: 'ดัมเบล' },
    { id: 'barbell', name: 'บาร์เบล + แผ่นน้ำหนัก' },
    { id: 'ezbar', name: 'EZ bar' },
    { id: 'trap_bar', name: 'Trap / Hex bar' },
    { id: 'kettlebell', name: 'Kettlebell' },
  ]},
  { id: 'rack', name: 'Rack / ม้านั่ง / สถานี', items: [
    { id: 'squat_rack', name: 'Squat rack / Power rack' },
    { id: 'bench_station', name: 'ม้านั่ง Bench press (มีที่วางบาร์)' },
    { id: 'bench', name: 'ม้านั่งปรับระดับ' },
    { id: 'smith', name: 'Smith machine' },
    { id: 'pullup_bar', name: 'บาร์โหน (Pull-up bar)' },
    { id: 'dip_station', name: 'ที่ Dip / Captain\'s chair' },
    { id: 'back_ext_bench', name: 'ม้า Back extension' },
    { id: 'preacher_bench', name: 'ม้า Preacher curl' },
  ]},
  { id: 'cable', name: 'Cable', items: [
    { id: 'cable', name: 'Cable ปรับระดับ / Crossover' },
    { id: 'lat_pulldown', name: 'Lat pulldown' },
    { id: 'seated_row', name: 'Seated cable row' },
  ]},
  { id: 'machine', name: 'เครื่อง (Machine)', items: [
    { id: 'chest_press', name: 'Chest press' },
    { id: 'pec_deck', name: 'Pec deck / Rear delt fly' },
    { id: 'shoulder_press', name: 'Shoulder press' },
    { id: 'row_machine', name: 'Row machine (มีที่พิงอก)' },
    { id: 'assisted_pullup', name: 'Assisted pull-up / dip' },
    { id: 'leg_press', name: 'Leg press' },
    { id: 'hack_squat', name: 'Hack squat' },
    { id: 'leg_extension', name: 'Leg extension' },
    { id: 'leg_curl', name: 'Leg curl' },
    { id: 'hip_thrust_machine', name: 'Hip thrust machine' },
    { id: 'hip_abductor', name: 'Hip abductor' },
    { id: 'calf_machine', name: 'Calf raise machine' },
  ]},
];

const ALL_EQUIPMENT = EQUIPMENT_GROUPS.flatMap(g => g.items.map(i => i.id));

const MUSCLES = {
  chest: 'อก',
  back: 'หลัง',
  shoulders: 'ไหล่',
  biceps: 'แขนหน้า',
  triceps: 'แขนหลัง',
  quads: 'ต้นขาหน้า',
  hamstrings: 'ต้นขาหลัง',
  glutes: 'ก้น',
  calves: 'น่อง',
  core: 'หน้าท้อง / Core',
};
const BIG_MUSCLES = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes'];

const STRESS = {
  lower_back: 'หลังล่าง',
  knee: 'เข่า',
  shoulder: 'ไหล่',
  elbow: 'ข้อศอก',
  wrist: 'ข้อมือ',
  hip: 'สะโพก',
  neck: 'คอ',
};

const FAMILIES = {
  bench_press: 'ตระกูล Bench press (บาร์)',
  db_press: 'ตระกูล Dumbbell press',
  chest_machine: 'ตระกูล Chest press machine',
  fly: 'ตระกูล Fly',
  pushup: 'ตระกูล Push-up',
  dip: 'ตระกูล Dips',
  deadlift: 'ตระกูล Deadlift',
  row: 'ตระกูล Row',
  pulldown: 'ตระกูล Pulldown',
  pullup: 'ตระกูล Pull-up / Chin-up',
  straight_arm: 'ตระกูล Straight-arm pulldown',
  back_ext: 'ตระกูล Back extension',
  ohp: 'ตระกูล Overhead press',
  lateral_raise: 'ตระกูล Lateral raise',
  rear_delt: 'ตระกูล Rear delt',
  curl: 'ตระกูล Curl',
  hammer_curl: 'ตระกูล Hammer curl',
  preacher_curl: 'ตระกูล Preacher curl',
  pushdown: 'ตระกูล Pushdown',
  triceps_ext: 'ตระกูล Triceps extension',
  kickback: 'ตระกูล Kickback',
  squat: 'ตระกูล Squat',
  hack_squat: 'ตระกูล Hack squat',
  leg_press: 'ตระกูล Leg press',
  leg_ext: 'ตระกูล Leg extension',
  lunge: 'ตระกูล Lunge / Split squat',
  rdl: 'ตระกูล Romanian deadlift',
  good_morning: 'ตระกูล Good morning',
  leg_curl: 'ตระกูล Leg curl',
  pull_through: 'ตระกูล Pull-through',
  kb_swing: 'ตระกูล Kettlebell swing',
  hip_thrust: 'ตระกูล Hip thrust / Bridge',
  abduction: 'ตระกูล Hip abduction',
  glute_kickback: 'ตระกูล Glute kickback',
  calf: 'ตระกูล Calf raise',
  plank: 'ตระกูล Plank',
  crunch: 'ตระกูล Crunch',
  leg_raise: 'ตระกูล Leg raise',
  anti_rotation: 'ตระกูล Anti-rotation',
};

// X(id, ชื่อ, ตระกูล, กล้ามหลัก, กล้ามรอง, c=compound/i=isolation, ความยาก 1-3,
//   อุปกรณ์ที่ต้องมีทุกชิ้น ('a|b' = อย่างใดอย่างหนึ่ง), บริเวณที่รับแรง, flags: bw=ใช้น้ำหนักตัว t=จับเวลา)
function X(id, name, family, muscle, secondary, type, level, equip, stress, flags = '') {
  return {
    id, name, family, muscle, secondary, type, level, equip, stress,
    bw: flags.includes('bw'), timed: flags.includes('t'),
  };
}

const EXERCISES = [
  // อก
  X('bb_bench', 'Barbell Bench Press', 'bench_press', 'chest', ['triceps', 'shoulders'], 'c', 2, ['barbell', 'bench_station|squat_rack', 'bench_station|bench'], ['shoulder', 'wrist']),
  X('bb_incline', 'Incline Barbell Bench Press', 'bench_press', 'chest', ['shoulders', 'triceps'], 'c', 2, ['barbell', 'squat_rack', 'bench'], ['shoulder', 'wrist']),
  X('smith_bench', 'Smith Machine Bench Press', 'bench_press', 'chest', ['triceps', 'shoulders'], 'c', 1, ['smith', 'bench'], ['shoulder']),
  X('smith_incline', 'Smith Machine Incline Press', 'bench_press', 'chest', ['shoulders', 'triceps'], 'c', 1, ['smith', 'bench'], ['shoulder']),
  X('db_bench', 'Dumbbell Bench Press', 'db_press', 'chest', ['triceps', 'shoulders'], 'c', 1, ['dumbbell', 'bench'], ['shoulder']),
  X('db_incline', 'Incline Dumbbell Press', 'db_press', 'chest', ['shoulders', 'triceps'], 'c', 1, ['dumbbell', 'bench'], ['shoulder']),
  X('machine_chest', 'Machine Chest Press', 'chest_machine', 'chest', ['triceps', 'shoulders'], 'c', 1, ['chest_press'], []),
  X('pec_deck', 'Pec Deck Fly', 'fly', 'chest', [], 'i', 1, ['pec_deck'], ['shoulder']),
  X('cable_fly', 'Cable Crossover Fly', 'fly', 'chest', [], 'i', 1, ['cable'], ['shoulder']),
  X('low_cable_fly', 'Low-to-High Cable Fly', 'fly', 'chest', ['shoulders'], 'i', 1, ['cable'], []),
  X('db_fly', 'Dumbbell Fly', 'fly', 'chest', [], 'i', 2, ['dumbbell', 'bench'], ['shoulder']),
  X('pushup', 'Push-up', 'pushup', 'chest', ['triceps', 'shoulders'], 'c', 1, [], ['wrist'], 'bw'),
  X('dips_chest', 'Chest Dips', 'dip', 'chest', ['triceps', 'shoulders'], 'c', 2, ['dip_station'], ['shoulder', 'elbow'], 'bw'),

  // หลัง
  X('deadlift', 'Conventional Deadlift', 'deadlift', 'back', ['hamstrings', 'glutes'], 'c', 3, ['barbell'], ['lower_back', 'hip']),
  X('sumo_deadlift', 'Sumo Deadlift', 'deadlift', 'back', ['glutes', 'quads'], 'c', 3, ['barbell'], ['lower_back', 'hip']),
  X('trapbar_deadlift', 'Trap Bar Deadlift', 'deadlift', 'back', ['quads', 'glutes'], 'c', 2, ['trap_bar'], ['lower_back']),
  X('bb_row', 'Barbell Bent-over Row', 'row', 'back', ['biceps'], 'c', 2, ['barbell'], ['lower_back']),
  X('tbar_row', 'T-bar Row (Landmine)', 'row', 'back', ['biceps'], 'c', 2, ['barbell'], ['lower_back']),
  X('db_row', 'One-arm Dumbbell Row', 'row', 'back', ['biceps'], 'c', 1, ['dumbbell', 'bench'], []),
  X('chest_sup_db_row', 'Chest-supported Dumbbell Row', 'row', 'back', ['biceps', 'shoulders'], 'c', 1, ['dumbbell', 'bench'], []),
  X('cable_row', 'Seated Cable Row', 'row', 'back', ['biceps'], 'c', 1, ['seated_row|cable'], []),
  X('machine_row', 'Machine Row', 'row', 'back', ['biceps'], 'c', 1, ['row_machine'], []),
  X('inverted_row', 'Inverted Row', 'row', 'back', ['biceps'], 'c', 1, ['smith|squat_rack'], [], 'bw'),
  X('lat_pulldown', 'Lat Pulldown', 'pulldown', 'back', ['biceps'], 'c', 1, ['lat_pulldown|cable'], []),
  X('close_pulldown', 'Close-grip Pulldown', 'pulldown', 'back', ['biceps'], 'c', 1, ['lat_pulldown|cable'], []),
  X('pullup', 'Pull-up', 'pullup', 'back', ['biceps'], 'c', 3, ['pullup_bar'], ['shoulder', 'elbow'], 'bw'),
  X('chinup', 'Chin-up', 'pullup', 'back', ['biceps'], 'c', 2, ['pullup_bar'], ['elbow'], 'bw'),
  X('assisted_pullup', 'Assisted Pull-up Machine', 'pullup', 'back', ['biceps'], 'c', 1, ['assisted_pullup'], []),
  X('straight_arm_pd', 'Straight-arm Pulldown', 'straight_arm', 'back', [], 'i', 1, ['cable|lat_pulldown'], []),
  X('back_ext', 'Back Extension', 'back_ext', 'back', ['glutes', 'hamstrings'], 'i', 1, ['back_ext_bench'], ['lower_back'], 'bw'),

  // ไหล่
  X('bb_ohp', 'Barbell Overhead Press', 'ohp', 'shoulders', ['triceps'], 'c', 2, ['barbell'], ['shoulder', 'lower_back']),
  X('db_shoulder_press', 'Seated Dumbbell Shoulder Press', 'ohp', 'shoulders', ['triceps'], 'c', 1, ['dumbbell', 'bench'], ['shoulder']),
  X('arnold_press', 'Arnold Press', 'ohp', 'shoulders', ['triceps'], 'c', 2, ['dumbbell', 'bench'], ['shoulder']),
  X('machine_shoulder', 'Machine Shoulder Press', 'ohp', 'shoulders', ['triceps'], 'c', 1, ['shoulder_press'], ['shoulder']),
  X('smith_ohp', 'Smith Machine Shoulder Press', 'ohp', 'shoulders', ['triceps'], 'c', 1, ['smith', 'bench'], ['shoulder']),
  X('db_lateral', 'Dumbbell Lateral Raise', 'lateral_raise', 'shoulders', [], 'i', 1, ['dumbbell'], ['shoulder']),
  X('cable_lateral', 'Cable Lateral Raise', 'lateral_raise', 'shoulders', [], 'i', 1, ['cable'], ['shoulder']),
  X('reverse_pec_deck', 'Reverse Pec Deck', 'rear_delt', 'shoulders', ['back'], 'i', 1, ['pec_deck'], []),
  X('face_pull', 'Face Pull', 'rear_delt', 'shoulders', ['back'], 'i', 1, ['cable'], []),
  X('db_rear_fly', 'Bent-over Dumbbell Reverse Fly', 'rear_delt', 'shoulders', ['back'], 'i', 1, ['dumbbell'], ['lower_back']),

  // แขนหน้า
  X('bb_curl', 'Barbell Curl', 'curl', 'biceps', [], 'i', 1, ['barbell'], ['elbow', 'wrist']),
  X('ez_curl', 'EZ-bar Curl', 'curl', 'biceps', [], 'i', 1, ['ezbar'], ['elbow']),
  X('db_curl', 'Dumbbell Curl', 'curl', 'biceps', [], 'i', 1, ['dumbbell'], []),
  X('incline_db_curl', 'Incline Dumbbell Curl', 'curl', 'biceps', [], 'i', 2, ['dumbbell', 'bench'], ['shoulder']),
  X('cable_curl', 'Cable Curl', 'curl', 'biceps', [], 'i', 1, ['cable'], []),
  X('hammer_curl', 'Hammer Curl', 'hammer_curl', 'biceps', [], 'i', 1, ['dumbbell'], []),
  X('preacher_curl', 'Preacher Curl', 'preacher_curl', 'biceps', [], 'i', 1, ['preacher_bench', 'ezbar|dumbbell'], ['elbow']),

  // แขนหลัง
  X('pushdown', 'Cable Triceps Pushdown', 'pushdown', 'triceps', [], 'i', 1, ['cable|lat_pulldown'], []),
  X('rope_pushdown', 'Rope Pushdown', 'pushdown', 'triceps', [], 'i', 1, ['cable|lat_pulldown'], []),
  X('oh_cable_ext', 'Overhead Cable Extension', 'triceps_ext', 'triceps', [], 'i', 1, ['cable'], ['elbow', 'shoulder']),
  X('skullcrusher', 'Skull Crusher', 'triceps_ext', 'triceps', [], 'i', 2, ['ezbar|barbell', 'bench'], ['elbow']),
  X('db_oh_ext', 'Overhead Dumbbell Extension', 'triceps_ext', 'triceps', [], 'i', 1, ['dumbbell'], ['elbow', 'shoulder']),
  X('db_kickback', 'Dumbbell Kickback', 'kickback', 'triceps', [], 'i', 1, ['dumbbell'], []),
  X('close_grip_bench', 'Close-grip Bench Press', 'bench_press', 'triceps', ['chest'], 'c', 2, ['barbell', 'bench_station|squat_rack', 'bench_station|bench'], ['wrist', 'elbow']),
  X('dips_tri', 'Triceps Dips', 'dip', 'triceps', ['chest'], 'c', 2, ['dip_station'], ['shoulder', 'elbow'], 'bw'),

  // ต้นขาหน้า
  X('back_squat', 'Barbell Back Squat', 'squat', 'quads', ['glutes', 'hamstrings'], 'c', 3, ['barbell', 'squat_rack'], ['knee', 'lower_back', 'hip']),
  X('front_squat', 'Front Squat', 'squat', 'quads', ['glutes'], 'c', 3, ['barbell', 'squat_rack'], ['knee', 'wrist']),
  X('smith_squat', 'Smith Machine Squat', 'squat', 'quads', ['glutes'], 'c', 1, ['smith'], ['knee']),
  X('goblet_squat', 'Goblet Squat', 'squat', 'quads', ['glutes'], 'c', 1, ['dumbbell|kettlebell'], ['knee']),
  X('bw_squat', 'Bodyweight Squat', 'squat', 'quads', ['glutes'], 'c', 1, [], ['knee'], 'bw'),
  X('hack_squat', 'Hack Squat', 'hack_squat', 'quads', ['glutes'], 'c', 1, ['hack_squat'], ['knee']),
  X('leg_press', 'Leg Press', 'leg_press', 'quads', ['glutes'], 'c', 1, ['leg_press'], ['knee', 'lower_back']),
  X('leg_ext', 'Leg Extension', 'leg_ext', 'quads', [], 'i', 1, ['leg_extension'], ['knee']),
  X('bulgarian', 'Bulgarian Split Squat', 'lunge', 'quads', ['glutes'], 'c', 2, ['dumbbell', 'bench'], ['knee']),
  X('walking_lunge', 'Dumbbell Walking Lunge', 'lunge', 'quads', ['glutes'], 'c', 1, ['dumbbell'], ['knee']),
  X('step_up', 'Dumbbell Step-up', 'lunge', 'quads', ['glutes'], 'c', 1, ['dumbbell', 'bench'], ['knee']),

  // ต้นขาหลัง
  X('rdl', 'Romanian Deadlift', 'rdl', 'hamstrings', ['glutes', 'back'], 'c', 2, ['barbell'], ['lower_back']),
  X('db_rdl', 'Dumbbell Romanian Deadlift', 'rdl', 'hamstrings', ['glutes'], 'c', 1, ['dumbbell'], ['lower_back']),
  X('good_morning', 'Good Morning', 'good_morning', 'hamstrings', ['back', 'glutes'], 'c', 3, ['barbell', 'squat_rack'], ['lower_back']),
  X('leg_curl', 'Leg Curl (Machine)', 'leg_curl', 'hamstrings', [], 'i', 1, ['leg_curl'], []),
  X('cable_pull_through', 'Cable Pull-through', 'pull_through', 'hamstrings', ['glutes'], 'c', 1, ['cable'], []),
  X('kb_swing', 'Kettlebell Swing', 'kb_swing', 'hamstrings', ['glutes'], 'c', 2, ['kettlebell'], ['lower_back']),

  // ก้น
  X('hip_thrust', 'Barbell Hip Thrust', 'hip_thrust', 'glutes', ['hamstrings'], 'c', 1, ['barbell', 'bench'], ['hip']),
  X('smith_hip_thrust', 'Smith Machine Hip Thrust', 'hip_thrust', 'glutes', ['hamstrings'], 'c', 1, ['smith', 'bench'], ['hip']),
  X('machine_hip_thrust', 'Hip Thrust Machine', 'hip_thrust', 'glutes', ['hamstrings'], 'c', 1, ['hip_thrust_machine'], []),
  X('glute_bridge', 'Glute Bridge', 'hip_thrust', 'glutes', ['hamstrings'], 'c', 1, [], [], 'bw'),
  X('hip_abduction', 'Hip Abduction Machine', 'abduction', 'glutes', [], 'i', 1, ['hip_abductor'], []),
  X('cable_kickback', 'Cable Glute Kickback', 'glute_kickback', 'glutes', [], 'i', 1, ['cable'], []),

  // น่อง
  X('standing_calf', 'Standing Calf Raise Machine', 'calf', 'calves', [], 'i', 1, ['calf_machine'], []),
  X('leg_press_calf', 'Calf Press on Leg Press', 'calf', 'calves', [], 'i', 1, ['leg_press'], []),
  X('smith_calf', 'Smith Machine Calf Raise', 'calf', 'calves', [], 'i', 1, ['smith'], []),
  X('db_calf', 'Dumbbell Calf Raise', 'calf', 'calves', [], 'i', 1, ['dumbbell'], []),
  X('bw_calf', 'Bodyweight Calf Raise', 'calf', 'calves', [], 'i', 1, [], [], 'bw'),

  // Core
  X('plank', 'Plank', 'plank', 'core', [], 'i', 1, [], [], 'bw t'),
  X('side_plank', 'Side Plank', 'plank', 'core', [], 'i', 1, [], ['shoulder'], 'bw t'),
  X('dead_bug', 'Dead Bug', 'plank', 'core', [], 'i', 1, [], [], 'bw'),
  X('cable_crunch', 'Cable Crunch', 'crunch', 'core', [], 'i', 1, ['cable'], ['lower_back']),
  X('crunch', 'Crunch', 'crunch', 'core', [], 'i', 1, [], ['neck'], 'bw'),
  X('hanging_leg_raise', 'Hanging Leg Raise', 'leg_raise', 'core', [], 'i', 2, ['pullup_bar'], ['shoulder'], 'bw'),
  X('captains_chair', 'Knee Raise (Captain\'s chair)', 'leg_raise', 'core', [], 'i', 1, ['dip_station'], [], 'bw'),
  X('pallof', 'Pallof Press', 'anti_rotation', 'core', [], 'i', 1, ['cable'], []),
];

const EX_BY_ID = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
