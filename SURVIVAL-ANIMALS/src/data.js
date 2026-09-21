export const VERSION = 1;
export const SAVE_KEY = "survival-animals.save.v1";
export const DAY_SECONDS = 360;
export const ISLANDS = [
  {
    id: 0,
    name: "ひだまりのしま",
    en: "はじめのしま",
    x: 0,
    z: 0,
    r: 48,
    color: "#9cb96c",
    sky: "#a4d1dc",
    description: "あたたかい かぜが ふくしま。ここから はじめよう。",
    spawn: [0, 25],
  },
  {
    id: 1,
    name: "こおりのしま",
    en: "雪と こおりのしま",
    x: 126,
    z: -18,
    r: 43,
    color: "#accbd2",
    sky: "#9ebdcf",
    description: "青い石が 光る森。さむいときは 火で あたたまろう。",
    spawn: [122, 10],
  },
  {
    id: 2,
    name: "あらしのしま",
    en: "あらしの おおかみ",
    x: 214,
    z: -120,
    r: 40,
    color: "#786b65",
    sky: "#b2a0b8",
    description: "あらしの おくで、大きな おおかみが まっているよ。",
    spawn: [211, -96],
  },
  {
    id: 3,
    name: "いわのしま",
    en: "大きな どうくつ",
    x: -119,
    z: 0,
    r: 44,
    color: "#b5a086",
    sky: "#bdcbd2",
    description: "となりのしま。どうくつの おくに 大きないわうしが いるよ。",
    spawn: [-119, 29],
  },
  {
    id: 4,
    name: "きのこのしま",
    en: "光る きのこの森",
    x: 0,
    z: 122,
    r: 44,
    color: "#9b9ab6",
    sky: "#c4b8d9",
    description: "光る きのこと 青いどうくつ。大きなしかに 会いに行こう。",
    spawn: [0, 151],
  },
  {
    id: 5,
    name: "火のしま",
    en: "赤い どうくつ",
    x: 126,
    z: 111,
    r: 43,
    color: "#bd8b67",
    sky: "#d7b196",
    description: "赤い石が 光るどうくつ。火の大きつねが まっているよ。",
    spawn: [126, 139],
  },
];
export const CAVES = [
  {
    island: 3,
    x: -119,
    z: 0,
    name: "いわのどうくつ",
    boss: "boulder",
    id: "cave-rock",
    color: 0x777480,
    glow: 0x79ccff,
  },
  {
    island: 4,
    x: 0,
    z: 122,
    name: "きのこのどうくつ",
    boss: "elder",
    id: "cave-forest",
    color: 0x625374,
    glow: 0x9de9d0,
  },
  {
    island: 5,
    x: 126,
    z: 111,
    name: "火のどうくつ",
    boss: "inferno",
    id: "cave-fire",
    color: 0x634542,
    glow: 0xff9c51,
  },
];
export function caveAt(x, z) {
  return (
    CAVES.find(
      (c) => Math.abs(x - c.x) < 13.2 && z > c.z - 23 && z < c.z + 16,
    ) || null
  );
}
export function caveWallAt(x, z) {
  return CAVES.some((c) => {
    const dx = Math.abs(x - c.x),
      dz = z - c.z;
    return (
      (dx > 12.2 && dx < 16 && dz > -25 && dz < 18) ||
      (dz > -26 && dz < -22 && dx < 16) ||
      (dz > 14 && dz < 18 && dx > 4.4 && dx < 16)
    );
  });
}
export const ITEMS = {
  wood: { name: "木", icon: "▰", color: "#bca37e" },
  stone: { name: "石", icon: "◆", color: "#b8c7cf" },
  fiber: { name: "草のひも", icon: "≋", color: "#b7d795" },
  berry: { name: "木の実", icon: "●", color: "#f39b72" },
  crystal: { name: "光る石", icon: "✦", color: "#79dbe4" },
  rune: { name: "なかまの石", icon: "◇", color: "#80eece" },
  meal: { name: "あたたかい ごはん", icon: "♨", color: "#f8c07e" },
  pelt: { name: "どうぶつの毛", icon: "▧", color: "#c5b3a9" },
};
export const SPECIES = {
  boulder: {
    name: "いわの大うし",
    en: "いわの大うし",
    model: "Bull",
    color: 0x626773,
    accent: 0x91d4ec,
    hp: 560,
    damage: 20,
    speed: 2.4,
    size: 5.4,
    element: "石",
    description:
      "どうくつの おくにいる、大きなうし。足もとの 赤いまるから にげよう。",
    food: "meal",
    boss: true,
  },
  elder: {
    name: "森の大しか",
    en: "森の大しか",
    model: "Stag",
    color: 0x708879,
    accent: 0xb1ffe4,
    hp: 660,
    damage: 21,
    speed: 2.8,
    size: 6.2,
    element: "森",
    description: "光る きのこのどうくつに すむ。大きな つのが 目じるしだよ。",
    food: "meal",
    boss: true,
  },
  inferno: {
    name: "火の大きつね",
    en: "火の大きつね",
    model: "Fox",
    color: 0x963d2b,
    accent: 0xffc361,
    hp: 740,
    damage: 23,
    speed: 3.1,
    size: 5.1,
    element: "火",
    description:
      "赤いどうくつの おくで まつ。なかまにすると、とても たのもしいよ。",
    food: "meal",
    boss: true,
  },
  ember: {
    name: "火のこぎつね",
    en: "EMBERFOX",
    model: "Fox",
    color: 0xbc6235,
    accent: 0xffbd64,
    hp: 72,
    damage: 9,
    speed: 4.0,
    size: 1.25,
    element: "火",
    description: "しっぽに 小さな火が ともる。いっしょに たびをしよう。",
    food: "berry",
  },
  moss: {
    name: "森のうし",
    en: "MOSSBULL",
    model: "Bull",
    color: 0x738b47,
    accent: 0xb5d66b,
    hp: 135,
    damage: 13,
    speed: 2.6,
    size: 1.65,
    element: "草",
    description: "せなかに 草が はえる、力もちの うし。",
    food: "berry",
  },
  leaf: {
    name: "森のしか",
    en: "LEAFHORN",
    model: "Stag",
    color: 0xa48561,
    accent: 0x6de4bc,
    hp: 100,
    damage: 10,
    speed: 4.6,
    size: 1.8,
    element: "森",
    description: "つのに 森の光が ともる。足が はやいよ。",
    food: "berry",
  },
  night: {
    name: "夜のおおかみ",
    en: "NIGHTWOLF",
    model: "Wolf",
    color: 0x252e51,
    accent: 0x7cabff,
    hp: 112,
    damage: 16,
    speed: 4.5,
    size: 1.5,
    element: "夜",
    description: "夜に おきる おおかみ。昼は ねているよ。",
    food: "meal",
  },
  frost: {
    name: "こおりのしか",
    en: "FROSTHORN",
    model: "Stag",
    color: 0xb9d9dd,
    accent: 0x66d8ff,
    hp: 230,
    damage: 18,
    speed: 3.8,
    size: 2.7,
    element: "氷",
    description: "こおりのしまの大きなぼす。なかまになると、空への道が開く。",
    food: "meal",
  },
  tempest: {
    boss: true,
    name: "あらしのおおかみ",
    en: "TEMPEST SOVEREIGN",
    model: "Wolf",
    color: 0x333347,
    accent: 0xf0c771,
    hp: 460,
    damage: 23,
    speed: 3.6,
    size: 3.3,
    element: "あらし",
    description: "あらしのしまを まもる おおかみ。さいごは なかまになろう。",
    food: "meal",
  },
};
export const RECIPES = [
  {
    id: "rune",
    name: "なかまの石 ×3",
    icon: "◇",
    cost: { stone: 3, fiber: 2 },
    out: { rune: 3 },
    description: "よわらせた どうぶつを なかまにする石。1回に1こ つかうよ。",
  },
  {
    id: "meal",
    name: "あたたかい ごはん ×2",
    icon: "♨",
    cost: { berry: 4, wood: 1 },
    out: { meal: 2 },
    station: "campfire",
    description: "体力が45、おなかが50もどる。なかまにも あげられるよ。",
  },
  {
    id: "spear",
    name: "石のやり",
    icon: "↟",
    cost: { wood: 6, stone: 8, fiber: 3 },
    gear: "spear",
    description: "こうげきの力が18から29へ。少し とおくにも とどくよ。",
  },
  {
    id: "coat",
    name: "あたたかい ふく",
    icon: "▧",
    cost: { fiber: 6, pelt: 2 },
    gear: "coat",
    description: "さむいしまでも 体が ひえにくくなるよ。",
  },
  {
    id: "raft",
    name: "たびのふね",
    icon: "⛵",
    cost: { wood: 12, fiber: 6, stone: 3 },
    gear: "raft",
    description:
      "はじめから もっているよ。海に 入ると のれるよ。M で しまを えらぼう。",
  },
  {
    id: "saddle",
    name: "なかまのくら",
    icon: "♧",
    cost: { wood: 5, fiber: 6, pelt: 2 },
    gear: "saddle",
    description: "R で なかまに のれるよ。はやく 走ろう。",
  },
  {
    id: "sky",
    name: "空のくら",
    icon: "✧",
    cost: { wood: 6, crystal: 5, fiber: 8 },
    gear: "sky",
    unlock: "frost",
    description:
      "こおりのしかが なかまになると 作れるよ。空から あらしのしまへ。",
  },
];
export const BUILDINGS = {
  campfire: {
    name: "たき火",
    icon: "♨",
    cost: { wood: 4, stone: 3 },
    model: "campfire-pit",
    description:
      "ごはんを 作ったり、朝まで 休んだりする。なかまも あたたまるよ。",
  },
  shelter: {
    name: "家",
    icon: "⌂",
    cost: { wood: 8, fiber: 5 },
    model: "tent",
    description: "近くにいると 体力が もどるよ。なかまの 家にもなる。",
  },
  workbench: {
    name: "作るつくえ",
    icon: "⚒",
    cost: { wood: 6, stone: 3 },
    model: "workbench",
    description: "近くで E をおすと、ものを 作れるよ。",
  },
  fence: {
    name: "さく",
    icon: "▥",
    cost: { wood: 2 },
    model: "fence",
    description: "自分だけの にわを 作ろう。",
  },
  chest: {
    name: "もちものばこ",
    icon: "▣",
    cost: { wood: 5 },
    model: "chest",
    description: "E で もちものを見る。たびを きろくできるよ。",
  },
};
export const QUESTS = [
  {
    title: "みなに 会おう",
    detail: "海の近くにいる みなに E で話そう。",
    at: [3, 22],
    test: (s) => s.flags.met,
  },
  {
    title: "はじめの なかま",
    detail: "火のこぎつねを よわらせて Q で なかまにしよう。",
    at: [8, 4],
    test: (s) => !!s.companions.ember,
  },
  {
    title: "休むところを 作ろう",
    detail: "B で たき火を えらび、E で おこう。",
    test: (s) => s.buildings.some((b) => b.kind === "campfire"),
  },
  {
    title: "ほかのしまへ 行こう",
    detail: "M のちずで こおりのしまを えらぼう。ふねで 行けるよ。",
    at: [126, -18],
    test: (s) => s.visited.includes(1),
  },
  {
    title: "こおりの 大きなしか",
    detail: "しまの おくの こおりのしかを なかまにしよう。",
    at: [125, -32],
    test: (s) => !!s.companions.frost,
  },
  {
    title: "空をひらく",
    detail: "空のくらを 作り、M で あらしのしまへ 行こう。",
    at: [214, -120],
    test: (s) => s.visited.includes(2),
  },
  {
    title: "あらしの むこうへ",
    detail: "あらしのおおかみの 体力を20%までへらして Q をおそう。",
    at: [214, -129],
    test: (s) => !!s.flags.won,
  },
  {
    title: "まだまだ たびは つづく",
    detail: "M のちずで となりのしまへ。どうくつの 大きなぼすを さがそう。",
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
  if (i.id >= 3 && Math.abs(dx) < 17 && dz > -27 && dz < 20) h = 2;
  return h;
}
