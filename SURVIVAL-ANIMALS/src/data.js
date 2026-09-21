export const VERSION = 1;
export const SAVE_KEY = "survival-animals.save.v1";
export const DAY_SECONDS = 360;
export const ISLANDS = [
  {
    id: 0,
    name: "陽だまりの島",
    en: "SUNBREAK ISLE",
    x: 0,
    z: 0,
    r: 48,
    color: "#9cb96c",
    sky: "#a4d1dc",
    description: "潮風と古代遺跡。すべては、この浜辺から。",
    spawn: [0, 25],
  },
  {
    id: 1,
    name: "霧氷の島",
    en: "FROSTVEIL",
    x: 126,
    z: -18,
    r: 43,
    color: "#accbd2",
    sky: "#9ebdcf",
    description: "青い結晶の森。炎の仲間には暖かな休息を。",
    spawn: [122, 10],
  },
  {
    id: 2,
    name: "嵐冠の島",
    en: "TEMPEST CROWN",
    x: 214,
    z: -120,
    r: 40,
    color: "#786b65",
    sky: "#b2a0b8",
    description: "嵐の奥で、最後の守護獣があなたを待つ。",
    spawn: [211, -96],
  },
];
export const ITEMS = {
  wood: { name: "流木", icon: "▰", color: "#bca37e" },
  stone: { name: "石材", icon: "◆", color: "#b8c7cf" },
  fiber: { name: "植物繊維", icon: "≋", color: "#b7d795" },
  berry: { name: "太陽の実", icon: "●", color: "#f39b72" },
  crystal: { name: "霜の結晶", icon: "✦", color: "#79dbe4" },
  rune: { name: "ルーン石", icon: "◇", color: "#80eece" },
  meal: { name: "温かな料理", icon: "♨", color: "#f8c07e" },
  pelt: { name: "獣の毛束", icon: "▧", color: "#c5b3a9" },
};
export const SPECIES = {
  ember: {
    name: "エンバーフォックス",
    en: "EMBERFOX",
    model: "Fox",
    color: 0xbc6235,
    accent: 0xffbd64,
    hp: 72,
    damage: 9,
    speed: 4.0,
    size: 1.25,
    element: "炎",
    description: "尾に小さな太陽を宿す相棒。炎の力で旅を照らす。",
    food: "berry",
  },
  moss: {
    name: "モスブル",
    en: "MOSSBULL",
    model: "Bull",
    color: 0x738b47,
    accent: 0xb5d66b,
    hp: 135,
    damage: 13,
    speed: 2.6,
    size: 1.65,
    element: "草",
    description: "背中に苔の庭を育てる力持ち。ゆっくりでも頼もしい。",
    food: "berry",
  },
  leaf: {
    name: "リーフホーン",
    en: "LEAFHORN",
    model: "Stag",
    color: 0xa48561,
    accent: 0x6de4bc,
    hp: 100,
    damage: 10,
    speed: 4.6,
    size: 1.8,
    element: "森",
    description: "枝角に森の記憶を灯す。足が速く、島の探索に向く。",
    food: "berry",
  },
  night: {
    name: "ナイトウルフ",
    en: "NIGHTWOLF",
    model: "Wolf",
    color: 0x252e51,
    accent: 0x7cabff,
    hp: 112,
    damage: 16,
    speed: 4.5,
    size: 1.5,
    element: "夜",
    description: "月の光で目覚める獣。昼の眠りを邪魔すると危険。",
    food: "meal",
  },
  frost: {
    name: "フロストホーン",
    en: "FROSTHORN",
    model: "Stag",
    color: 0xb9d9dd,
    accent: 0x66d8ff,
    hp: 230,
    damage: 18,
    speed: 3.8,
    size: 2.7,
    element: "氷",
    description: "霧氷の島の守護獣。絆を結ぶと、空への道が開く。",
    food: "meal",
  },
  tempest: {
    name: "テンペスト",
    en: "TEMPEST SOVEREIGN",
    model: "Wolf",
    color: 0x333347,
    accent: 0xf0c771,
    hp: 460,
    damage: 23,
    speed: 3.6,
    size: 3.3,
    element: "嵐",
    description: "嵐冠の守護獣。強さの先に、共に歩む未来を選ぶ。",
    food: "meal",
  },
};
export const RECIPES = [
  {
    id: "rune",
    name: "ルーン石 ×3",
    icon: "◇",
    cost: { stone: 3, fiber: 2 },
    out: { rune: 3 },
    description: "弱らせた獣と絆を結ぶ。捕獲1回で1個使用。",
  },
  {
    id: "meal",
    name: "温かな料理 ×2",
    icon: "♨",
    cost: { berry: 4, wood: 1 },
    out: { meal: 2 },
    station: "campfire",
    description: "体力45・空腹50回復。仲間の成長にも。",
  },
  {
    id: "spear",
    name: "石刃の槍",
    icon: "↟",
    cost: { wood: 6, stone: 8, fiber: 3 },
    gear: "spear",
    description: "攻撃力が18から29へ。通常攻撃の射程も伸びる。",
  },
  {
    id: "coat",
    name: "防寒マント",
    icon: "▧",
    cost: { fiber: 6, pelt: 2 },
    gear: "coat",
    description: "霧氷の寒さを防ぐ。夜の探索にも。",
  },
  {
    id: "raft",
    name: "探検いかだ",
    icon: "⛵",
    cost: { wood: 12, fiber: 6, stone: 3 },
    gear: "raft",
    description: "海辺で自動乗船。地図から霧氷の島へ渡れる。",
  },
  {
    id: "saddle",
    name: "旅人のサドル",
    icon: "♧",
    cost: { wood: 5, fiber: 6, pelt: 2 },
    gear: "saddle",
    description: "Rで同行中の仲間に騎乗。より速く移動する。",
  },
  {
    id: "sky",
    name: "空のサドル",
    icon: "✧",
    cost: { wood: 6, crystal: 5, fiber: 8 },
    gear: "sky",
    unlock: "frost",
    description: "フロストホーン捕獲後に解放。騎乗して海を越え、嵐冠へ。",
  },
];
export const BUILDINGS = {
  campfire: {
    name: "焚き火",
    icon: "♨",
    cost: { wood: 4, stone: 3 },
    model: "campfire-pit",
    description: "料理と朝まで休息。近くの仲間を暖める。",
  },
  shelter: {
    name: "住居",
    icon: "⌂",
    cost: { wood: 8, fiber: 5 },
    model: "tent",
    description: "周囲で体力が回復。仲間を寒さから守る。",
  },
  workbench: {
    name: "作業台",
    icon: "⚒",
    cost: { wood: 6, stone: 3 },
    model: "workbench",
    description: "利用すると製作画面が開く。",
  },
  fence: {
    name: "柵",
    icon: "▥",
    cost: { wood: 2 },
    model: "fence",
    description: "島に自分だけの庭を作る。",
  },
  chest: {
    name: "収納箱",
    icon: "▣",
    cost: { wood: 5 },
    model: "chest",
    description: "利用すると持ち物とセーブ管理を開く。",
  },
};
export const QUESTS = [
  {
    title: "潮風の案内人",
    detail: "浜辺のミナに E で話しかける。",
    at: [3, 22],
    test: (s) => s.flags.met,
  },
  {
    title: "最初の絆",
    detail: "橙色の狐を弱らせ、Q で捕獲する。",
    at: [8, 4],
    test: (s) => !!s.companions.ember,
  },
  {
    title: "帰る場所をつくろう",
    detail: "B → 焚き火を選び、浜辺に設置する。",
    test: (s) => s.buildings.some((b) => b.kind === "campfire"),
  },
  {
    title: "水平線の向こうへ",
    detail: "Tab → 製作でいかだを作り、M で霧氷へ。",
    at: [126, -18],
    test: (s) => s.visited.includes(1),
  },
  {
    title: "霧氷の守護獣",
    detail: "島の奥のフロストホーンと絆を結ぶ。",
    at: [125, -32],
    test: (s) => !!s.companions.frost,
  },
  {
    title: "空をひらく",
    detail: "結晶を採集して空のサドルを製作。M で嵐冠へ。",
    at: [214, -120],
    test: (s) => s.visited.includes(2),
  },
  {
    title: "嵐の、その先に",
    detail: "テンペストの体力を20%以下にして Q で捕獲。",
    at: [214, -129],
    test: (s) => !!s.flags.won,
  },
  {
    title: "旅は、これからも",
    detail: "すべての種との絆や、あなただけの拠点を育てよう。",
    test: () => false,
  },
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function rng(seed = 19) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function islandAt(x, z) {
  return ISLANDS.find((i) => Math.hypot(x - i.x, z - i.z) < i.r) || null;
}
export function heightAt(x, z) {
  const i = islandAt(x, z);
  if (!i) return -1.2;
  const dx = x - i.x,
    dz = z - i.z,
    r = Math.hypot(dx, dz) / i.r;
  let h =
    1.9 +
    Math.sin(dx * 0.085) * Math.cos(dz * 0.1) * 1.25 +
    Math.sin(dz * 0.21) * 0.22;
  h *= clamp((1 - r) * 7, 0, 1);
  if (i.id === 2 && Math.hypot(dx, dz + 9) < 12) h = 2.3;
  return h;
}
