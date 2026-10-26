(() => {
  const plans = {
    deer: { length: 1.4, width: 0.24, depth: 0.3, leg: 0.64, neck: 0.5, head: 0.255, muzzle: 0.22, ear: 0.21, tail: 0.22, hoof: true, horns: 'antler' },
    goat: { length: 1.25, width: 0.3, depth: 0.38, leg: 0.65, neck: 0.4, head: 0.28, muzzle: 0.2, ear: 0.19, tail: 0.19, hoof: true, horns: 'curve' },
    bovine: { length: 2.3, width: 0.58, depth: 0.68, leg: 0.85, neck: 0.34, head: 0.46, muzzle: 0.33, ear: 0.2, tail: 0.8, hoof: true, horns: 'side' },
    horse: { length: 2, width: 0.4, depth: 0.55, leg: 1.05, neck: 0.8, head: 0.38, muzzle: 0.42, ear: 0.22, tail: 0.95, hoof: true, mane: true },
    canine: { length: 1.05, width: 0.22, depth: 0.29, leg: 0.55, neck: 0.22, head: 0.23, muzzle: 0.28, ear: 0.2, tail: 0.65 },
    feline: { length: 1.45, width: 0.28, depth: 0.34, leg: 0.64, neck: 0.23, head: 0.29, muzzle: 0.15, ear: 0.12, tail: 1.05 },
    bear: { length: 1.85, width: 0.55, depth: 0.62, leg: 0.62, neck: 0.2, head: 0.38, muzzle: 0.3, ear: 0.13, tail: 0.1, plantigrade: true },
    rabbit: { length: 0.45, width: 0.13, depth: 0.17, leg: 0.19, neck: 0.1, head: 0.14, muzzle: 0.08, ear: 0.27, tail: 0.12, hop: true },
    rodent: { length: 0.5, width: 0.14, depth: 0.18, leg: 0.18, neck: 0.06, head: 0.15, muzzle: 0.13, ear: 0.09, tail: 0.45 },
    mustelid: { length: 0.85, width: 0.18, depth: 0.2, leg: 0.19, neck: 0.16, head: 0.18, muzzle: 0.14, ear: 0.07, tail: 0.5 },
    pig: { length: 1.25, width: 0.35, depth: 0.42, leg: 0.4, neck: 0.1, head: 0.28, muzzle: 0.36, ear: 0.21, tail: 0.3, hoof: true },
    elephant: { length: 3.5, width: 0.95, depth: 1.05, leg: 1.65, neck: 0.12, head: 0.7, muzzle: 0.2, ear: 0.95, tail: 1.3, trunk: true },
    rhino: { length: 2.8, width: 0.8, depth: 0.8, leg: 0.75, neck: 0.14, head: 0.58, muzzle: 0.5, ear: 0.22, tail: 0.7, noseHorn: true },
    giraffe: { length: 2.35, width: 0.42, depth: 0.56, leg: 1.85, neck: 2.1, head: 0.34, muzzle: 0.34, ear: 0.24, tail: 1.1, hoof: true, horns: 'ossicone', mane: true },
    camel: { length: 2.1, width: 0.48, depth: 0.56, leg: 1.2, neck: 1.1, head: 0.3, muzzle: 0.26, ear: 0.13, tail: 0.7, hump: true },
    bird: { length: 0.58, width: 0.18, depth: 0.2, leg: 0.17, neck: 0.12, head: 0.14, muzzle: 0.2, tail: 0.32, wingspan: 1.6, flying: true },
    wader: { length: 0.65, width: 0.19, depth: 0.23, leg: 0.85, neck: 0.75, head: 0.12, muzzle: 0.3, tail: 0.18, wingspan: 1.6 },
    duck: { length: 0.65, width: 0.22, depth: 0.24, leg: 0.18, neck: 0.3, head: 0.15, muzzle: 0.22, tail: 0.2, wingspan: 0.9 },
    reptile: { length: 1.2, width: 0.25, depth: 0.18, leg: 0.16, neck: 0.12, head: 0.22, muzzle: 0.3, tail: 1.1, splayed: true },
    tortoise: { length: 0.7, width: 0.35, depth: 0.3, leg: 0.15, neck: 0.18, head: 0.11, muzzle: 0.08, tail: 0.1, splayed: true, shell: true },
    frog: { length: 0.22, width: 0.09, depth: 0.07, leg: 0.07, neck: 0.01, head: 0.09, muzzle: 0.02, tail: 0, splayed: true, hop: true },
    insect: { length: 0.13, width: 0.018, depth: 0.018, leg: 0.02, neck: 0.01, head: 0.022, muzzle: 0.01, tail: 0, wingspan: 0.35, flying: true }
  };
  const species = [];
  const add = (id, name, plan, color, scale, habitats, details = {}) => species.push({ id, name, plan, color, scale, habitats: habitats.split(' '), ...plans[plan], ...details });
  add('deer', 'ニホンジカ', 'deer', '#a7865f', 1, 'forest meadow autumn', { pattern: 'spots' });
  add('elk', 'ヘラジカ', 'deer', '#65513c', 1.65, 'forest wetland', { neck: 0.48, muzzle: 0.4, horns: 'palm' });
  add('red-deer', 'アカシカ', 'deer', '#9e7652', 1.3, 'forest autumn');
  add('fallow-deer', 'ダマジカ', 'deer', '#b89b73', 1.1, 'meadow forest', { horns: 'palm', pattern: 'spots' });
  add('roe-deer', 'ノロジカ', 'deer', '#b2885b', 0.75, 'forest autumn', { horns: 'short' });
  add('reindeer', 'トナカイ', 'deer', '#9e9787', 1.2, 'snow alpine', { neck: 0.45 });
  add('whitetail', 'オジロジカ', 'deer', '#99816b', 1.05, 'forest meadow', { tail: 0.35, tailColor: '#ece8dd' });
  add('ibex', 'アイベックス', 'goat', '#a58e70', 1.15, 'alpine desert', { horns: 'long-curve' });
  add('goat', 'シロイワヤギ', 'goat', '#e1dfd2', 1.05, 'snow alpine', { horns: 'short', beard: true });
  add('bighorn', 'ビッグホーン', 'goat', '#9f8b73', 1.2, 'alpine desert', { horns: 'spiral' });
  add('mouflon', 'ムフロン', 'goat', '#947253', 0.95, 'alpine meadow', { horns: 'spiral' });
  add('chamois', 'シャモア', 'goat', '#927c5c', 0.85, 'alpine', { horns: 'short' });
  add('saiga', 'サイガ', 'goat', '#c2b293', 0.85, 'meadow desert', { muzzle: 0.35, horns: 'short' });
  add('gazelle', 'トムソンガゼル', 'deer', '#c4a274', 0.75, 'meadow desert', { horns: 'long-curve', neck: 0.45 });
  add('impala', 'インパラ', 'deer', '#ac7849', 0.95, 'meadow', { horns: 'long-curve' });
  add('oryx', 'オリックス', 'goat', '#c3b69d', 1.2, 'desert', { horns: 'spear', leg: 0.9 });
  add('bison', 'アメリカバイソン', 'bovine', '#64503c', 1.1, 'meadow alpine', { shoulder: 1.35, beard: true });
  add('buffalo', 'アフリカスイギュウ', 'bovine', '#55524b', 1, 'meadow wetland');
  add('yak', 'ヤク', 'bovine', '#514a41', 1, 'alpine snow', { beard: true });
  add('wildebeest', 'オグロヌー', 'bovine', '#787566', 0.85, 'meadow', { mane: true, beard: true });
  add('horse', 'モウコノウマ', 'horse', '#baa17c', 1, 'meadow desert');
  add('zebra', 'サバンナシマウマ', 'horse', '#eee8d6', 0.9, 'meadow', { pattern: 'stripes' });
  add('fox', 'アカギツネ', 'canine', '#b47743', 0.78, 'forest meadow autumn', { tailColor: '#e4dac5', ear: 0.24 });
  add('wolf', 'ハイイロオオカミ', 'canine', '#8b887c', 1.1, 'forest snow alpine', { length: 1.28, width: 0.205, depth: 0.25, leg: 0.49, neck: 0.21, head: 0.205, muzzle: 0.125, ear: 0.145, chest: '#b9b5a8' });
  add('arctic-fox', 'ホッキョクギツネ', 'canine', '#eeeae0', 0.72, 'snow', { width: 0.26, ear: 0.12 });
  add('fennec', 'フェネック', 'canine', '#ccb68c', 0.5, 'desert', { ear: 0.38 });
  add('dhole', 'ドール', 'canine', '#a36a43', 1, 'forest');
  add('coyote', 'コヨーテ', 'canine', '#aa9c80', 1.05, 'meadow desert');
  add('jackal', 'セグロジャッカル', 'canine', '#9c815d', 0.85, 'meadow desert', { pattern: 'saddle' });
  add('maned-wolf', 'タテガミオオカミ', 'canine', '#ac7145', 1.1, 'meadow', { leg: 0.88, mane: true });
  add('raccoon-dog', 'タヌキ', 'canine', '#86765c', 0.8, 'forest autumn', { leg: 0.3, pattern: 'mask' });
  add('bat-eared-fox', 'オオミミギツネ', 'canine', '#a39a83', 0.65, 'desert meadow', { ear: 0.33 });
  add('lion', 'ライオン', 'feline', '#baa17c', 1.3, 'meadow desert', { lionMane: true });
  add('tiger', 'トラ', 'feline', '#bc8e54', 1.45, 'forest', { pattern: 'stripes' });
  add('leopard', 'ヒョウ', 'feline', '#baa271', 1.05, 'forest meadow', { pattern: 'rosettes' });
  add('snow-leopard', 'ユキヒョウ', 'feline', '#c1bfb1', 1, 'snow alpine', { pattern: 'rosettes', tail: 1.35 });
  add('cheetah', 'チーター', 'feline', '#c5ad7d', 1.02, 'meadow desert', { pattern: 'spots-dark', leg: 0.8, width: 0.22, head: 0.23 });
  add('jaguar', 'ジャガー', 'feline', '#b79b67', 1.15, 'forest wetland', { pattern: 'rosettes', width: 0.36 });
  add('puma', 'ピューマ', 'feline', '#b2a087', 1.1, 'alpine forest');
  add('lynx', 'オオヤマネコ', 'feline', '#b4a18a', 0.68, 'forest snow', { tail: 0.22, ear: 0.2, pattern: 'spots-dark' });
  add('caracal', 'カラカル', 'feline', '#b28761', 0.62, 'desert', { ear: 0.23 });
  add('serval', 'サーバル', 'feline', '#c2aa77', 0.65, 'meadow wetland', { leg: 0.95, ear: 0.24, pattern: 'spots-dark' });
  add('bear', 'ヒグマ', 'bear', '#756047', 1.2, 'forest alpine', { shoulder: 1.2 });
  add('black-bear', 'アメリカクロクマ', 'bear', '#43453f', 0.95, 'forest');
  add('polar-bear', 'ホッキョクグマ', 'bear', '#e0dfd1', 1.25, 'snow', { neck: 0.4, head: 0.33 });
  add('asiatic-bear', 'ツキノワグマ', 'bear', '#434542', 0.85, 'forest autumn', { chest: '#ddd6bc' });
  add('sun-bear', 'マレーグマ', 'bear', '#49463f', 0.65, 'forest', { chest: '#bd9d6a' });
  add('panda', 'ジャイアントパンダ', 'bear', '#deded0', 0.8, 'forest', { darkLimbs: true, pattern: 'mask' });
  add('rabbit', 'ノウサギ', 'rabbit', '#a3967c', 1.15, 'meadow autumn');
  add('arctic-hare', 'ホッキョクウサギ', 'rabbit', '#e9e7dc', 1.3, 'snow', { ear: 0.2 });
  add('squirrel', 'キタリス', 'rodent', '#a47147', 0.65, 'forest autumn', { tail: 0.6, bushyTail: true });
  add('grey-squirrel', 'トウブハイイロリス', 'rodent', '#a3a395', 0.7, 'forest', { tail: 0.55, bushyTail: true });
  add('marmot', 'アルプスマーモット', 'rodent', '#9a8a6e', 1.3, 'alpine', { width: 0.2, tail: 0.18 });
  add('prairie-dog', 'オグロプレーリードッグ', 'rodent', '#b4a17f', 0.8, 'meadow', { tail: 0.15 });
  add('beaver', 'アメリカビーバー', 'rodent', '#7c654c', 1.65, 'wetland', { tail: 0.4, flatTail: true });
  add('capybara', 'カピバラ', 'rodent', '#aa9471', 2.3, 'wetland meadow', { tail: 0, head: 0.21, leg: 0.25 });
  add('porcupine', 'ヤマアラシ', 'rodent', '#8c8273', 1.3, 'forest desert', { quills: true, tail: 0.15 });
  add('hedgehog', 'ハリネズミ', 'rodent', '#9c9076', 0.5, 'forest autumn', { quills: true, tail: 0.04 });
  add('raccoon', 'アライグマ', 'mustelid', '#939182', 0.75, 'forest wetland', { pattern: 'mask', ringTail: true });
  add('badger', 'ヨーロッパアナグマ', 'mustelid', '#a2a18d', 0.95, 'forest autumn', { pattern: 'mask', width: 0.26 });
  add('otter', 'ユーラシアカワウソ', 'mustelid', '#887156', 0.85, 'wetland', { tail: 0.65 });
  add('meerkat', 'ミーアキャット', 'mustelid', '#baa983', 0.5, 'desert', { neck: 0.22, leg: 0.3 });
  add('boar', 'イノシシ', 'pig', '#817157', 1, 'forest autumn', { tusks: true });
  add('warthog', 'イボイノシシ', 'pig', '#9c9281', 1, 'meadow desert', { tusks: true, mane: true });
  add('elephant', 'アフリカゾウ', 'elephant', '#a09b8c', 1, 'meadow wetland', { tusks: true });
  add('rhino', 'シロサイ', 'rhino', '#aaa897', 1, 'meadow');
  add('giraffe', 'キリン', 'giraffe', '#d5bd84', 1, 'meadow', { pattern: 'patches' });
  add('camel', 'フタコブラクダ', 'camel', '#b7a17c', 1, 'desert');
  add('okapi', 'オカピ', 'horse', '#7a5b4c', 0.9, 'forest', { neck: 0.65, pattern: 'stripes', tail: 0.5 });
  add('tapir', 'マレーバク', 'pig', '#9d9f98', 1.2, 'forest wetland', { pattern: 'saddle', muzzle: 0.4 });
  add('red-panda', 'レッサーパンダ', 'mustelid', '#aa7147', 0.75, 'forest', { bushyTail: true, ringTail: true, tail: 0.75 });
  add('anteater', 'オオアリクイ', 'mustelid', '#8c8878', 1.7, 'meadow forest', { muzzle: 0.55, bushyTail: true, tail: 0.85 });
  add('eagle', 'イヌワシ', 'bird', '#756148', 1.25, 'alpine desert', { wingspan: 2.1 });
  add('owl', 'シロフクロウ', 'bird', '#e2e2d6', 0.95, 'snow alpine', { head: 0.22, muzzle: 0.06, pattern: 'spots-dark' });
  add('crane', 'タンチョウ', 'wader', '#e3e3db', 1.2, 'wetland', { crown: '#b35646', darkWings: true });
  add('barn-owl', 'メンフクロウ', 'bird', '#c5b28c', 0.7, 'forest autumn', { head: 0.21, muzzle: 0.05 });
  add('hawk', 'オオタカ', 'bird', '#87908a', 0.9, 'forest meadow', { pattern: 'bars' });
  add('falcon', 'ハヤブサ', 'bird', '#777e79', 0.75, 'alpine desert', { wingspan: 1.25, pattern: 'bars' });
  add('vulture', 'シロエリハゲワシ', 'bird', '#9e8b6b', 1.4, 'desert alpine', { neck: 0.25, wingspan: 2.1 });
  add('raven', 'ワタリガラス', 'bird', '#3f4949', 0.95, 'forest alpine', { muzzle: 0.24 });
  add('magpie', 'カササギ', 'bird', '#626e6a', 0.65, 'forest autumn', { tail: 0.65, chest: '#e3e1d8' });
  add('kingfisher', 'カワセミ', 'bird', '#638d99', 0.38, 'wetland', { chest: '#bc9563', muzzle: 0.33 });
  add('woodpecker', 'アカゲラ', 'bird', '#62685c', 0.45, 'forest autumn', { crown: '#b05745' });
  add('pheasant', 'キジ', 'duck', '#a18d64', 1, 'meadow autumn', { tail: 0.8, crown: '#ad5143' });
  add('peacock', 'インドクジャク', 'duck', '#5c8992', 1.4, 'forest meadow', { neck: 0.65, fanTail: true });
  add('flamingo', 'ベニイロフラミンゴ', 'wader', '#d8a29a', 1.1, 'wetland', { neck: 0.95, muzzle: 0.15 });
  add('heron', 'アオサギ', 'wader', '#a1aba8', 1, 'wetland');
  add('stork', 'コウノトリ', 'wader', '#e0e0d5', 1.15, 'wetland meadow', { darkWings: true });
  add('swan', 'オオハクチョウ', 'duck', '#e4e4da', 1.5, 'wetland', { neck: 0.85 });
  add('duck', 'マガモ', 'duck', '#9caa92', 0.85, 'wetland', { chest: '#8e735a' });
  add('goose', 'ハイイロガン', 'duck', '#acae9e', 1.1, 'wetland meadow', { neck: 0.5 });
  add('ostrich', 'ダチョウ', 'wader', '#68665b', 1.8, 'meadow desert', { leg: 0.95, neck: 0.85, depth: 0.4, width: 0.4 });
  add('crocodile', 'ナイルワニ', 'reptile', '#85907b', 1.8, 'wetland', { muzzle: 0.55, scutes: true });
  add('monitor', 'コモドオオトカゲ', 'reptile', '#8e907a', 1.35, 'desert forest');
  add('iguana', 'グリーンイグアナ', 'reptile', '#7e9a6c', 0.65, 'forest wetland', { scutes: true });
  add('tortoise', 'ゾウガメ', 'tortoise', '#888a77', 1.35, 'meadow desert');
  add('chameleon', 'エボシカメレオン', 'reptile', '#92a77b', 0.22, 'forest', { tail: 0.8, scutes: true });
  add('frog', 'アマガエル', 'frog', '#92ac6e', 1, 'wetland forest');
  add('butterfly', 'モルフォチョウ', 'insect', '#5a9fbd', 1, 'forest wetland', { butterfly: true });
  add('dragonfly', 'ギンヤンマ', 'insect', '#8eab87', 0.8, 'wetland', { wingspan: 0.25 });
  for (const spec of species) {
    const taxonomy = window.WildlifeBaseTaxonomy?.[spec.id];
    if (taxonomy) { spec.name = taxonomy.name; spec.scientificName = taxonomy.scientificName; }
  }
  for (const entry of window.WildlifeCatalog || []) add(entry.id, entry.name, entry.plan, entry.color, entry.scale, entry.habitats, { ...entry.details, scientificName: entry.scientificName });
  const skulls = {
    deer: { width: 0.49, dome: 0.48, cheek: 0.43, bridge: 0.29, nose: 0.27, noseDepth: 0.22, drop: 0.76, reach: 0.88, eye: 0.12 },
    goat: { width: 0.51, dome: 0.5, cheek: 0.44, bridge: 0.31, nose: 0.3, noseDepth: 0.24, drop: 0.8, reach: 0.83, eye: 0.12 },
    horse: { width: 0.51, dome: 0.53, cheek: 0.58, bridge: 0.32, nose: 0.34, noseDepth: 0.32, drop: 1.0, reach: 0.92, eye: 0.13 },
    bovine: { width: 0.67, dome: 0.52, cheek: 0.58, bridge: 0.43, nose: 0.44, noseDepth: 0.31, drop: 0.69, reach: 0.87, eye: 0.13 },
    giraffe: { width: 0.49, dome: 0.49, cheek: 0.44, bridge: 0.3, nose: 0.29, noseDepth: 0.25, drop: 0.55, reach: 0.91, eye: 0.17 },
    camel: { width: 0.48, dome: 0.48, cheek: 0.43, bridge: 0.29, nose: 0.31, noseDepth: 0.27, drop: 0.64, reach: 0.83, eye: 0.14 },
    canine: { width: 0.62, dome: 0.48, cheek: 0.42, bridge: 0.35, nose: 0.3, noseDepth: 0.22, drop: 0.3, reach: 0.88, eye: 0.12 },
    feline: { width: 0.68, dome: 0.55, cheek: 0.48, bridge: 0.42, nose: 0.37, noseDepth: 0.24, drop: 0.41, reach: 0.46, eye: 0.16 },
    bear: { width: 0.68, dome: 0.58, cheek: 0.54, bridge: 0.42, nose: 0.34, noseDepth: 0.29, drop: 0.43, reach: 0.7, eye: 0.2 },
    pig: { width: 0.59, dome: 0.49, cheek: 0.51, bridge: 0.38, nose: 0.33, noseDepth: 0.29, drop: 0.7, reach: 0.91, eye: 0.12 },
    rabbit: { width: 0.6, dome: 0.56, cheek: 0.44, bridge: 0.35, nose: 0.23, noseDepth: 0.19, drop: 0.47, reach: 0.5, eye: 0.15 },
    rodent: { width: 0.59, dome: 0.52, cheek: 0.44, bridge: 0.34, nose: 0.24, noseDepth: 0.2, drop: 0.43, reach: 0.65, eye: 0.17 },
    mustelid: { width: 0.58, dome: 0.48, cheek: 0.42, bridge: 0.33, nose: 0.25, noseDepth: 0.21, drop: 0.35, reach: 0.73, eye: 0.16 }
  };
  const facialShape = (spec) => {
    const shape = skulls[spec.plan];
    if (!shape) return null;
    const proportions = spec.id === 'wolf' ? { ...shape, width: 0.68, dome: 0.46, cheek: 0.49, bridge: 0.38, nose: 0.3, noseDepth: 0.24, drop: 0.12, reach: 0.78, eye: 0.1 } : shape;
    return { ...proportions, reach: spec.head * 0.94 + spec.muzzle * proportions.reach, eyeForward: spec.head * 0.49 };
  };
  const neckConfiguration = (spec) => {
    if(spec.plan==='elephant')return{rise:.12,forward:spec.length*.43,headRise:.12,headForward:.24};
    const canine = spec.plan === 'canine', giraffe = spec.plan === 'giraffe', ungulate = spec.hoof && !giraffe;
    return {
      rise: spec.depth * (giraffe ? 0.72 : canine ? 0.4 : spec.hoof ? 0.36 : 0.22),
      forward: spec.length * (giraffe ? 0.34 : canine ? 0.43 : 0.36),
      headRise: spec.neck * (canine ? 0.45 : ungulate ? 0.88 : 1),
      headForward: Math.max(spec.neck * (canine ? 0.72 : ungulate ? 0.62 : 0.38), skulls[spec.plan] ? spec.head * 0.48 + spec.length * 0.045 : 0)
    };
  };
  const cache = new Map(), materialCache = new Map();
  const furMaterialCache = new Map();
  let tuftTexture;
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  const cylinder = new THREE.CylinderGeometry(0.62, 1, 1, 10);
  const tip = new THREE.ConeGeometry(1, 1, 10);
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const activityLabels = { diurnal: '昼行性', nocturnal: '夜行性', crepuscular: '薄明薄暮性', cathemeral: '昼夜活動性' };
  const activityPlans = {
    deer: 'crepuscular', goat: 'diurnal', bovine: 'cathemeral', horse: 'cathemeral', canine: 'crepuscular', feline: 'nocturnal', bear: 'cathemeral',
    rabbit: 'crepuscular', rodent: 'diurnal', mustelid: 'crepuscular', pig: 'nocturnal', elephant: 'cathemeral', rhino: 'crepuscular', giraffe: 'cathemeral',
    camel: 'diurnal', bird: 'diurnal', wader: 'diurnal', duck: 'diurnal', reptile: 'diurnal', tortoise: 'diurnal', frog: 'nocturnal', insect: 'diurnal'
  };
  const activityGroups = {
    nocturnal: new Set(['fennec', 'raccoon-dog', 'bat-eared-fox', 'kit-fox', 'swift-fox', 'side-striped-jackal', 'sloth-bear', 'beaver', 'eurasian-beaver', 'porcupine', 'hedgehog', 'nutria', 'muskrat', 'springhare', 'raccoon', 'badger', 'pine-marten', 'sable', 'fisher', 'striped-skunk', 'binturong', 'african-civet', 'black-crowned-night-heron', 'leopard-gecko', 'tokay-gecko', 'red-eyed-tree-frog']),
    diurnal: new Set(['cheetah', 'jaguarundi', 'ethiopian-wolf', 'meerkat', 'tayra', 'white-nosed-coati', 'dwarf-mongoose', 'yellow-mongoose', 'american-pika', 'patagonian-mara', 'dyeing-poison-frog', 'golden-poison-frog']),
    crepuscular: new Set(['wolf', 'african-wild-dog', 'dhole', 'bush-dog', 'capybara', 'gila-monster']),
    cathemeral: new Set(['owl', 'burrowing-owl', 'otter', 'wolverine', 'honey-badger'])
  };
  function activity(spec, day, weather = 0) {
    const animal = spec || {}, identity = String(animal.id || '');
    let rhythm = typeof activityLabels[animal.activityRhythm] === 'string' ? animal.activityRhythm : null;
    if (!rhythm) for (const [name, entries] of Object.entries(activityGroups)) if (entries.has(identity)) { rhythm = name; break; }
    if (!rhythm && identity.includes('owl')) rhythm = 'nocturnal';
    if (!rhythm && /crocodile|alligator|caiman|gharial/.test(identity)) rhythm = 'crepuscular';
    rhythm = rhythm || activityPlans[animal.plan] || 'cathemeral';
    const phase = ((Number.isFinite(day) ? day : 0.5) % 1 + 1) % 1;
    const rain = clamp(Number.isFinite(weather) ? weather : 0, 0, 1);
    const solar = Math.sin((phase - 0.25) * Math.PI * 2), daylightPhase = clamp((solar + 0.18) / 0.46, 0, 1);
    const daylight = daylightPhase * daylightPhase * (3 - 2 * daylightPhase), twilight = Math.exp(-((solar / 0.34) ** 2));
    const levels = { diurnal: 0.1 + daylight * 0.9, nocturnal: 0.12 + (1 - daylight) * 0.88, crepuscular: 0.22 + twilight * 0.78, cathemeral: 0.58 + twilight * 0.22 };
    let level = levels[rhythm];
    if (animal.plan === 'frog') level += (1 - level) * rain * 0.26;
    else level *= 1 - rain * (animal.plan === 'insect' ? 0.84 : ['bird', 'wader', 'duck'].includes(animal.plan) ? 0.42 : ['reptile', 'tortoise'].includes(animal.plan) ? 0.28 : 0.16);
    return { level: clamp(level, 0, 1), rhythm, label: activityLabels[rhythm] };
  }
  function build(spec) {
    const positions = [], normals = [], uvs = [], colors = [], joints = [], weights = [], coatMasks = [], indices = [];
    const bones = [], boneInfo = [], limbs = [], wings = [], tail = [], ears = [], eyes = [], furZones = [];
    const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
    const avian = ['bird', 'wader', 'duck'].includes(spec.plan), insect = spec.plan === 'insect';
    const rootHeight = spec.leg + spec.depth * 0.68;
    const makeBone = (name, parent, position) => {
      const bone = new THREE.Bone(); bone.name = name; bone.position.set(...position);
      if (parent >= 0) bones[parent].add(bone);
      bones.push(bone); boneInfo.push({ name, parent, position }); return bones.length - 1;
    };
    const root = makeBone('body', -1, [0, rootHeight, 0]);
    const highShoulder = spec.plan === 'giraffe', canine = spec.plan === 'canine', face = facialShape(spec);
    const detailedEyes = Boolean(face);
    const cervical = neckConfiguration(spec);
    const neck = makeBone('neck', root, [0, cervical.rise, -cervical.forward]);
    const head = makeBone('head', neck, [0, cervical.headRise, -cervical.headForward]);
    const emit = (point, normal, uv, tint, joint, secondJoint, blend, coat) => {
      positions.push(point.x, point.y, point.z); normals.push(normal.x, normal.y, normal.z);
      uvs.push(...uv); colors.push(tint.r, tint.g, tint.b);
      joints.push(joint, secondJoint, 0, 0); weights.push(1 - blend, blend, 0, 0); coatMasks.push(coat);
    };
    const worldPoint = (joint, local) => {
      bones[root].updateMatrixWorld(true);
      return new THREE.Vector3(...local).applyMatrix4(bones[joint].matrixWorld);
    };
    const piece = (joint, shape, position, scale, color = spec.color, rotation = [0, 0, 0], coat = color === spec.color ? 1 : 0) => {
      bones[root].updateMatrixWorld(true);
      const local = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
      matrix.multiplyMatrices(bones[joint].matrixWorld, local); normalMatrix.getNormalMatrix(matrix);
      const source = shape === 'cone' ? tip : shape === 'tube' ? cylinder : sphere;
      const tint = new THREE.Color(color).convertSRGBToLinear();
      const vertexOffset = positions.length / 3;
      for (let vertex = 0; vertex < source.attributes.position.count; vertex++) {
        const point = new THREE.Vector3().fromBufferAttribute(source.attributes.position, vertex).applyMatrix4(matrix);
        const normal = new THREE.Vector3().fromBufferAttribute(source.attributes.normal, vertex).applyNormalMatrix(normalMatrix);
        emit(point, normal, [source.attributes.uv.getX(vertex), source.attributes.uv.getY(vertex)], tint, joint, joint, 0, coat);
      }
      for (let index = 0; index < source.index.count; index++) indices.push(vertexOffset + source.index.getX(index));
    };
    const node = (joint, position, width, depth, secondJoint = joint, blend = 0) => ({ point: worldPoint(joint, position), width, depth, joint, secondJoint, blend });
    const curveValue = (previous, current, next, after, ratio) => {
      const squared = ratio * ratio, cubed = squared * ratio;
      return 0.5 * ((2 * current) + (-previous + next) * ratio + (2 * previous - 5 * current + 4 * next - after) * squared + (-previous + 3 * current - 3 * next + after) * cubed);
    };
    const loft = (controls, color = spec.color, sides = 16, steps = 3, coat = 1, sculpt = null) => {
      const rings = [], tint = new THREE.Color(color).convertSRGBToLinear();
      for (let segment = 0; segment < controls.length - 1; segment++) {
        const previous = controls[Math.max(0, segment - 1)], current = controls[segment], next = controls[segment + 1], after = controls[Math.min(controls.length - 1, segment + 2)];
        for (let step = 0; step < steps; step++) {
          const ratio = step / steps, point = new THREE.Vector3();
          for (const axis of ['x', 'y', 'z']) point[axis] = curveValue(previous.point[axis], current.point[axis], next.point[axis], after.point[axis], ratio);
          const width = Math.max(0.001, curveValue(previous.width, current.width, next.width, after.width, ratio));
          const depth = Math.max(0.001, curveValue(previous.depth, current.depth, next.depth, after.depth, ratio));
          const influences = new Map();
          const addWeight = (joint, weight) => influences.set(joint, (influences.get(joint) || 0) + weight);
          addWeight(current.joint, (1 - ratio) * (1 - current.blend)); addWeight(current.secondJoint, (1 - ratio) * current.blend);
          addWeight(next.joint, ratio * (1 - next.blend)); addWeight(next.secondJoint, ratio * next.blend);
          const sorted = [...influences].sort((first, second) => second[1] - first[1]);
          const joint = sorted[0][0], secondJoint = sorted[1]?.[0] ?? joint;
          const total = sorted[0][1] + (sorted[1]?.[1] || 0), blend = (sorted[1]?.[1] || 0) / total;
          const frame = (current.frame || 0) * (1 - ratio) + (next.frame || 0) * ratio;
          const upper = (current.upper || 1) * (1 - ratio) + (next.upper || 1) * ratio;
          const lower = (current.lower || 1) * (1 - ratio) + (next.lower || 1) * ratio;
          rings.push({ point, width, depth, joint, secondJoint, blend, frame, upper, lower });
        }
      }
      rings.push(controls[controls.length - 1]);
      const vertices = rings.map((ring, ringIndex) => {
        const tangent = rings[Math.min(rings.length - 1, ringIndex + 1)].point.clone().sub(rings[Math.max(0, ringIndex - 1)].point).normalize();
        const cross = new THREE.Vector3(1, 0, 0), vertical = cross.clone().cross(tangent).normalize().lerp(new THREE.Vector3(0, 1, 0), ring.frame || 0).normalize();
        return Array.from({ length: sides + 1 }, (_, side) => {
          const angle = side / sides * Math.PI * 2, cosine = Math.cos(angle), sine = Math.sin(angle);
          const verticalShape = sine >= 0 ? ring.upper || 1 : ring.lower || 1;
          const point = ring.point.clone().addScaledVector(cross, cosine * ring.width).addScaledVector(vertical, sine * ring.depth * verticalShape);
          if (sculpt) sculpt(point);
          return { point, radial: cross.clone().multiplyScalar(cosine / ring.width).addScaledVector(vertical, sine / ring.depth).normalize(), uv: [side / sides, ringIndex / (rings.length - 1)] };
        });
      });
      const vertexOffset = positions.length / 3;
      for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) for (let side = 0; side <= sides; side++) {
          const vertex = vertices[ringIndex][side], ring = rings[ringIndex];
          const longitudinal = vertices[Math.min(rings.length - 1, ringIndex + 1)][side].point.clone().sub(vertices[Math.max(0, ringIndex - 1)][side].point);
          const around = vertices[ringIndex][(side + 1) % sides].point.clone().sub(vertices[ringIndex][(side + sides - 1) % sides].point);
          const normal = longitudinal.cross(around).normalize();
          if (normal.dot(vertex.radial) < 0) normal.negate();
          emit(vertex.point, normal, vertex.uv, tint, ring.joint, ring.secondJoint, ring.blend || 0, coat);
      }
      for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex++) for (let side = 0; side < sides; side++) {
        const first = vertexOffset + ringIndex * (sides + 1) + side, next = first + sides + 1;
        indices.push(first, next, first + 1, first + 1, next, next + 1);
      }
    };
    const link = (joint, startPoint, endPoint, radius, color, shape = 'tube') => {
      const direction = new THREE.Vector3(...endPoint).sub(new THREE.Vector3(...startPoint));
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      const euler = new THREE.Euler().setFromQuaternion(quaternion);
      piece(joint, shape, startPoint.map((value, index) => (value + endPoint[index]) / 2), [radius, direction.length(), radius], color, [euler.x, euler.y, euler.z]);
    };
    const neckWidth = spec.width * (avian ? 0.32 : spec.plan === 'giraffe' ? 0.59 : spec.plan === 'horse' ? 0.68 : 0.73);
    const shoulder = spec.shoulder || (spec.plan === 'giraffe' ? 1.15 : spec.plan === 'canine' ? 1.04 : 1);
    const headWidth = face ? face.width : highShoulder ? 0.5 : spec.hoof ? 0.59 : 0.66;
    const noseWidth = spec.head * (face ? face.nose : avian ? 0.23 : spec.plan === 'feline' ? 0.44 : spec.plan === 'pig' ? 0.5 : 0.34);
    const body = [
      node(root, [0, -spec.depth * 0.06, spec.length * 0.57], 0.006, 0.009),
      node(root, [0, spec.depth * (highShoulder ? -0.11 : 0.01), spec.length * 0.44], spec.width * 0.75, spec.depth * 0.78),
      node(root, [0, spec.depth * (highShoulder ? -0.07 : 0.02), spec.length * 0.29], spec.width * 0.98, spec.depth * (highShoulder ? 0.92 : 0.98)),
      node(root, [0, -spec.depth * 0.04, spec.length * 0.04], spec.width, spec.depth * 0.98),
      node(root, [0, spec.depth * (highShoulder ? 0.26 : 0.03), -spec.length * 0.2], spec.width * 1.03, spec.depth * shoulder),
      node(root, [0, spec.depth * (highShoulder ? 0.36 : 0.12), -spec.length * 0.38], spec.width * 0.86, spec.depth * (highShoulder ? 0.69 : 0.86), neck, 0.13),
      node(neck, [0, spec.neck * 0.12, -0.02], neckWidth * 1.15, spec.depth * (avian ? 0.57 : highShoulder ? 0.58 : 0.76), root, 0.36),
      node(neck, [0, spec.neck * 0.5, -spec.neck * 0.2], neckWidth * (highShoulder ? 0.72 : 0.84), neckWidth * (avian ? 1.03 : highShoulder ? 0.92 : 1.27), head, 0.05),
      node(head, [0, -spec.head * 0.22, spec.head * 0.26], spec.head * 0.56, spec.head * 0.58, neck, 0.24),
      node(head, [0, spec.head * 0.04, -spec.head * 0.17], spec.head * headWidth, spec.head * (highShoulder ? 0.64 : 0.77)),
      node(head, [0, -spec.head * 0.14, -spec.head * 0.65], spec.head * headWidth * 0.85, spec.head * 0.51),
      node(head, [0, -spec.head * 0.31, -spec.head * 0.98], noseWidth * 1.12, spec.head * 0.35),
      node(head, [0, -spec.head * 0.32, -spec.head - spec.muzzle * 0.65], noseWidth, spec.head * (avian ? 0.15 : 0.29)),
      node(head, [0, -spec.head * 0.3, -spec.head - spec.muzzle], avian ? 0.003 : noseWidth * 0.64, avian ? 0.003 : spec.head * 0.2),
      node(head, [0, -spec.head * 0.3, -spec.head - spec.muzzle * 1.08], 0.002, 0.002)
    ];
    if(spec.trunk){body.splice(6,body.length-6,node(head,[0,0,.28],.62,.74,neck,.2),node(head,[0,.15,-.08],.66,.79),node(head,[0,-.05,-.47],.48,.58),node(head,[0,-.32,-.64],.24,.28),node(head,[0,-.38,-.7],.10,.12));}
    if (canine) body.splice(0, body.length,
      node(root, [0, 0, spec.length * 0.57], 0.004, 0.006),
      node(root, [0, spec.depth * 0.06, spec.length * 0.43], spec.width * 0.74, spec.depth * 0.62),
      node(root, [0, spec.depth * 0.1, spec.length * 0.28], spec.width * 0.84, spec.depth * 0.74),
      node(root, [0, spec.depth * 0.14, spec.length * 0.08], spec.width * 0.79, spec.depth * 0.7),
      node(root, [0, spec.depth * 0.02, -spec.length * 0.15], spec.width, spec.depth),
      node(root, [0, spec.depth * 0.08, -spec.length * 0.32], spec.width * 0.93, spec.depth * 0.89, neck, 0.12),
      node(neck, [0, -spec.neck * 0.02, spec.neck * 0.04], spec.width * 0.8, spec.depth * 0.65, root, 0.36),
      node(neck, [0, spec.neck * 0.22, -spec.neck * 0.33], spec.width * (spec.id === 'wolf' ? 0.81 : 0.7), spec.width * (spec.id === 'wolf' ? 0.76 : 0.68), head, 0.12),
      node(head, [0, -spec.head * 0.1, spec.head * 0.25], spec.head * 0.65, spec.head * 0.58, neck, 0.24),
      node(head, [0, 0, -spec.head * 0.12], spec.head * 0.66, spec.head * 0.58),
      node(head, [0, -spec.head * 0.05, -spec.head * 0.55], spec.head * 0.57, spec.head * 0.47),
      node(head, [0, -spec.head * 0.09, -spec.head * 0.82], spec.head * 0.43, spec.head * 0.36),
      node(head, [0, -spec.head * 0.15, -spec.head - spec.muzzle * 0.5], noseWidth * 1.05, spec.head * 0.32),
      node(head, [0, -spec.head * 0.22, -spec.head - spec.muzzle], noseWidth * 0.8, spec.head * 0.24),
      node(head, [0, -spec.head * 0.24, -spec.head - spec.muzzle * 1.06], 0.002, 0.002)
    );
    if (face) {
      if (!canine && ['deer', 'goat', 'horse', 'feline'].includes(spec.plan)) {
        const feline = spec.plan === 'feline';
        body[1] = node(root, [0, spec.depth * 0.03, spec.length * 0.44], spec.width * 0.77, spec.depth * 0.73);
        body[2] = node(root, [0, spec.depth * 0.1, spec.length * 0.29], spec.width * 0.93, spec.depth * 0.84);
        body[3] = node(root, [0, spec.depth * 0.1, spec.length * 0.04], spec.width * (feline ? 0.87 : 0.92), spec.depth * (feline ? 0.79 : 0.87));
        body[4] = node(root, [0, spec.depth * 0.03, -spec.length * 0.2], spec.width, spec.depth * 0.98);
        body[5] = node(root, [0, spec.depth * 0.13, -spec.length * 0.38], spec.width * 0.82, spec.depth * 0.75, neck, 0.2);
        body[6] = node(neck, [0, spec.neck * 0.12, -0.02], neckWidth * 0.94, spec.depth * (feline ? 0.6 : 0.66), root, 0.3);
        body[7] = node(neck, [0, spec.neck * 0.51, -spec.neck * 0.22], neckWidth * 0.73, neckWidth * (feline ? 0.8 : 0.99), head, 0.08);
      }
      const skullNode = (position, width, depth, frame = 1, secondJoint = head, blend = 0) => ({ ...node(head, position, width, depth, secondJoint, blend), frame, upper: 0.94, lower: 1.08 });
      const bridgeStart = spec.head * 0.85, nasalLength = face.reach - bridgeStart;
      body.splice(8, body.length - 8,
        skullNode([0, -spec.head * 0.15, spec.head * 0.25], spec.head * face.width * 0.88, spec.head * face.dome * 0.88, 0.62, neck, 0.22),
        skullNode([0, -spec.head * 0.035, -spec.head * 0.1], spec.head * face.width, spec.head * face.dome),
        skullNode([0, -spec.head * face.drop * 0.18, -spec.head * 0.49], spec.head * face.width * 0.92, spec.head * face.cheek),
        skullNode([0, -spec.head * face.drop * 0.48, -bridgeStart], spec.head * face.bridge, spec.head * face.noseDepth * 1.3),
        skullNode([0, -spec.head * face.drop * 0.73, -bridgeStart - nasalLength * 0.48], noseWidth * 0.98, spec.head * face.noseDepth * 1.08),
        skullNode([0, -spec.head * (face.drop + (spec.hoof ? 0.02 : 0)), -face.reach - spec.head * (spec.hoof ? 0.035 : 0)], noseWidth, spec.head * face.noseDepth * (spec.hoof ? 1.07 : 1)),
        skullNode([0, -spec.head * face.drop, -face.reach - spec.head * 0.065], 0.002, 0.002)
      );
      if (!highShoulder) {
        body[6].point.z = THREE.MathUtils.lerp(body[5].point.z, body[8].point.z, 0.3);
        body[7].point.z = THREE.MathUtils.lerp(body[5].point.z, body[8].point.z, 0.7);
        for (const section of body) section.frame = 1;
      }
    }
    if (highShoulder) body.splice(8, 0, node(neck, [0, spec.neck * 0.82, -spec.neck * 0.33], neckWidth * 0.49, neckWidth * 0.59, head, 0.25));
    const faceOrigin = worldPoint(head, [0, 0, 0]);
    const sculptFace = detailedEyes ? (point) => {
      const localFace = point.clone().sub(faceOrigin), side = Math.sign(localFace.x);
      const socket = Math.exp(-(((localFace.z + face.eyeForward) / (spec.head * 0.22)) ** 2) - (((localFace.y - spec.head * face.eye) / (spec.head * 0.15)) ** 2));
      const brow = Math.exp(-(((localFace.z + face.eyeForward) / (spec.head * 0.25)) ** 2) - (((localFace.y - spec.head * (face.eye + 0.17)) / (spec.head * 0.1)) ** 2));
      const sideMask = Math.min(1, Math.abs(localFace.x) / (spec.head * 0.3));
      point.x += side * sideMask * spec.head * (brow * 0.036 - socket * 0.055);
    } : null;
    loft(body, spec.color, 28, 4, 1, sculptFace);
    furZones.push({ start: 0, end: positions.length / 3, tail: false });
    if (!avian && !insect && !spec.trunk) {
      const noseColor = ['pig', 'elephant', 'rhino'].includes(spec.plan) ? '#787265' : '#393a34';
      if (face) {
        const noseHeight = -spec.head * face.drop, rhinarium = ['horse', 'bovine', 'camel', 'giraffe', 'pig'].includes(spec.plan) ? '#' + new THREE.Color(spec.color).multiplyScalar(0.64).getHexString() : '#29302a';
        loft([
          node(head, [0, noseHeight + spec.head * 0.035, -face.reach + spec.head * 0.17], noseWidth * 0.59, spec.head * face.noseDepth * 0.5),
          node(head, [0, noseHeight + spec.head * 0.045, -face.reach + spec.head * 0.035], noseWidth * 0.66, spec.head * face.noseDepth * 0.57),
          node(head, [0, noseHeight + spec.head * 0.025, -face.reach - spec.head * 0.045], noseWidth * 0.58, spec.head * face.noseDepth * 0.5),
          node(head, [0, noseHeight + spec.head * 0.02, -face.reach - spec.head * 0.085], 0.001, 0.001)
        ], rhinarium, 16, 3, 0);
        for (const side of [-1, 1]) piece(head, 'sphere', [side * noseWidth * 0.52, noseHeight + spec.head * 0.085, -face.reach - spec.head * 0.005], [spec.head * 0.033, spec.head * 0.022, spec.head * 0.038], '#141c17', [0, side * 0.35, side * 0.22]);
        if (!spec.hoof) link(head, [0, noseHeight + spec.head * 0.02, -face.reach - spec.head * 0.08], [0, noseHeight - spec.head * 0.1, -face.reach - spec.head * 0.065], spec.head * 0.005, '#1e261f');
      } else {
        piece(head, 'sphere', [0, -spec.head * 0.26, -spec.head - spec.muzzle * 1.01], [noseWidth * 0.68, spec.head * 0.12, spec.head * 0.07], noseColor);
        for (const side of [-1, 1]) piece(head, 'sphere', [side * noseWidth * 0.6, -spec.head * 0.22, -spec.head - spec.muzzle * 0.93], [spec.head * 0.045, spec.head * 0.04, spec.head * 0.065], '#282e29');
      }
    }
    for (const side of [-1, 1]) {
      const eyeWidth = face ? face.width * 0.92 * Math.sqrt(Math.max(0.1, 1 - ((face.eye + face.drop * 0.18) / face.cheek) ** 2)) * 0.94 : headWidth * 0.83;
      const eye = makeBone(`eye${side}`, head, [side * (spec.trunk ? .54 : spec.head * eyeWidth), spec.trunk ? .06 : spec.head * (face ? face.eye : 0.2), spec.trunk ? -.32 : face ? -face.eyeForward : -spec.head * 0.58]); eyes.push(eye);
      if (detailedEyes) {
        piece(eye, 'sphere', [0, 0, 0], [spec.head * 0.056, spec.head * (canine ? 0.058 : 0.075), spec.head * 0.10], '#302d21');
        piece(eye, 'sphere', [side * spec.head * 0.042, 0, -spec.head * 0.015], [spec.head * 0.024, spec.head * (canine ? 0.039 : 0.049), spec.head * 0.057], canine ? '#947235' : spec.plan === 'feline' ? '#8d894e' : '#4b3822');
        piece(eye, 'sphere', [side * spec.head * 0.061, 0, -spec.head * 0.021], [spec.head * 0.012, spec.head * (spec.plan === 'feline' ? 0.054 : spec.hoof ? 0.025 : canine ? 0.031 : 0.041), spec.head * (spec.plan === 'feline' ? 0.016 : spec.hoof ? 0.046 : 0.032)], '#121b15');
        piece(eye, 'sphere', [side * spec.head * 0.072, spec.head * 0.025, -spec.head * 0.034], [spec.head * 0.008, spec.head * 0.01, spec.head * 0.01], '#e5e5d8');
        const eyelid = [];
        for (let segment = 0; segment <= 14; segment++) {
          const angle = segment / 14 * Math.PI * 2, radius = spec.head * (Math.sin(angle) > 0 ? 0.014 : 0.009);
          const lidHeight = Math.sin(angle) * spec.head * (canine ? 0.061 : 0.079) + (canine ? Math.cos(angle) * spec.head * 0.014 : 0);
          eyelid.push(node(eye, [side * spec.head * 0.042, lidHeight, Math.cos(angle) * spec.head * 0.106], radius, radius));
        }
        loft(eyelid, '#' + new THREE.Color(spec.color).multiplyScalar(0.62).getHexString(), 8, 2, 0.2);
      } else {
        piece(eye, 'sphere', [0, 0, 0], [spec.head * 0.11, spec.head * 0.10, spec.head * 0.145], spec.color);
        piece(eye, 'sphere', [side * spec.head * 0.05, 0, -spec.head * 0.025], [spec.head * 0.068, spec.head * 0.067, spec.head * 0.096], '#3a3325');
        piece(eye, 'sphere', [side * spec.head * 0.085, 0, -spec.head * 0.055], [spec.head * 0.043, spec.head * 0.05, spec.head * 0.048], '#171e19');
        piece(eye, 'sphere', [side * spec.head * 0.105, spec.head * 0.025, -spec.head * 0.075], [spec.head * 0.012, spec.head * 0.012, spec.head * 0.012], '#bbbdb1');
      }
      if(spec.trunk){const ear=makeBone(`ear${side}`,head,[side*.46,.15,.06]);ears.push(ear);piece(ear,'sphere',[side*.43,-.26,.06],[.62,.82,.115],spec.color,[0,side*.28,side*.18]);}
      if (spec.ear && !spec.trunk) {
        const ear = makeBone(`ear${side}`, head, [side * spec.head * (face ? face.width * 0.67 : 0.56), spec.head * (face ? face.dome * 0.48 : 0.56), spec.head * 0.1]); ears.push(ear);
        const round = ['bear', 'feline', 'rodent', 'elephant'].includes(spec.plan);
        const earVertexStart = positions.length / 3;
        loft([
          node(ear, [0, face ? -spec.ear * 0.1 : 0, 0], spec.ear * (canine ? 0.32 : 0.11), spec.ear * (canine ? 0.19 : 0.1)),
          node(ear, [side * spec.ear * (canine ? 0.14 : 0.17), spec.ear * 0.32, 0.015], spec.ear * (spec.trunk ? 0.6 : canine ? 0.34 : round ? 0.37 : 0.27), spec.ear * (canine ? 0.15 : 0.055)),
          node(ear, [side * spec.ear * (canine ? 0.2 : 0.24), spec.ear * (canine ? 0.64 : 0.7), 0.025], spec.ear * (canine ? 0.17 : round ? 0.24 : 0.16), spec.ear * (canine ? 0.09 : 0.032)),
          node(ear, [side * spec.ear * (canine ? 0.23 : 0.27), spec.ear * (canine ? 0.88 : round ? 0.86 : 1.05), 0.035], 0.001, 0.001)
        ], spec.color, 12, 2);
        if (canine) {
          const inverseEar = bones[ear].matrixWorld.clone().invert(), innerTint = new THREE.Color('#625c4e').convertSRGBToLinear();
          for (let vertex = earVertexStart; vertex < positions.length / 3; vertex++) {
            const earPoint = new THREE.Vector3(positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2]).applyMatrix4(inverseEar);
            const along = earPoint.y / spec.ear, centerX = side * earPoint.y * 0.3;
            const centerZ = along * 0.035 / 0.88, halfWidth = spec.ear * 0.25 * Math.max(0.05, 1 - along / 0.9);
            const inner = clamp((along - 0.08) * 9, 0, 1) * clamp((0.8 - along) * 8, 0, 1) * clamp(1 - Math.abs(earPoint.x - centerX) / halfWidth, 0, 1) * clamp((centerZ - earPoint.z) / (spec.ear * 0.06), 0, 1);
            for (let channel = 0; channel < 3; channel++) colors[vertex * 3 + channel] += (innerTint[['r', 'g', 'b'][channel]] - colors[vertex * 3 + channel]) * inner * 0.85;
          }
        } else piece(ear, 'sphere', [side * spec.ear * 0.17, spec.ear * 0.42, -spec.ear * 0.045], [spec.ear * 0.15, spec.ear * 0.25, spec.ear * 0.014], '#9d8d7e');
      }
      if (spec.horns) {
        const origin = [side * spec.head * (face ? face.width * 0.56 : 0.48), spec.head * (face ? face.dome * 0.72 : 0.55), 0];
        const branched = ['antler', 'palm'].includes(spec.horns);
        const long = ['long-curve', 'spear', 'antler', 'palm'].includes(spec.horns), spiral = spec.horns === 'spiral';
        const length = branched ? spec.head * (spec.horns === 'palm' ? 1.85 : 2.1) : long ? 0.85 : spec.horns === 'side' ? 0.55 : spec.horns === 'ossicone' ? 0.16 : 0.28;
        const hornRadius = spec.head * (['antler', 'palm'].includes(spec.horns) ? 0.09 : spec.horns === 'ossicone' ? 0.1 : 0.15);
        const horn = [node(head, origin, hornRadius, hornRadius * 0.94)];
        const antlerPoint = (fraction) => [origin[0] + side * length * (Math.sin(fraction * Math.PI * 0.8) * 0.23 + fraction * 0.14), origin[1] + length * (fraction * 0.93 - fraction * fraction * 0.18), origin[2] + length * (fraction * fraction * 0.35 - Math.sin(fraction * Math.PI) * 0.1)];
        for (let segment = 1; segment <= 7; segment++) {
          const fraction = segment / 7, angle = fraction * Math.PI * 1.8;
          const end = branched ? antlerPoint(fraction) : spiral ? [origin[0] + side * 0.14, origin[1] + Math.sin(angle) * 0.27, origin[2] + (1 - Math.cos(angle)) * 0.22] : [origin[0] + side * fraction * (['spear', 'ossicone'].includes(spec.horns) ? 0.05 : 0.35), origin[1] + fraction * length, origin[2] + fraction * fraction * (spec.horns === 'ossicone' ? 0.03 : 0.38)];
          const radius = hornRadius * (1 - fraction * 0.97);
          horn.push(node(head, end, radius * (spec.horns === 'palm' ? 1 + Math.sin(fraction * Math.PI) * 3.4 : 1), radius));
        }
        if (branched) for (const [branchIndex, fraction] of [0.23, 0.5, 0.72].entries()) {
          const start = antlerPoint(fraction), branchScale = 1 + side * 0.035;
          const outward = length * [0.08, 0.12, 0.21][branchIndex] * side, upward = length * [0.29, 0.34, 0.22][branchIndex] * branchScale, forward = length * [-0.37, -0.21, 0.05][branchIndex];
          const branchRadius = hornRadius * (0.62 - fraction * 0.35);
          loft([
            node(head, start, branchRadius, branchRadius),
            node(head, [start[0] + outward * 0.45, start[1] + upward * 0.45, start[2] + forward * 0.64], branchRadius * 0.56, branchRadius * 0.56),
            node(head, [start[0] + outward, start[1] + upward, start[2] + forward], 0.0008, 0.0008)
          ], '#a99a7e', 8, 3, 0);
        }
        loft(horn, '#a99a7e', 10, 2, 0);
      }
      if (spec.tusks) loft([
        node(head, [side * spec.head * 0.5, -0.12, -spec.head], spec.trunk ? 0.075 : 0.035, spec.trunk ? 0.075 : 0.035),
        node(head, [side * spec.head * 0.66, spec.trunk ? -0.25 : 0.03, -spec.head - (spec.trunk ? 0.45 : 0.14)], 0.035, 0.035),
        node(head, [side * spec.head * 0.8, spec.trunk ? -0.15 : 0.18, -spec.head - (spec.trunk ? 0.8 : 0.22)], 0.001, 0.001)
      ], '#d5ccb5', 10, 3, 0);
    }
    if (spec.crown) piece(head, 'sphere', [0, spec.head * 0.68, -spec.head * 0.25], [spec.head * 0.5, spec.head * 0.12, spec.head * 0.6], spec.crown);
    if (spec.lionMane) loft([
      node(neck, [0, -0.08, 0.13], spec.head * 0.9, spec.head * 0.8),
      node(neck, [0, spec.neck * 0.35, 0.01], spec.head * 1.35, spec.head * 1.45),
      node(neck, [0, spec.neck * 0.8, -0.1], spec.head * 1.1, spec.head * 1.1),
      node(head, [0, 0, -0.1], spec.head * 0.6, spec.head * 0.7)
    ], '#77604a', 20, 3);
    if (spec.mane) loft([
      node(neck, [0, -0.03, 0.12], 0.05, 0.07),
      node(neck, [0, spec.neck * 0.3, 0.16 - spec.neck * 0.1], 0.048, 0.15),
      node(neck, [0, spec.neck * 0.7, 0.11 - spec.neck * 0.25], 0.037, 0.14),
      node(head, [0, spec.head * 0.3, spec.head * 0.23], 0.008, 0.035)
    ], '#514c3f', 12, 3);
    if (spec.beard) piece(head, 'cone', [0, -spec.head, -spec.head * 0.25], [0.1, 0.3, 0.095], spec.color, [Math.PI, 0, 0]);
    if (spec.hump) for (const offset of [-0.25, 0.3]) piece(root, 'sphere', [0, spec.depth * 0.7, spec.length * offset], [spec.width * 0.78, spec.depth * 0.75, spec.length * 0.25]);
    if (spec.noseHorn) piece(head, 'cone', [0, spec.head * 0.35, -spec.head * 1.6], [0.14, 0.65, 0.15], '#a69f88', [-0.3, 0, 0]);
    if (spec.shell) piece(root, 'sphere', [0, spec.depth * 0.3, 0], [spec.width * 1.09, spec.depth * 1.03, spec.length * 0.55], '#666f59');
    if (spec.quills || spec.scutes) for (let index = 0; index < (spec.quills ? 38 : 14); index++) {
      const angle = index * 2.4, extent = Math.sqrt((index + 1) / 40);
      piece(root, 'cone', [spec.quills ? Math.cos(angle) * spec.width * extent : 0, spec.depth * 0.9, Math.sin(angle) * spec.length * 0.45], [0.025, spec.quills ? 0.25 : 0.12, 0.025], '#b7b49b', [0.3, 0, spec.quills ? Math.cos(angle) * 0.7 : 0]);
    }
    const legRows = insect ? [-0.22, 0.04, 0.3] : avian ? [0.12] : [-0.32, 0.32];
    for (const front of legRows) for (const side of [-1, 1]) {
      const isFront = front < 0, hind = !isFront && !avian, footRadius = spec.width * (avian || insect ? 0.1 : spec.trunk ? 0.28 : spec.hoof ? 0.2 : 0.3);
      const legLength = rootHeight - spec.depth * 0.12 - footRadius * 0.38;
      const hipSpread = avian ? 0.42 : canine || spec.plan === 'feline' ? 0.54 : ['deer', 'goat', 'horse'].includes(spec.plan) ? 0.6 : 0.72;
      const hip = makeBone(`hip${front}:${side}`, root, [side * spec.width * hipSpread, -spec.depth * 0.12, spec.length * front]);
      const splay = spec.splayed || insect ? side * spec.width * 0.7 : 0;
      const knee = makeBone(`knee${front}:${side}`, hip, [splay, -legLength * 0.42, legLength * (hind ? -0.18 : 0.2)]);
      const ankle = makeBone(`hock${front}:${side}`, knee, [0, -legLength * 0.4, legLength * (hind ? 0.27 : -0.16)]);
      const foot = makeBone(`foot${front}:${side}`, ankle, [0, -legLength * 0.18, legLength * (hind ? -0.09 : -0.04)]);
      const legColor = spec.darkLimbs || avian ? '#514f45' : spec.color;
      const slimLimbs = canine || ['deer', 'goat', 'feline'].includes(spec.plan);
      const upperRadius = spec.width * (avian || insect ? 0.13 : spec.trunk ? 0.32 : slimLimbs ? hind ? 0.35 : 0.28 : hind ? highShoulder ? 0.39 : 0.46 : 0.34);
      const jointRadius = spec.width * (avian || insect ? 0.07 : spec.trunk ? 0.26 : spec.hoof ? 0.105 : 0.16);
      const lowerRadius = spec.width * (avian || insect ? 0.045 : spec.trunk ? 0.245 : spec.hoof ? 0.073 : 0.12);
      const rootInset = face ? side * spec.width * 0.1 : 0;
      loft([
        node(hip, [-rootInset, spec.depth * (face ? 0.38 : 0.18), 0], upperRadius * 0.55, upperRadius * 0.6, root, face ? 0.9 : 0.78),
        node(hip, [-rootInset, -legLength * (face ? 0.045 : 0.09), hind ? -legLength * 0.02 : 0], upperRadius * (face ? hind ? 0.91 : 0.86 : 1), upperRadius * (hind ? face ? 1.3 : 1.4 : face ? 1.1 : 1.2), root, face ? 0.45 : 0.25),
        node(hip, [splay * 0.6 - rootInset * 0.35, -legLength * 0.25, legLength * (hind ? -0.11 : 0.12)], upperRadius * 0.65, upperRadius * 0.9, knee, 0.14),
        node(knee, [0, 0, 0], jointRadius * 1.15, jointRadius * 1.3, hip, 0.5),
        node(knee, [0, -legLength * 0.14, legLength * (hind ? 0.08 : -0.056)], lowerRadius * 1.1, lowerRadius * 1.2),
        node(ankle, [0, 0, 0], jointRadius, jointRadius * 1.15, knee, 0.48),
        node(ankle, [0, -legLength * 0.12, legLength * (hind ? -0.06 : -0.028)], lowerRadius * 0.8, lowerRadius * 0.95, foot, 0.12),
        node(foot, [0, 0, 0], footRadius * 0.8, footRadius * 0.8, ankle, 0.4)
      ], legColor, 14, 3, avian || insect ? 0 : 1);
      const toeCount = spec.hoof && spec.plan !== 'horse' ? 2 : 1;
      for (let toe = 0; toe < toeCount; toe++) {
        const toeOffset = toeCount === 2 ? (toe ? 1 : -1) * footRadius * 0.39 : 0;
        loft([
          node(foot, [toeOffset, footRadius * 0.22, footRadius * 0.55], footRadius * (toeCount === 2 ? 0.35 : 0.7), footRadius * 0.22),
          node(foot, [toeOffset, footRadius * 0.02, 0], footRadius * (toeCount === 2 ? 0.4 : 0.95), footRadius * 0.43),
          node(foot, [toeOffset, -footRadius * 0.03, -footRadius * (spec.plantigrade ? 1.7 : 1.05)], footRadius * (toeCount === 2 ? 0.35 : 0.82), footRadius * 0.32),
          node(foot, [toeOffset, -footRadius * 0.04, -footRadius * (spec.plantigrade ? 2 : 1.3)], 0.002, 0.002)
        ], spec.hoof ? '#77715f' : legColor, 12, 2, spec.hoof || avian ? 0 : 1);
      }
      if (avian) for (let toe = -1; toe <= 1; toe++) link(foot, [0, 0, 0], [toe * 0.04, -0.005, -0.13], 0.009, '#84755c');
      limbs.push({ hip, knee, ankle, foot, side, front: isFront, legLength, footRadius });
    }
    const appendTail = (length, parent = root, startPoint = [0, 0, spec.length * 0.49], trunk = false) => {
      let previous = parent;
      const nodes = [];
      for (let segment = 0; segment <= 6; segment++) {
        const joint = makeBone(`${trunk ? 'trunk' : 'tail'}${segment}`, previous, segment === 0 ? startPoint : [0, trunk ? -length / 6 * (segment > 4 ? .65 : 1) : 0, trunk ? (segment > 3 ? -.10 : -.015) : length / 6]);
        const taper = 1 - segment / 7;
        const radius = trunk ? (.22 * taper + .055) : spec.bushyTail ? 0.12 * Math.sin((0.2 + segment / 7 * 0.8) * Math.PI) + 0.025 : spec.plan === 'canine' ? 0.095 * Math.sqrt(taper) : spec.plan === 'reptile' ? spec.width * 0.55 * taper : 0.04 * taper;
        nodes.push(node(joint, [0, 0, 0], segment === 6 && !trunk ? 0.004 : radius, segment === 6 && !trunk ? 0.004 : spec.flatTail ? radius * 0.28 : radius, previous, segment === 0 ? 0.3 : 0.5));
        tail.push({ joint, trunk, segment }); previous = joint;
      }
      const tailStart = positions.length / 3;
      loft(nodes, spec.color, 16, 4);
      if(trunk)piece(previous,'sphere',[0,-.015,-.005],[.085,.075,.085],spec.color);
      if (!trunk) furZones.push({ start: tailStart, end: positions.length / 3, tail: true });
      if (spec.plan === 'giraffe' || spec.plan === 'bovine') piece(previous, 'sphere', [0, -0.02, 0.04], [0.055, 0.06, 0.13], '#51483a');
    };
    if (spec.tail) appendTail(spec.tail);
    if (spec.trunk) appendTail(1.85, head, [0, -.20, -.64], true);
    if (avian || insect) for (const side of [-1, 1]) {
      const wing = makeBone(`wing${side}`, root, [side * spec.width * 0.75, spec.depth * 0.3, -spec.length * 0.13]);
      const wrist = makeBone(`wrist${side}`, wing, [side * spec.wingspan * 0.27, 0, spec.length * 0.12]);
      piece(wing, 'sphere', [side * spec.wingspan * 0.15, 0, 0.04], [spec.wingspan * 0.27, insect ? 0.004 : 0.034, spec.length * (spec.butterfly ? 1.1 : 0.4)], spec.darkWings ? '#50564d' : spec.color);
      for (let feather = 0; feather < (insect ? 2 : 10); feather++) piece(wrist, 'sphere', [side * spec.wingspan * (0.08 + feather * 0.011), 0, -spec.length * 0.12 + feather * spec.length * 0.05], [spec.wingspan * (0.17 - feather * 0.008), insect ? 0.003 : 0.009, spec.length * (insect ? 0.2 : 0.065)], spec.darkWings ? '#444b46' : spec.color, [0, side * feather * 0.09, 0]);
      wings.push({ wing, wrist, side });
    }
    if (spec.fanTail) for (let feather = 0; feather < 15; feather++) piece(root, 'sphere', [Math.sin(feather / 14 * Math.PI - Math.PI / 2) * 0.6, 0.4 + Math.cos(feather / 14 * Math.PI - Math.PI / 2) * 0.6, 0.7], [0.08, 0.55, 0.02], feather % 2 ? '#718e6d' : '#74959a', [0, 0, -(feather / 14 * Math.PI - Math.PI / 2)]);
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(joints, 4)); geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    geometry.setAttribute('coatMask', new THREE.Float32BufferAttribute(coatMasks, 1)); geometry.computeBoundingSphere();
    let furGeometry = null;
    const furPlans = ['canine', 'feline', 'bear', 'rabbit', 'rodent', 'mustelid', 'goat', 'bovine'];
    if (furPlans.includes(spec.plan)) {
      const furPositions = [], furNormals = [], furUvs = [], furColors = [], furJoints = [], furWeights = [], furIndices = [], furCoats = [];
      const cardLimit = canine || spec.plan === 'bear' ? 180 : 115;
      const regionCounts = { cheek: 0, neck: 0, shoulder: 0, tail: 0 };
      const regionLimits = { cheek: Math.floor((cardLimit - 40) * 0.34), neck: Math.floor((cardLimit - 40) * 0.38), shoulder: Math.ceil((cardLimit - 40) * 0.28), tail: 40 };
      let cardCount = 0;
      for (const zone of furZones) for (let vertex = zone.start; vertex < zone.end && cardCount < cardLimit; vertex++) {
        if (!zone.tail && cardCount >= cardLimit - 40) break;
        const point = new THREE.Vector3(positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2]);
        const normal = new THREE.Vector3(normals[vertex * 3], normals[vertex * 3 + 1], normals[vertex * 3 + 2]);
        const relativeFace = point.clone().sub(faceOrigin), seed = Math.sin(vertex * 127.1 + spec.length * 91.3) * 43758.5453, random = seed - Math.floor(seed);
        const cheek = relativeFace.z > -spec.head * 0.4 && relativeFace.z < spec.head * 0.6 && relativeFace.y > -spec.head * 0.7;
        const neckCoat = point.z < -spec.length * 0.25 && point.z > faceOrigin.z + spec.head * 0.2;
        const shoulderCoat = point.z > -spec.length * 0.35 && point.z < spec.length * 0.05 && point.y > rootHeight;
        if (!zone.tail && !cheek && !neckCoat && !shoulderCoat) continue;
        const region = zone.tail ? 'tail' : cheek ? 'cheek' : neckCoat ? 'neck' : 'shoulder';
        if (regionCounts[region] >= regionLimits[region]) continue;
        if (random > (zone.tail ? 0.56 : cheek ? 0.72 : 0.33)) continue;
        if (normal.lengthSq() < 0.1) continue;
        const length = spec.width * (spec.plan === 'feline' ? 0.07 : cheek ? 0.12 : zone.tail ? 0.19 : 0.15) * (0.65 + random * 0.65);
        const flow = zone.tail ? new THREE.Vector3(0, -0.15, 1) : cheek ? new THREE.Vector3(Math.sign(point.x) * 0.28, -0.4, 0.8) : new THREE.Vector3(0, -0.35, 1);
        flow.addScaledVector(normal, -flow.dot(normal)).normalize();
        const direction = flow.clone().multiplyScalar(0.92).addScaledVector(normal, 0.4).normalize();
        const width = direction.clone().cross(normal).normalize().multiplyScalar(length * 0.25);
        const base = point.clone().addScaledVector(normal, -length * 0.24), end = base.clone().addScaledVector(direction, length);
        const corners = [base.clone().sub(width), base.clone().add(width), end.clone().sub(width), end.clone().add(width)];
        const offset = furPositions.length / 3;
        for (let corner = 0; corner < 4; corner++) {
          furPositions.push(corners[corner].x, corners[corner].y, corners[corner].z); furNormals.push(normal.x, normal.y, normal.z);
          furUvs.push(corner % 2, corner > 1 ? 1 : 0);
          furColors.push(colors[vertex * 3], colors[vertex * 3 + 1], colors[vertex * 3 + 2]);
          for (let influence = 0; influence < 4; influence++) { furJoints.push(joints[vertex * 4 + influence]); furWeights.push(weights[vertex * 4 + influence]); }
          furCoats.push(1);
        }
        furIndices.push(offset, offset + 1, offset + 2, offset + 2, offset + 1, offset + 3); cardCount++; regionCounts[region]++;
      }
      furGeometry = new THREE.BufferGeometry(); furGeometry.setIndex(furIndices);
      furGeometry.setAttribute('position', new THREE.Float32BufferAttribute(furPositions, 3)); furGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(furNormals, 3));
      furGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(furUvs, 2)); furGeometry.setAttribute('color', new THREE.Float32BufferAttribute(furColors, 3));
      furGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(furJoints, 4)); furGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(furWeights, 4));
      furGeometry.setAttribute('coatMask', new THREE.Float32BufferAttribute(furCoats, 1)); furGeometry.computeBoundingSphere();
    }
    return { geometry, furGeometry, boneInfo, limbs, wings, tail, ears, eyes, root, neck, head, avian };
  }
  function material(spec, fur) {
    const key = spec.id;
    if (materialCache.has(key)) return materialCache.get(key);
    const bare = ['reptile', 'tortoise', 'frog', 'insect', 'elephant', 'rhino'].includes(spec.plan), face = facialShape(spec), cervical = neckConfiguration(spec);
    const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: bare ? 0.76 : 0.91, skinning: true, bumpMap: fur, bumpScale: bare ? 0.003 : 0.0022 });
    surface.onBeforeCompile = (shader) => {
      shader.uniforms.furDetail = { value: fur };
      shader.uniforms.coatSize = { value: new THREE.Vector3(spec.width, spec.depth, spec.length) };
      shader.uniforms.coatHeight = { value: spec.leg + spec.depth * 0.68 };
      shader.uniforms.chestTint = { value: new THREE.Color(spec.chest || spec.color).convertSRGBToLinear() };
      shader.uniforms.chestMark = { value: spec.chest ? 1 : 0 };
      shader.uniforms.tailTint = { value: new THREE.Color(spec.tailColor || spec.color).convertSRGBToLinear() };
      shader.uniforms.tailMarks = { value: new THREE.Vector3(spec.tailColor ? 1 : 0, spec.ringTail ? 1 : 0, spec.tail || 0.01) };
      shader.uniforms.backShade = { value: spec.id === 'wolf' ? 0.46 : spec.plan === 'canine' && spec.id !== 'arctic-fox' ? 0.27 : 0 };
      shader.uniforms.faceMark = { value: spec.id === 'wolf' ? 1 : face ? 0.36 : 0 };
      shader.uniforms.facePale = { value: new THREE.Color(spec.chest || spec.color).lerp(new THREE.Color('#cec4ae'), spec.chest ? 0 : 0.25).convertSRGBToLinear() };
      shader.uniforms.faceOrigin = { value: new THREE.Vector3(0, spec.leg + spec.depth * 0.68 + cervical.rise + cervical.headRise, -cervical.forward - cervical.headForward) };
      shader.uniforms.faceSize = { value: new THREE.Vector3(spec.head, face ? face.reach : spec.head + spec.muzzle, face ? 1 : 0) };
      shader.uniforms.faceForm = { value: new THREE.Vector4(face ? face.drop : 0.3, face ? face.noseDepth : 0.2, face ? face.eye : 0.2, face ? face.eyeForward / spec.head : 0.58) };
      shader.vertexShader = 'attribute float coatMask; varying float vCoat; varying vec3 vAnimal;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvAnimal = position; vCoat = coatMask;');
      shader.fragmentShader = `varying vec3 vAnimal; varying float vCoat; uniform sampler2D furDetail; uniform vec3 coatSize; uniform float coatHeight; uniform vec3 chestTint; uniform float chestMark; uniform vec3 tailTint; uniform vec3 tailMarks; uniform float backShade; uniform float faceMark; uniform vec3 facePale; uniform vec3 faceOrigin; uniform vec3 faceSize; uniform vec4 faceForm;
        vec2 coatHash(vec2 point) {
          return fract(sin(vec2(dot(point, vec2(127.1, 311.7)), dot(point, vec2(269.5, 183.3)))) * 43758.5453);
        }
        vec2 animalCells(vec2 point) {
          vec2 cell = floor(point); vec2 local = fract(point); float nearest = 10.0; float second = 10.0;
          for (int row = -1; row <= 1; row++) for (int column = -1; column <= 1; column++) {
            vec2 offset = vec2(float(column), float(row)); vec2 jitter = coatHash(cell + offset);
            float distance = length(offset + 0.12 + jitter * 0.76 - local);
            if (distance < nearest) { second = nearest; nearest = distance; } else second = min(second, distance);
          }
          return vec2(nearest, second - nearest);
        }
        float animalHash(vec3 point) {
          return fract(sin(dot(point, vec3(127.1, 311.7, 74.7))) * 43758.5453);
        }
        float animalNoise(vec3 point) {
          vec3 cell = floor(point); vec3 local = fract(point); local = local * local * (3.0 - 2.0 * local);
          float lower = mix(mix(animalHash(cell), animalHash(cell + vec3(1.0, 0.0, 0.0)), local.x), mix(animalHash(cell + vec3(0.0, 1.0, 0.0)), animalHash(cell + vec3(1.0, 1.0, 0.0)), local.x), local.y);
          float upper = mix(mix(animalHash(cell + vec3(0.0, 0.0, 1.0)), animalHash(cell + vec3(1.0, 0.0, 1.0)), local.x), mix(animalHash(cell + vec3(0.0, 1.0, 1.0)), animalHash(cell + vec3(1.0, 1.0, 1.0)), local.x), local.y);
          return mix(lower, upper, local.z);
        }
      ` + shader.fragmentShader;
      const pattern = spec.pattern || 'plain';
      const marking = {
        stripes: 'smoothstep(0.18, 0.45, sin(vAnimal.z * 27.0 + sin(vAnimal.y * 13.0) * 1.25 + sin(vAnimal.z * 6.0 + vAnimal.y * 3.0)))',
        bars: 'smoothstep(0.45, 0.7, sin(vAnimal.z * 48.0 + sin(vAnimal.x * 16.0)))',
        'spots-dark': '1.0 - smoothstep(0.17, 0.23, cells.x)',
        rosettes: 'smoothstep(0.14, 0.21, cells.x) * (1.0 - smoothstep(0.28, 0.36, cells.x))',
        patches: 'smoothstep(0.025, 0.063, cells.y + sin(vAnimal.z * 63.0 + sin(vAnimal.y * 71.0)) * 0.008) * smoothstep(0.25, 0.65, vAnimal.y)',
        saddle: 'smoothstep(0.18, 0.7, relative.y) * (1.0 - smoothstep(0.24, 0.48, abs(relative.z)))',
        mask: 'smoothstep(0.37, 0.55, -relative.z) * (0.5 + 0.5 * sin(vAnimal.x * 24.0))',
        spots: '(1.0 - smoothstep(0.10, 0.15, cells.x)) * (1.0 - smoothstep(0.38, 0.54, abs(relative.z))) * smoothstep(-0.3, 0.15, relative.y)'
      }[pattern] || '0.0';
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        vec3 relative = vec3(vAnimal.x / coatSize.x, (vAnimal.y - coatHeight) / coatSize.y, vAnimal.z / coatSize.z);
        vec2 cells = animalCells(vAnimal.zy * ${pattern === 'patches' ? '3.35' : '8.0'} + vec2(sin(vAnimal.y * 9.3 + sin(vAnimal.z * 7.3)) * 0.18, sin(vAnimal.z * 10.0 + sin(vAnimal.y * 6.0)) * 0.17));
        vec3 facePoint = vAnimal - faceOrigin;
        float facialCoat = (1.0 - smoothstep(-0.03, 0.12, facePoint.z)) * faceSize.z;
        vec2 furFlow = mix(vAnimal.zy * vec2(5.0, 7.0), vec2(facePoint.z + facePoint.y * 0.6, facePoint.y - facePoint.z * 0.35) * vec2(7.0, 10.0), facialCoat);
        float furLight = dot(texture2D(furDetail, ${bare ? 'vAnimal.zy * 2.0' : 'furFlow'}).rgb, vec3(0.299, 0.587, 0.114));
        float fibres = sin((vAnimal.y - vAnimal.z * 0.16) * 1500.0 + sin(vAnimal.z * 127.0) * 2.0) * 0.018;
        float underside = 1.0 - smoothstep(-0.85, -0.25, relative.y);
        vec3 coat = diffuseColor.rgb * (0.89 + furLight * 0.22 + fibres);
        coat *= 1.0 + underside * ${bare ? '0.03' : '0.12'};
        float dorsal = smoothstep(-0.05, 0.78, relative.y + (furLight - 0.5) * 0.3) * (1.0 - smoothstep(0.5, 1.1, abs(relative.z)));
        coat *= 1.0 - dorsal * backShade;
        float marking = ${marking};
        coat = mix(coat, ${pattern === 'patches' ? 'vec3(0.29, 0.105, 0.032) * (0.92 + furLight * 0.18)' : `coat * ${pattern === 'spots' ? '1.65' : '0.19'}`}, marking * ${pattern === 'patches' ? '0.94' : '0.83'});
        ${pattern === 'painted' ? `
          float painted = animalNoise(vAnimal * vec3(4.3, 5.1, 4.8) + vec3(2.7, 9.1, 4.3)) * 0.67 + animalNoise(vAnimal * vec3(9.1, 10.8, 10.2) + vec3(11.7, 2.4, 6.8)) * 0.33;
          coat = mix(vec3(0.39, 0.225, 0.087), vec3(0.035, 0.028, 0.02), smoothstep(0.4, 0.46, painted));
          coat = mix(coat, vec3(0.68, 0.65, 0.53), smoothstep(0.61, 0.67, painted));
          coat *= 0.91 + furLight * 0.18;
        ` : ''}
        float chest = (1.0 - smoothstep(-0.32, -0.04, relative.z)) * (1.0 - smoothstep(0.04, 0.55, relative.y)) * smoothstep(-1.1, -0.82, relative.y);
        coat = mix(coat, chestTint * (0.9 + furLight * 0.2), chest * chestMark);
        float alongTail = (vAnimal.z - coatSize.z * 0.49) / max(0.01, tailMarks.z);
        coat = mix(coat, tailTint * (0.9 + furLight * 0.2), smoothstep(0.61, 0.78, alongTail) * tailMarks.x);
        coat *= 1.0 - smoothstep(0.05, 0.18, alongTail) * smoothstep(0.05, 0.4, sin(alongTail * 37.7)) * tailMarks.y * 0.58;
        float muzzleProgress = clamp((-facePoint.z - faceSize.x * 0.75) / max(0.01, faceSize.y - faceSize.x * 0.75), 0.0, 1.0);
        vec3 headPoint = facePoint / max(faceSize.x, 0.001);
        float facialRegion = (1.0 - smoothstep(0.05, 0.42, headPoint.z)) * faceMark;
        float bridge = exp(-pow(abs(headPoint.x) / 0.38, 2.0)) * smoothstep(-0.06, 0.3, headPoint.y + faceForm.x * muzzleProgress * 0.5);
        float cheek = exp(-pow(abs(headPoint.z + 0.45) / 0.65, 2.0) - pow(abs(headPoint.y + faceForm.x * 0.45 + 0.12) / 0.28, 2.0)) * smoothstep(0.22, 0.45, abs(headPoint.x));
        float jawLine = headPoint.y + faceForm.x * mix(0.4, 1.0, muzzleProgress);
        float jaw = (1.0 - smoothstep(-0.22, 0.04, jawLine)) * (1.0 - smoothstep(-0.12, 0.2, headPoint.z));
        coat = mix(coat, facePale * (0.82 + furLight * 0.14), facialRegion * max(cheek * 0.48, jaw * 0.62));
        float eyeMark = exp(-pow(abs(headPoint.z + faceForm.w) / 0.25, 2.0) - pow(abs(headPoint.y - faceForm.z) / 0.14, 2.0)) * smoothstep(0.25, 0.44, abs(headPoint.x));
        coat *= 1.0 - facialRegion * (bridge * 0.23 + eyeMark * 0.25);
        ${pattern === 'painted' ? 'coat = mix(coat, vec3(0.035, 0.028, 0.02) * (0.9 + furLight * 0.18), (1.0 - smoothstep(-0.65, -0.23, headPoint.z)) * faceSize.z * 0.88);' : ''}
        float lipHeight = -faceSize.x * (faceForm.x * mix(0.43, 1.0, muzzleProgress) + faceForm.y * 0.26);
        float mouth = (1.0 - smoothstep(faceSize.x * 0.007, faceSize.x * 0.018, abs(facePoint.y - lipHeight))) * smoothstep(faceSize.x * 0.16, faceSize.x * 0.25, abs(facePoint.x));
        mouth *= smoothstep(0.04, 0.17, muzzleProgress) * (1.0 - smoothstep(0.75, 0.92, muzzleProgress)) * faceSize.z;
        coat = mix(coat, coat * 0.22, mouth * 0.88);
        diffuseColor.rgb = mix(diffuseColor.rgb, coat, vCoat);
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.36, roughnessFactor, vCoat);');
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', 'vec3 untexturedNormal = normal;\n#include <normal_fragment_maps>\nfloat facialBump = (1.0 - smoothstep(-faceSize.x * 0.1, faceSize.x * 0.55, (vAnimal - faceOrigin).z)) * faceSize.z;\nnormal = normalize(mix(untexturedNormal, normal, vCoat * mix(1.0, 0.18, facialBump)));');
    };
    surface.customProgramCacheKey = () => `${spec.pattern || 'plain'}:${bare}:anatomical-coat-v3`;
    materialCache.set(key, surface); return surface;
  }
  function create(spec, fur) {
    if (!cache.has(spec.id)) cache.set(spec.id, build(spec));
    const template = cache.get(spec.id);
    const bones = template.boneInfo.map((info) => { const bone = new THREE.Bone(); bone.name = info.name; bone.position.set(...info.position); return bone; });
    template.boneInfo.forEach((info, index) => { if (info.parent >= 0) bones[info.parent].add(bones[index]); });
    const model = new THREE.SkinnedMesh(template.geometry, material(spec, fur));
    model.add(bones[0]); model.bind(new THREE.Skeleton(bones));
    let furModel = null;
    if (template.furGeometry) {
      if (!tuftTexture) {
        tuftTexture = new THREE.TextureLoader().load('assets/originals/fur-tuft.png');
        tuftTexture.encoding = THREE.sRGBEncoding; tuftTexture.anisotropy = 2;
      }
      if (!furMaterialCache.has(spec.id)) {
        const skin = material(spec, fur), coat = skin.clone();
        coat.map = tuftTexture; coat.bumpMap = null; coat.alphaTest = 0.24; coat.side = THREE.DoubleSide; coat.roughness = 0.96;
        coat.onBeforeCompile = (shader) => {
          skin.onBeforeCompile(shader);
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', 'vec4 strandSample = texture2D(map, vUv);\nfloat furEdge = 1.0 - smoothstep(0.18, 0.48, abs(dot(normalize(vNormal), normalize(vViewPosition))));\ndiffuseColor.rgb *= 0.72 + dot(strandSample.rgb, vec3(0.299, 0.587, 0.114)) * 0.22;\ndiffuseColor.a *= strandSample.a * furEdge * (1.0 - smoothstep(20.0, 32.0, length(vViewPosition)));');
          shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\ndiffuseColor.a = 1.0;');
        };
        coat.customProgramCacheKey = () => skin.customProgramCacheKey() + ':fur-fringe-v1';
        furMaterialCache.set(spec.id, coat);
      }
      furModel = new THREE.SkinnedMesh(template.furGeometry, furMaterialCache.get(spec.id));
      model.add(furModel); furModel.bind(new THREE.Skeleton(bones, model.skeleton.boneInverses), model.bindMatrix);
      furModel.frustumCulled = false; furModel.castShadow = false; furModel.receiveShadow = true;
    }
    model.scale.setScalar(spec.scale);
    model.frustumCulled = false; model.castShadow = true; model.receiveShadow = true;
    return { model, furModel, bones, template, spec, focusHeight: (spec.leg + spec.depth) * spec.scale, flying: spec.flying || false };
  }
  function animate(rig, time, speed, alert, groundPitch = 0) {
    const { spec, bones, template } = rig;
    const requestedRest = alert ? 0 : clamp(Number.isFinite(rig.restAmount) ? rig.restAmount : 0, 0, 1);
    const resting = requestedRest * requestedRest * (3 - 2 * requestedRest), calm = 1 - resting * 0.85;
    const requestedFlight = spec.flying ? clamp(Number.isFinite(rig.flightActivity) ? rig.flightActivity : 1, 0, 1) : 0;
    const flight = requestedFlight * requestedFlight * (3 - 2 * requestedFlight);
    if (rig.furModel) rig.furModel.visible = rig.detailDistance === undefined || rig.detailDistance < 32;
    const strideLength = Math.max(0.12, spec.leg * spec.scale * (spec.hop ? 2.1 : alert ? 1.25 : 1));
    const distance = rig.travelled === undefined ? time * (spec.plan === 'elephant' ? 0.65 : spec.plan === 'insect' ? 0.12 : 0.72) * Math.sqrt(spec.scale) : rig.travelled;
    const cycle = distance / strideLength, moving = clamp(speed, 0, 1), graze = !spec.flying && !alert && speed < 0.1;
    const body = bones[template.root], breathing = Math.sin(time * (spec.plan === 'elephant' ? 0.8 : 1.3)) * spec.depth * 0.009 * (1 - resting * 0.45);
    const bob = spec.hop ? Math.pow(Math.max(0, Math.sin(cycle * Math.PI * 2)), 1.5) * spec.leg * 0.36 : Math.cos(cycle * Math.PI * 4) * spec.leg * 0.009;
    const slopeCrouch = Math.abs(Math.sin(groundPitch)) * spec.leg * 0.32;
    body.position.y = template.boneInfo[0].position[1] + breathing + bob * moving - slopeCrouch;
    body.rotation.x = groundPitch + Math.sin(cycle * Math.PI * 2) * moving * (spec.hop ? 0.07 : 0.008);
    body.rotation.z = Math.sin(cycle * Math.PI * 2) * moving * (spec.plan === 'elephant' ? 0.014 : 0.008);
    body.scale.x = 1 + Math.sin(time * 1.3) * 0.008 * (1 - resting * 0.5);
    const grazingDepth = spec.plan === 'giraffe' ? 0.65 : ['deer', 'goat', 'horse', 'bovine'].includes(spec.plan) ? 1.45 : 0.36;
    bones[template.neck].rotation.x = graze ? -grazingDepth + Math.sin(time * 0.65) * 0.07 : alert * 0.12 + Math.sin(cycle * Math.PI * 2 - 0.5) * moving * 0.022;
    bones[template.neck].rotation.y = Math.sin(time * 0.29) * (alert ? 0.12 : 0.025);
    bones[template.head].rotation.y = Math.sin(time * 0.43) * (graze ? 0.045 : 0.09);
    bones[template.head].rotation.x = graze ? 0.12 + Math.sin(time * 2.7) * 0.018 : -bones[template.neck].rotation.x * 0.22;
    if (resting > 0) {
      bones[template.neck].rotation.x = THREE.MathUtils.lerp(bones[template.neck].rotation.x, template.avian ? -0.12 : -0.18, resting);
      bones[template.neck].rotation.y *= calm;
      bones[template.head].rotation.x = THREE.MathUtils.lerp(bones[template.head].rotation.x, template.avian ? 0.24 : 0.08, resting);
      bones[template.head].rotation.y *= calm;
    }
    const lateral = ['giraffe', 'camel'].includes(spec.plan), duty = alert ? 0.54 : spec.plan === 'elephant' ? 0.74 : 0.66;
    const inverseBody = body.quaternion.clone().invert(), targetFoot = new THREE.Vector3(), ankleOffset = new THREE.Vector3();
    for (const limb of template.limbs) {
      if (spec.flying && template.avian && flight === 1) {
        bones[limb.hip].rotation.x = -1.12; bones[limb.knee].rotation.x = 2.05;
        bones[limb.ankle].rotation.x = -0.65; bones[limb.foot].rotation.x = -0.25;
        bones[limb.ankle].rotation.z = 0;
        continue;
      }
      const trot = alert && ['deer', 'goat', 'horse', 'canine', 'feline'].includes(spec.plan);
      const phaseOffset = spec.hop ? limb.front ? 0.42 : 0 : lateral ? (limb.side > 0 ? 0.5 : 0) + (limb.front ? 0.12 : 0) : (limb.side > 0 ? 0.5 : 0) + (limb.front ? trot ? 0.5 : 0.25 : 0);
      const phase = ((cycle + phaseOffset) % 1 + 1) % 1, grounded = phase < duty;
      const progression = grounded ? phase / duty : (phase - duty) / (1 - duty);
      const excursion = strideLength / spec.scale * duty * 0.5 * moving;
      const forward = grounded ? -excursion + progression * excursion * 2 : excursion * Math.cos(progression * Math.PI);
      const lift = grounded ? 0 : Math.sin(progression * Math.PI) * spec.leg * (spec.hop ? 0.27 : spec.hoof ? 0.105 : 0.16) * moving;
      const upper = template.boneInfo[limb.knee].position, lower = template.boneInfo[limb.ankle].position, final = template.boneInfo[limb.foot].position;
      const hipPosition = template.boneInfo[limb.hip].position;
      const footZ = hipPosition[2] + forward;
      const footX = hipPosition[0] + upper[0];
      const heightLimit = Math.max(spec.leg * 0.7, spec.length * 0.45);
      const ground = rig.groundAt ? clamp(rig.groundAt(footX, footZ), -heightLimit, heightLimit) : 0;
      targetFoot.set(footX, ground + limb.footRadius * 0.38 + lift, footZ).sub(body.position).applyQuaternion(inverseBody).divide(body.scale);
      ankleOffset.set(...final).applyQuaternion(inverseBody).divide(body.scale);
      const footVertical = targetFoot.y - hipPosition[1] - ankleOffset.y;
      const footForward = targetFoot.z - hipPosition[2] - ankleOffset.z;
      const upperLength = Math.hypot(upper[1], upper[2]), lowerLength = Math.hypot(lower[1], lower[2]);
      const restUpper = Math.atan2(-upper[2], -upper[1]), restLower = Math.atan2(-lower[2], -lower[1]);
      const cosine = clamp((footVertical * footVertical + footForward * footForward - upperLength * upperLength - lowerLength * lowerLength) / (2 * upperLength * lowerLength), -0.97, 0.9995);
      const bend = Math.acos(cosine) * (limb.front ? 1 : -1);
      const hip = Math.atan2(-footForward, -footVertical) - Math.atan2(lowerLength * Math.sin(bend), upperLength + lowerLength * Math.cos(bend));
      const hipRotation = hip - restUpper, kneeRotation = bend - (restLower - restUpper);
      bones[limb.hip].rotation.x = hipRotation; bones[limb.knee].rotation.x = kneeRotation;
      bones[limb.ankle].rotation.x = -hipRotation - kneeRotation - body.rotation.x;
      bones[limb.ankle].rotation.z = -body.rotation.z;
      bones[limb.foot].rotation.x = grounded ? groundPitch : Math.sin(progression * Math.PI) * 0.12;
      if (spec.flying && template.avian && flight > 0) {
        bones[limb.hip].rotation.x = THREE.MathUtils.lerp(bones[limb.hip].rotation.x, -1.12, flight);
        bones[limb.knee].rotation.x = THREE.MathUtils.lerp(bones[limb.knee].rotation.x, 2.05, flight);
        bones[limb.ankle].rotation.x = THREE.MathUtils.lerp(bones[limb.ankle].rotation.x, -0.65, flight);
        bones[limb.ankle].rotation.z *= 1 - flight;
        bones[limb.foot].rotation.x = THREE.MathUtils.lerp(bones[limb.foot].rotation.x, -0.25, flight);
      }
    }
    for (const wing of template.wings) {
      const frequency = spec.plan === 'insect' ? 28 : 4.1 / Math.sqrt(spec.scale), glide = spec.plan === 'bird' && Math.sin(time * 0.23) > 0.42;
      const flap = Math.sin(time * frequency);
      bones[wing.wing].rotation.x = 0;
      bones[wing.wing].rotation.z = wing.side * (spec.flying ? glide ? -0.08 : flap * 0.46 : 1.18);
      bones[wing.wrist].rotation.z = wing.side * (spec.flying ? glide ? 0.06 : Math.sin(time * frequency - 0.72) * 0.27 : 1.12);
      bones[wing.wing].rotation.y = spec.flying ? wing.side * Math.cos(time * frequency) * 0.07 : 0;
      if (template.avian && flight < 1) {
        const foldPitch = 1.5 - clamp(spec.length / (spec.leg + spec.depth) - 1.6, 0, 0.8) * 0.25;
        bones[wing.wing].rotation.x = foldPitch * (1 - flight);
        bones[wing.wing].rotation.y = THREE.MathUtils.lerp(wing.side * 0.1, bones[wing.wing].rotation.y, flight);
        bones[wing.wing].rotation.z = THREE.MathUtils.lerp(wing.side * 1.48, bones[wing.wing].rotation.z, flight);
        bones[wing.wrist].rotation.z = THREE.MathUtils.lerp(wing.side * 0.18, bones[wing.wrist].rotation.z, flight);
      } else if (spec.flying && flight < 1) {
        bones[wing.wing].rotation.z = THREE.MathUtils.lerp(wing.side * 1.18, bones[wing.wing].rotation.z, flight);
        bones[wing.wrist].rotation.z = THREE.MathUtils.lerp(wing.side * 1.12, bones[wing.wrist].rotation.z, flight);
        bones[wing.wing].rotation.y *= flight;
      }
    }
    for (const part of template.tail) {
      bones[part.joint].rotation.y = Math.sin(time * (alert ? 2.2 : 0.95) - part.segment * 0.42) * (part.trunk ? 0.065 : 0.075);
      bones[part.joint].rotation.x = part.trunk ? 0.025 + Math.sin(time * 0.5) * 0.035 : spec.bushyTail ? -0.23 : spec.plan === 'feline' ? 0.025 : spec.plan === 'reptile' ? 0 : 0.15;
      bones[part.joint].rotation.y *= calm;
      if (part.trunk && resting > 0) bones[part.joint].rotation.x = 0.025 + (bones[part.joint].rotation.x - 0.025) * calm;
    }
    for (const ear of template.ears) {
      const side = Math.sign(template.boneInfo[ear].position[0]);
      const splay = spec.plan === 'giraffe' ? 0.85 : ['deer', 'goat', 'bovine'].includes(spec.plan) ? 0.62 : spec.plan === 'bear' ? 0.35 : 0.06;
      bones[ear].rotation.z = -side * splay + Math.sin(time * 0.7 + ear) * 0.04 + Math.pow(Math.max(0, Math.sin(time * 1.7 + ear)), 22) * 0.12;
      bones[ear].rotation.y = spec.plan === 'canine' ? -Math.sign(template.boneInfo[ear].position[0]) * 0.42 : 0;
      if (resting > 0) bones[ear].rotation.z = -side * splay + (bones[ear].rotation.z + side * splay) * calm;
    }
    const blink = Math.sin(time * 0.83) > 0.998 ? 0.16 : 1;
    for (const eye of template.eyes) bones[eye].scale.y = blink * (1 - resting * 0.78);
  }
  window.Wildlife = { species, create, animate, activity, activityDescription: '活動帯と天候反応はゲーム上の近似です。地域・季節・個体による実際の生態差を再現するものではありません。' };
})();
