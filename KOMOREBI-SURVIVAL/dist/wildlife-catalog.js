(() => {
  const catalog = [];
  const add = (id, name, scientificName, plan, color, scale, habitats, details) => catalog.push({ id, name, scientificName, plan, color, scale, habitats, details });

  add('mule-deer', 'ミュールジカ', 'Odocoileus hemionus', 'deer', '#978772', 1.15, 'forest meadow alpine', { length: 1.58, ear: 0.34, neck: 0.55, tail: 0.2, tailColor: '#e2d9c6', horns: 'antler' });
  add('wapiti', 'ワピチ', 'Cervus canadensis', 'deer', '#aa9270', 1.48, 'forest meadow autumn', { length: 1.72, depth: 0.46, neck: 0.7, head: 0.32, ear: 0.24, mane: true });
  add('sambar', 'サンバー', 'Rusa unicolor', 'deer', '#766750', 1.38, 'forest wetland', { width: 0.37, depth: 0.46, neck: 0.5, ear: 0.3, muzzle: 0.3, tail: 0.26 });
  add('chital', 'アクシスジカ', 'Axis axis', 'deer', '#b58551', 1.02, 'forest meadow', { length: 1.52, width: 0.27, leg: 0.91, neck: 0.55, tail: 0.3, pattern: 'spots', chest: '#e0d7c5' });
  add('hog-deer', 'ホッグジカ', 'Axis porcinus', 'deer', '#97744e', 0.82, 'meadow wetland', { length: 1.5, depth: 0.43, leg: 0.64, neck: 0.36, ear: 0.22, horns: 'short' });
  add('barasingha', 'バラシンガ', 'Rucervus duvaucelii', 'deer', '#b59a67', 1.24, 'wetland meadow', { length: 1.6, leg: 0.98, neck: 0.61, width: 0.33, tail: 0.24, horns: 'antler' });
  add('reeves-muntjac', 'キョン', 'Muntiacus reevesi', 'deer', '#9d714b', 0.55, 'forest autumn', { length: 1.3, leg: 0.65, neck: 0.34, head: 0.31, ear: 0.23, horns: 'short' });
  add('tufted-deer', 'マエガミジカ', 'Elaphodus cephalophus', 'deer', '#665a49', 0.65, 'forest alpine', { leg: 0.7, neck: 0.34, ear: 0.2, tail: 0.15, horns: 'short', crown: '#373b32' });
  add('water-deer', 'キバノロ', 'Hydropotes inermis', 'deer', '#b39970', 0.6, 'wetland meadow', { length: 1.3, leg: 0.68, neck: 0.35, head: 0.26, ear: 0.31, tail: 0.08, horns: false, tusks: true });
  add('siberian-musk-deer', 'シベリアジャコウジカ', 'Moschus moschiferus', 'deer', '#837761', 0.68, 'forest alpine snow', { length: 1.25, leg: 0.92, neck: 0.28, ear: 0.3, tail: 0.06, horns: false, tusks: true });
  add('southern-pudu', 'プーズー', 'Pudu puda', 'deer', '#865c40', 0.43, 'forest', { length: 1.27, width: 0.35, depth: 0.4, leg: 0.48, neck: 0.24, ear: 0.2, horns: 'short' });
  add('markhor', 'マーコール', 'Capra falconeri', 'goat', '#a6977b', 1.2, 'alpine desert', { length: 1.45, leg: 0.84, neck: 0.47, ear: 0.23, horns: 'spiral', beard: true });
  add('nubian-ibex', 'ヌビアアイベックス', 'Capra nubiana', 'goat', '#b49a72', 0.97, 'desert alpine', { width: 0.27, leg: 0.76, neck: 0.42, ear: 0.23, horns: 'long-curve', beard: true });
  add('siberian-ibex', 'シベリアアイベックス', 'Capra sibirica', 'goat', '#96856b', 1.25, 'alpine snow', { length: 1.43, depth: 0.43, leg: 0.78, neck: 0.48, horns: 'long-curve', beard: true });
  add('himalayan-tahr', 'ヒマラヤタール', 'Hemitragus jemlahicus', 'goat', '#83735c', 1.08, 'alpine', { length: 1.4, width: 0.37, depth: 0.47, neck: 0.35, ear: 0.15, horns: 'short', mane: true });
  add('bharal', 'バーラル', 'Pseudois nayaur', 'goat', '#969b96', 1.02, 'alpine snow', { length: 1.4, leg: 0.75, neck: 0.35, ear: 0.17, horns: 'side', chest: '#d1ccba' });
  add('takin', 'ターキン', 'Budorcas taxicolor', 'bovine', '#b09c6b', 0.82, 'forest alpine', { length: 2.08, depth: 0.73, leg: 0.81, head: 0.49, muzzle: 0.38, horns: 'side' });
  add('japanese-serow', 'ニホンカモシカ', 'Capricornis crispus', 'goat', '#99978a', 1, 'forest alpine autumn', { length: 1.34, width: 0.37, depth: 0.45, neck: 0.3, ear: 0.21, horns: 'short' });
  add('himalayan-goral', 'ヒマラヤゴーラル', 'Naemorhedus goral', 'goat', '#8d8b7b', 0.79, 'forest alpine', { length: 1.34, leg: 0.64, neck: 0.29, ear: 0.18, tail: 0.24, horns: 'short' });
  add('argali', 'アルガリ', 'Ovis ammon', 'goat', '#a89a7b', 1.35, 'alpine meadow', { length: 1.54, leg: 0.83, depth: 0.44, neck: 0.4, ear: 0.19, horns: 'spiral' });
  add('dall-sheep', 'ドールシープ', 'Ovis dalli', 'goat', '#e2ded0', 1.07, 'alpine snow', { length: 1.36, leg: 0.74, neck: 0.37, ear: 0.16, tail: 0.14, horns: 'spiral' });
  add('aoudad', 'バーバリーシープ', 'Ammotragus lervia', 'goat', '#b19a77', 1.18, 'desert alpine', { length: 1.46, depth: 0.44, leg: 0.74, neck: 0.5, horns: 'curve', beard: true });
  add('addax', 'アダックス', 'Addax nasomaculatus', 'goat', '#d6cdb6', 1.05, 'desert', { length: 1.48, width: 0.33, leg: 0.9, neck: 0.49, horns: 'spiral', pattern: 'mask' });
  add('sable-antelope', 'セーブルアンテロープ', 'Hippotragus niger', 'deer', '#484940', 1.16, 'meadow forest', { length: 1.62, depth: 0.45, neck: 0.68, ear: 0.27, horns: 'long-curve', chest: '#ddd8c7', mane: true });
  add('roan-antelope', 'ローンアンテロープ', 'Hippotragus equinus', 'deer', '#ab9a7e', 1.3, 'meadow', { length: 1.73, width: 0.35, neck: 0.61, ear: 0.37, horns: 'curve', pattern: 'mask' });
  add('greater-kudu', 'グレータークーズー', 'Tragelaphus strepsiceros', 'deer', '#a99b87', 1.28, 'meadow forest', { length: 1.7, neck: 0.62, ear: 0.37, tail: 0.43, horns: 'spiral', pattern: 'stripes' });
  add('nyala', 'ニアラ', 'Tragelaphus angasii', 'deer', '#81796a', 1.02, 'forest wetland', { length: 1.55, neck: 0.5, leg: 0.83, tail: 0.43, horns: 'spiral', pattern: 'stripes', mane: true });
  add('sitatunga', 'シタツンガ', 'Tragelaphus spekii', 'deer', '#8d7357', 0.98, 'wetland', { length: 1.46, leg: 1.02, neck: 0.46, ear: 0.29, horns: 'spiral', pattern: 'stripes' });
  add('bongo', 'ボンゴ', 'Tragelaphus eurycerus', 'deer', '#985c3a', 1.22, 'forest', { length: 1.73, width: 0.43, depth: 0.53, neck: 0.4, ear: 0.32, horns: 'spiral', pattern: 'stripes' });
  add('eland', 'エランド', 'Tragelaphus oryx', 'bovine', '#b9aa87', 0.98, 'meadow desert', { length: 2.28, leg: 1.14, neck: 0.55, head: 0.41, ear: 0.29, horns: 'spiral', beard: true });
  add('nilgai', 'ニルガイ', 'Boselaphus tragocamelus', 'deer', '#85928d', 1.3, 'meadow forest', { length: 1.8, depth: 0.48, leg: 1.03, neck: 0.63, head: 0.35, horns: 'short', beard: true });
  add('blackbuck', 'ブラックバック', 'Antilope cervicapra', 'deer', '#66513c', 0.77, 'meadow', { length: 1.35, width: 0.24, leg: 0.92, neck: 0.5, horns: 'spiral', chest: '#e2dac6' });
  add('springbok', 'スプリングボック', 'Antidorcas marsupialis', 'deer', '#c5aa7e', 0.78, 'meadow desert', { length: 1.32, width: 0.25, leg: 0.91, neck: 0.47, horns: 'curve', chest: '#e8e0cd' });
  add('gerenuk', 'ジェレヌク', 'Litocranius walleri', 'deer', '#b08d62', 0.94, 'desert meadow', { length: 1.33, width: 0.23, leg: 1.05, neck: 0.98, head: 0.23, ear: 0.28, horns: 'curve' });
  add('kirks-dik-dik', 'キルクディクディク', 'Madoqua kirkii', 'deer', '#a89d85', 0.38, 'meadow desert', { length: 1.15, leg: 0.75, neck: 0.36, muzzle: 0.34, ear: 0.32, horns: 'short' });
  add('common-duiker', 'グリムダイカー', 'Sylvicapra grimmia', 'deer', '#ac9670', 0.55, 'forest meadow', { length: 1.25, depth: 0.41, leg: 0.69, neck: 0.29, ear: 0.31, horns: 'short' });
  add('waterbuck', 'ウォーターバック', 'Kobus ellipsiprymnus', 'deer', '#9f927d', 1.27, 'wetland meadow', { length: 1.73, width: 0.37, neck: 0.53, ear: 0.29, tail: 0.46, horns: 'long-curve' });
  add('lechwe', 'リーチュエ', 'Kobus leche', 'deer', '#b78b53', 0.96, 'wetland', { length: 1.46, leg: 0.98, neck: 0.48, ear: 0.26, horns: 'long-curve', chest: '#ddd1b5' });
  add('saola', 'サオラ', 'Pseudoryx nghetinhensis', 'goat', '#8e6950', 1.02, 'forest', { length: 1.57, leg: 0.86, neck: 0.45, muzzle: 0.29, ear: 0.27, horns: 'spear', pattern: 'mask' });
  add('musk-ox', 'ジャコウウシ', 'Ovibos moschatus', 'bovine', '#665a45', 0.88, 'snow alpine', { length: 2.35, width: 0.7, depth: 0.88, leg: 0.63, head: 0.46, ear: 0.13, horns: 'side', beard: true });
  add('gaur', 'ガウル', 'Bos gaurus', 'bovine', '#625446', 1.18, 'forest meadow', { length: 2.58, depth: 0.79, leg: 1.05, neck: 0.36, head: 0.49, shoulder: 1.23 });
  add('banteng', 'バンテン', 'Bos javanicus', 'bovine', '#a46e48', 0.98, 'forest meadow', { length: 2.22, width: 0.52, leg: 0.97, neck: 0.41, head: 0.41, horns: 'side' });
  add('european-bison', 'ヨーロッパバイソン', 'Bos bonasus', 'bovine', '#7a674c', 1.08, 'forest meadow', { length: 2.45, depth: 0.72, leg: 1.02, head: 0.43, shoulder: 1.25, beard: true });
  add('wild-water-buffalo', 'アジアスイギュウ', 'Bubalus arnee', 'bovine', '#64685f', 1.1, 'wetland meadow', { length: 2.6, width: 0.67, leg: 0.91, head: 0.49, ear: 0.28, horns: 'side' });
  add('mountain-zebra', 'ヤマシマウマ', 'Equus zebra', 'horse', '#dfdccb', 0.91, 'alpine desert', { length: 1.92, leg: 0.96, neck: 0.67, head: 0.35, ear: 0.29, pattern: 'stripes' });
  add('grevys-zebra', 'グレビーシマウマ', 'Equus grevyi', 'horse', '#e4dfce', 1.12, 'desert meadow', { length: 2.15, leg: 1.14, neck: 0.76, head: 0.4, ear: 0.34, pattern: 'stripes' });
  add('kiang', 'チベットノロバ', 'Equus kiang', 'horse', '#b88d62', 1.02, 'alpine meadow', { length: 2.08, width: 0.41, neck: 0.67, head: 0.4, ear: 0.31, chest: '#ddd6c2' });
  add('asiatic-wild-ass', 'アジアノロバ', 'Equus hemionus', 'horse', '#c2a273', 0.88, 'desert meadow', { length: 1.95, width: 0.33, leg: 1.02, neck: 0.63, ear: 0.34, tail: 0.74 });
  add('african-wild-ass', 'アフリカノロバ', 'Equus africanus', 'horse', '#b2b0a0', 0.87, 'desert', { length: 1.89, width: 0.32, neck: 0.6, head: 0.4, ear: 0.4, tail: 0.7 });
  add('asian-elephant', 'アジアゾウ', 'Elephas maximus', 'elephant', '#a59b8b', 0.87, 'forest wetland', { length: 3.45, depth: 1.12, head: 0.76, ear: 0.58, tail: 1.22, tusks: true });
  add('forest-elephant', 'マルミミゾウ', 'Loxodonta cyclotis', 'elephant', '#8f8c7e', 0.78, 'forest wetland', { length: 3.2, width: 0.91, leg: 1.57, head: 0.65, ear: 0.94, tusks: true });
  add('black-rhino', 'クロサイ', 'Diceros bicornis', 'rhino', '#939386', 0.87, 'meadow desert', { length: 2.65, width: 0.72, depth: 0.79, neck: 0.22, muzzle: 0.39, ear: 0.28 });
  add('indian-rhino', 'インドサイ', 'Rhinoceros unicornis', 'rhino', '#aaa491', 1.03, 'wetland meadow', { length: 2.95, width: 0.83, depth: 0.91, head: 0.6, muzzle: 0.45, ear: 0.24 });
  add('sumatran-rhino', 'スマトラサイ', 'Dicerorhinus sumatrensis', 'rhino', '#8f7965', 0.64, 'forest', { length: 2.6, width: 0.71, depth: 0.75, leg: 0.77, ear: 0.3, muzzle: 0.39 });
  add('javan-rhino', 'ジャワサイ', 'Rhinoceros sondaicus', 'rhino', '#9c9b89', 0.81, 'forest wetland', { length: 2.82, depth: 0.86, leg: 0.76, neck: 0.18, head: 0.56, muzzle: 0.42 });
  add('spectacled-bear', 'メガネグマ', 'Tremarctos ornatus', 'bear', '#514c40', 0.8, 'forest alpine', { length: 1.7, width: 0.51, neck: 0.18, head: 0.36, muzzle: 0.21, pattern: 'mask', chest: '#d5c9a3' });
  add('sloth-bear', 'ナマケグマ', 'Melursus ursinus', 'bear', '#49483e', 0.9, 'forest meadow', { length: 1.95, depth: 0.65, neck: 0.25, muzzle: 0.39, ear: 0.19, chest: '#d2c8ab', mane: true });
  add('african-wild-dog', 'リカオン', 'Lycaon pictus', 'canine', '#a18e64', 1.12, 'meadow', { length: 1.12, width: 0.23, leg: 0.75, muzzle: 0.2, ear: 0.31, pattern: 'painted', tailColor: '#e4dfd0' });
  add('bush-dog', 'ヤブイヌ', 'Speothos venaticus', 'canine', '#865f43', 0.74, 'forest wetland', { length: 1.18, width: 0.3, leg: 0.32, neck: 0.15, muzzle: 0.14, ear: 0.12, tail: 0.27 });
  add('gray-fox', 'ハイイロギツネ', 'Urocyon cinereoargenteus', 'canine', '#959487', 0.73, 'forest meadow', { length: 1.03, leg: 0.48, head: 0.21, muzzle: 0.22, ear: 0.25, tail: 0.76 });
  add('kit-fox', 'キットギツネ', 'Vulpes macrotis', 'canine', '#bca47a', 0.53, 'desert', { length: 0.98, width: 0.18, leg: 0.52, muzzle: 0.22, ear: 0.35, tail: 0.68 });
  add('swift-fox', 'スイフトギツネ', 'Vulpes velox', 'canine', '#b29d79', 0.52, 'meadow', { length: 1.02, width: 0.2, leg: 0.46, head: 0.23, ear: 0.26, tail: 0.7 });
  add('corsac-fox', 'コサックギツネ', 'Vulpes corsac', 'canine', '#b5aa8b', 0.64, 'meadow desert', { length: 1.04, depth: 0.28, leg: 0.49, muzzle: 0.24, ear: 0.28, tail: 0.59 });
  add('tibetan-fox', 'チベットスナギツネ', 'Vulpes ferrilata', 'canine', '#b09977', 0.7, 'alpine meadow', { length: 1.1, width: 0.27, head: 0.29, muzzle: 0.19, ear: 0.17, tail: 0.73 });
  add('ethiopian-wolf', 'エチオピアオオカミ', 'Canis simensis', 'canine', '#b2764c', 0.92, 'alpine meadow', { length: 1.15, width: 0.18, leg: 0.76, head: 0.21, muzzle: 0.31, chest: '#e2d9c5' });
  add('side-striped-jackal', 'ヨコスジジャッカル', 'Lupulella adusta', 'canine', '#9b947f', 0.88, 'meadow forest', { length: 1.13, depth: 0.3, leg: 0.57, ear: 0.22, tail: 0.51, tailColor: '#ddd6c2' });
  add('golden-jackal', 'キンイロジャッカル', 'Canis aureus', 'canine', '#b09a6d', 0.88, 'meadow wetland', { length: 1.11, width: 0.24, leg: 0.6, muzzle: 0.25, ear: 0.23, tail: 0.47 });
  add('bobcat', 'ボブキャット', 'Lynx rufus', 'feline', '#b49b77', 0.66, 'forest desert', { length: 1.36, leg: 0.69, head: 0.3, ear: 0.19, tail: 0.19, pattern: 'spots-dark' });
  add('canada-lynx', 'カナダオオヤマネコ', 'Lynx canadensis', 'feline', '#b4b3a5', 0.73, 'forest snow', { width: 0.31, leg: 0.82, head: 0.31, ear: 0.24, tail: 0.18, pattern: 'spots-dark' });
  add('iberian-lynx', 'スペインオオヤマネコ', 'Lynx pardinus', 'feline', '#b59669', 0.69, 'forest meadow', { length: 1.38, width: 0.26, leg: 0.75, ear: 0.24, tail: 0.2, pattern: 'spots-dark' });
  add('ocelot', 'オセロット', 'Leopardus pardalis', 'feline', '#b49b6b', 0.61, 'forest wetland', { length: 1.5, depth: 0.33, leg: 0.58, head: 0.29, tail: 0.76, pattern: 'rosettes' });
  add('margay', 'マーゲイ', 'Leopardus wiedii', 'feline', '#b79d71', 0.43, 'forest', { length: 1.38, width: 0.25, head: 0.31, ear: 0.18, tail: 1.35, pattern: 'rosettes' });
  add('jaguarundi', 'ジャガランディ', 'Herpailurus yagouaroundi', 'feline', '#827965', 0.56, 'forest meadow', { length: 1.64, width: 0.22, depth: 0.26, leg: 0.43, head: 0.24, ear: 0.1, tail: 1.21 });
  add('sand-cat', 'スナネコ', 'Felis margarita', 'feline', '#cbbb94', 0.34, 'desert', { length: 1.31, width: 0.3, leg: 0.46, head: 0.34, ear: 0.24, tail: 0.84, pattern: 'stripes' });
  add('pallas-cat', 'マヌルネコ', 'Otocolobus manul', 'feline', '#aaa691', 0.42, 'alpine meadow', { length: 1.37, width: 0.39, depth: 0.39, leg: 0.4, head: 0.36, ear: 0.11, tail: 0.76 });
  add('fishing-cat', 'スナドリネコ', 'Prionailurus viverrinus', 'feline', '#a5a18c', 0.61, 'wetland', { length: 1.5, width: 0.34, leg: 0.53, head: 0.32, tail: 0.59, pattern: 'spots-dark' });
  add('leopard-cat', 'ベンガルヤマネコ', 'Prionailurus bengalensis', 'feline', '#b5a076', 0.39, 'forest wetland', { length: 1.42, width: 0.24, leg: 0.69, head: 0.27, ear: 0.18, tail: 0.9, pattern: 'spots-dark' });
  add('clouded-leopard', 'ウンピョウ', 'Neofelis nebulosa', 'feline', '#b8a47b', 0.76, 'forest', { length: 1.52, width: 0.33, leg: 0.53, head: 0.32, tail: 1.43, pattern: 'patches' });
  add('wolverine', 'クズリ', 'Gulo gulo', 'mustelid', '#76634c', 1.12, 'forest snow alpine', { length: 1.06, width: 0.3, depth: 0.36, leg: 0.35, head: 0.25, tail: 0.45 });
  add('honey-badger', 'ラーテル', 'Mellivora capensis', 'mustelid', '#9c9b8c', 0.92, 'meadow desert', { length: 1.07, width: 0.27, depth: 0.27, leg: 0.25, muzzle: 0.16, tail: 0.3, darkLimbs: true });
  add('stoat', 'オコジョ', 'Mustela erminea', 'mustelid', '#9d7f55', 0.37, 'forest alpine snow', { length: 1.02, width: 0.13, depth: 0.14, leg: 0.15, head: 0.13, tail: 0.42, tailColor: '#343a31' });
  add('least-weasel', 'イイズナ', 'Mustela nivalis', 'mustelid', '#a8895d', 0.24, 'forest meadow', { length: 1.03, width: 0.12, depth: 0.12, leg: 0.13, head: 0.14, tail: 0.22, chest: '#e2d8bf' });
  add('pine-marten', 'ヨーロッパマツテン', 'Martes martes', 'mustelid', '#816749', 0.65, 'forest autumn', { length: 1.02, width: 0.17, leg: 0.25, head: 0.16, ear: 0.13, tail: 0.76, chest: '#cfb97c' });
  add('sable', 'クロテン', 'Martes zibellina', 'mustelid', '#796247', 0.6, 'forest snow', { length: 0.96, width: 0.2, depth: 0.23, leg: 0.23, ear: 0.12, tail: 0.58 });
  add('fisher', 'フィッシャー', 'Pekania pennanti', 'mustelid', '#685b46', 0.88, 'forest', { length: 1.13, width: 0.21, depth: 0.27, leg: 0.27, head: 0.2, tail: 0.72 });
  add('tayra', 'タイラ', 'Eira barbara', 'mustelid', '#675a45', 0.93, 'forest', { length: 1.1, leg: 0.32, neck: 0.21, head: 0.2, tail: 0.79, chest: '#c7b99a' });
  add('striped-skunk', 'シマスカンク', 'Mephitis mephitis', 'mustelid', '#393f38', 0.6, 'forest meadow', { length: 0.91, width: 0.24, depth: 0.29, leg: 0.2, tail: 0.78, bushyTail: true, pattern: 'stripes' });
  add('white-nosed-coati', 'ハナジロハナグマ', 'Nasua narica', 'mustelid', '#977b54', 0.79, 'forest', { length: 0.96, leg: 0.36, muzzle: 0.28, ear: 0.12, tail: 0.95, ringTail: true, pattern: 'mask' });
  add('binturong', 'ビントロング', 'Arctictis binturong', 'mustelid', '#5e6255', 1.03, 'forest', { length: 1.06, width: 0.29, depth: 0.36, leg: 0.24, ear: 0.11, tail: 1.08, bushyTail: true });
  add('african-civet', 'アフリカジャコウネコ', 'Civettictis civetta', 'mustelid', '#aca58d', 1.02, 'forest meadow', { length: 1.1, width: 0.25, leg: 0.41, neck: 0.19, head: 0.2, tail: 0.61, pattern: 'spots-dark' });
  add('dwarf-mongoose', 'コビトマングース', 'Helogale parvula', 'mustelid', '#977956', 0.36, 'meadow', { length: 0.89, width: 0.16, leg: 0.18, head: 0.16, muzzle: 0.14, tail: 0.54 });
  add('yellow-mongoose', 'キイロマングース', 'Cynictis penicillata', 'mustelid', '#b79c6a', 0.47, 'desert meadow', { length: 0.93, width: 0.18, leg: 0.22, muzzle: 0.18, tail: 0.65, bushyTail: true });
  add('eurasian-beaver', 'ヨーロッパビーバー', 'Castor fiber', 'rodent', '#8b7050', 1.75, 'wetland', { length: 0.58, width: 0.22, depth: 0.25, head: 0.19, tail: 0.38, flatTail: true });
  add('nutria', 'ヌートリア', 'Myocastor coypus', 'rodent', '#a18b65', 1.14, 'wetland', { length: 0.6, width: 0.2, depth: 0.23, muzzle: 0.16, ear: 0.06, tail: 0.68 });
  add('muskrat', 'マスクラット', 'Ondatra zibethicus', 'rodent', '#8b7352', 0.67, 'wetland', { length: 0.57, width: 0.2, depth: 0.21, head: 0.16, ear: 0.04, tail: 0.61 });
  add('patagonian-mara', 'マーラ', 'Dolichotis patagonum', 'rodent', '#a69b80', 1.5, 'meadow desert', { length: 0.58, width: 0.18, depth: 0.24, leg: 0.43, head: 0.19, ear: 0.19, tail: 0.04 });
  add('springhare', 'トビウサギ', 'Pedetes capensis', 'rabbit', '#baa176', 0.94, 'meadow desert', { length: 0.47, depth: 0.2, leg: 0.3, head: 0.14, ear: 0.18, tail: 0.65, tailColor: '#474b3d' });
  add('european-rabbit', 'アナウサギ', 'Oryctolagus cuniculus', 'rabbit', '#a99b80', 0.95, 'meadow forest', { length: 0.45, width: 0.16, depth: 0.2, head: 0.15, ear: 0.2, tail: 0.08 });
  add('mountain-hare', 'ユキウサギ', 'Lepus timidus', 'rabbit', '#c7c8bb', 1.25, 'snow alpine', { length: 0.52, depth: 0.19, leg: 0.24, ear: 0.25, head: 0.15, tail: 0.09 });
  add('american-pika', 'アメリカナキウサギ', 'Ochotona princeps', 'rabbit', '#a79e84', 0.44, 'alpine', { length: 0.43, width: 0.17, depth: 0.19, leg: 0.12, ear: 0.07, head: 0.16, tail: 0 });

  add('bald-eagle', 'ハクトウワシ', 'Haliaeetus leucocephalus', 'bird', '#695b47', 1.35, 'wetland forest', { length: 0.65, head: 0.19, muzzle: 0.18, wingspan: 2.15, tail: 0.3, crown: '#e1dfd0', tailColor: '#dddac8' });
  add('white-tailed-eagle', 'オジロワシ', 'Haliaeetus albicilla', 'bird', '#9c8a67', 1.37, 'wetland', { length: 0.67, width: 0.21, head: 0.18, muzzle: 0.21, wingspan: 2.25, tail: 0.26, tailColor: '#e4e0cd' });
  add('stellers-sea-eagle', 'オオワシ', 'Haliaeetus pelagicus', 'bird', '#514e42', 1.5, 'wetland snow', { length: 0.7, width: 0.24, head: 0.2, muzzle: 0.27, wingspan: 2.35, tail: 0.34, chest: '#e4dfcb' });
  add('osprey', 'ミサゴ', 'Pandion haliaetus', 'bird', '#7b7360', 1, 'wetland', { length: 0.6, width: 0.16, head: 0.15, muzzle: 0.14, wingspan: 1.8, chest: '#e3ddc9', pattern: 'mask' });
  add('secretarybird', 'ヘビクイワシ', 'Sagittarius serpentarius', 'wader', '#abaea2', 1.15, 'meadow', { length: 0.72, leg: 1.05, neck: 0.43, head: 0.17, muzzle: 0.14, tail: 0.67, darkWings: true });
  add('red-kite', 'アカトビ', 'Milvus milvus', 'bird', '#a7835c', 1, 'meadow forest', { length: 0.57, width: 0.16, head: 0.13, muzzle: 0.14, wingspan: 1.8, tail: 0.5 });
  add('black-kite', 'トビ', 'Milvus migrans', 'bird', '#8b7759', 0.95, 'wetland meadow', { length: 0.56, depth: 0.18, head: 0.14, muzzle: 0.15, wingspan: 1.65, tail: 0.39 });
  add('common-buzzard', 'ヨーロッパノスリ', 'Buteo buteo', 'bird', '#9b896a', 0.84, 'forest meadow', { length: 0.61, width: 0.22, head: 0.15, muzzle: 0.12, wingspan: 1.45, pattern: 'bars' });
  add('red-tailed-hawk', 'アカオノスリ', 'Buteo jamaicensis', 'bird', '#a28b66', 0.96, 'meadow desert', { length: 0.63, width: 0.2, head: 0.16, muzzle: 0.14, wingspan: 1.53, tail: 0.31, tailColor: '#ad764a' });
  add('kestrel', 'チョウゲンボウ', 'Falco tinnunculus', 'bird', '#ae916a', 0.55, 'meadow desert', { length: 0.53, width: 0.15, head: 0.16, muzzle: 0.1, wingspan: 1.28, tail: 0.43, pattern: 'spots-dark' });
  add('gyrfalcon', 'シロハヤブサ', 'Falco rusticolus', 'bird', '#d1d2c5', 0.98, 'snow alpine', { length: 0.62, width: 0.22, head: 0.18, muzzle: 0.12, wingspan: 1.49, tail: 0.38, pattern: 'bars' });
  add('saker-falcon', 'セーカーハヤブサ', 'Falco cherrug', 'bird', '#ab9b7b', 0.89, 'meadow desert', { length: 0.59, width: 0.19, head: 0.17, muzzle: 0.11, wingspan: 1.53, tail: 0.37, pattern: 'spots-dark' });
  add('eurasian-eagle-owl', 'ワシミミズク', 'Bubo bubo', 'bird', '#a89978', 1.15, 'forest alpine', { length: 0.66, width: 0.26, depth: 0.29, head: 0.27, ear: 0.15, muzzle: 0.06, wingspan: 1.75, pattern: 'bars' });
  add('great-horned-owl', 'アメリカワシミミズク', 'Bubo virginianus', 'bird', '#a19473', 1.02, 'forest meadow', { length: 0.64, width: 0.25, head: 0.25, ear: 0.17, muzzle: 0.05, wingspan: 1.63, pattern: 'bars' });
  add('long-eared-owl', 'トラフズク', 'Asio otus', 'bird', '#b0a080', 0.63, 'forest autumn', { length: 0.55, width: 0.2, head: 0.24, ear: 0.2, muzzle: 0.045, wingspan: 1.42, pattern: 'bars' });
  add('tawny-owl', 'モリフクロウ', 'Strix aluco', 'bird', '#ad9874', 0.72, 'forest autumn', { length: 0.59, width: 0.24, head: 0.27, muzzle: 0.05, wingspan: 1.35, tail: 0.25, pattern: 'bars' });
  add('ural-owl', 'フクロウ', 'Strix uralensis', 'bird', '#b7b3a0', 0.94, 'forest snow', { length: 0.67, width: 0.23, head: 0.26, muzzle: 0.055, wingspan: 1.55, tail: 0.43, pattern: 'bars' });
  add('burrowing-owl', 'アナホリフクロウ', 'Athene cunicularia', 'bird', '#b4a17b', 0.42, 'meadow desert', { length: 0.48, width: 0.21, leg: 0.31, head: 0.24, muzzle: 0.05, wingspan: 1.13, pattern: 'spots-dark' });
  add('andean-condor', 'コンドル', 'Vultur gryphus', 'bird', '#4c5047', 1.62, 'alpine', { length: 0.77, width: 0.27, neck: 0.27, head: 0.15, muzzle: 0.19, wingspan: 2.65, chest: '#dbd7c5' });
  add('california-condor', 'カリフォルニアコンドル', 'Gymnogyps californianus', 'bird', '#55594d', 1.58, 'alpine desert', { length: 0.74, width: 0.28, neck: 0.22, head: 0.16, muzzle: 0.18, wingspan: 2.57, crown: '#b89471' });
  add('hooded-crane', 'ナベヅル', 'Grus monacha', 'wader', '#7e8581', 0.98, 'wetland meadow', { length: 0.63, leg: 0.81, neck: 0.74, head: 0.12, muzzle: 0.24, crown: '#d4d3c1' });
  add('white-naped-crane', 'マナヅル', 'Antigone vipio', 'wader', '#b2b7af', 1.17, 'wetland', { length: 0.69, leg: 0.9, neck: 0.82, head: 0.13, muzzle: 0.27, crown: '#b66a51' });
  add('sandhill-crane', 'カナダヅル', 'Antigone canadensis', 'wader', '#a2a79a', 1.02, 'wetland meadow', { length: 0.66, leg: 0.88, neck: 0.77, head: 0.125, muzzle: 0.26, crown: '#af6450' });
  add('demoiselle-crane', 'アネハヅル', 'Anthropoides virgo', 'wader', '#b8bdb3', 0.86, 'meadow desert', { length: 0.6, width: 0.16, leg: 0.82, neck: 0.7, muzzle: 0.22, chest: '#494f46' });
  add('grey-crowned-crane', 'ホオジロカンムリヅル', 'Balearica regulorum', 'wader', '#9b9e91', 0.98, 'wetland meadow', { length: 0.65, leg: 0.84, neck: 0.69, head: 0.15, muzzle: 0.16, crown: '#c5b472', darkWings: true });
  add('sarus-crane', 'オオヅル', 'Antigone antigone', 'wader', '#b1b5a9', 1.43, 'wetland', { length: 0.73, leg: 0.98, neck: 0.91, head: 0.13, muzzle: 0.29, crown: '#af6651' });
  add('great-egret', 'ダイサギ', 'Ardea alba', 'wader', '#e6e4d9', 0.98, 'wetland', { length: 0.59, width: 0.14, leg: 0.87, neck: 0.96, head: 0.1, muzzle: 0.34 });
  add('little-egret', 'コサギ', 'Egretta garzetta', 'wader', '#e5e4d8', 0.64, 'wetland', { length: 0.55, width: 0.14, leg: 0.82, neck: 0.85, head: 0.11, muzzle: 0.31 });
  add('black-crowned-night-heron', 'ゴイサギ', 'Nycticorax nycticorax', 'wader', '#b4b8aa', 0.71, 'wetland forest', { length: 0.68, width: 0.24, depth: 0.28, leg: 0.48, neck: 0.4, head: 0.16, crown: '#444f46' });
  add('purple-heron', 'ムラサキサギ', 'Ardea purpurea', 'wader', '#a08c75', 0.91, 'wetland', { length: 0.65, width: 0.16, leg: 0.81, neck: 0.94, head: 0.115, muzzle: 0.35 });
  add('shoebill', 'ハシビロコウ', 'Balaeniceps rex', 'wader', '#a4ada7', 1.05, 'wetland', { length: 0.74, width: 0.29, depth: 0.31, leg: 0.86, neck: 0.53, head: 0.24, muzzle: 0.34 });
  add('white-stork', 'シュバシコウ', 'Ciconia ciconia', 'wader', '#dedfd1', 1.08, 'wetland meadow', { length: 0.7, leg: 0.91, neck: 0.75, head: 0.13, muzzle: 0.33, darkWings: true });
  add('black-stork', 'ナベコウ', 'Ciconia nigra', 'wader', '#4b5b50', 1.05, 'wetland forest', { length: 0.69, width: 0.21, leg: 0.92, neck: 0.74, muzzle: 0.34, chest: '#dbddcc' });
  add('marabou-stork', 'アフリカハゲコウ', 'Leptoptilos crumenifer', 'wader', '#7c8276', 1.4, 'wetland meadow', { length: 0.8, width: 0.28, leg: 1.04, neck: 0.62, head: 0.19, muzzle: 0.43, crown: '#b2987f' });
  add('scarlet-ibis', 'ショウジョウトキ', 'Eudocimus ruber', 'wader', '#b9684a', 0.63, 'wetland', { length: 0.59, width: 0.16, leg: 0.65, neck: 0.51, head: 0.11, muzzle: 0.43 });
  add('crested-ibis', 'トキ', 'Nipponia nippon', 'wader', '#dad7c8', 0.72, 'wetland meadow', { length: 0.63, width: 0.17, leg: 0.65, neck: 0.54, head: 0.12, muzzle: 0.4, crown: '#bd6c55' });
  add('eurasian-spoonbill', 'ヘラサギ', 'Platalea leucorodia', 'wader', '#e0dfd0', 0.85, 'wetland', { length: 0.65, width: 0.19, leg: 0.75, neck: 0.65, head: 0.13, muzzle: 0.48 });
  add('black-swan', 'コクチョウ', 'Cygnus atratus', 'duck', '#40483f', 1.36, 'wetland', { length: 0.79, width: 0.27, neck: 1.02, head: 0.14, muzzle: 0.21, wingspan: 1.6 });
  add('mute-swan', 'コブハクチョウ', 'Cygnus olor', 'duck', '#e4e2d4', 1.58, 'wetland', { length: 0.81, width: 0.3, neck: 0.98, head: 0.15, muzzle: 0.21, wingspan: 1.8 });
  add('tundra-swan', 'コハクチョウ', 'Cygnus columbianus', 'duck', '#dfdfd2', 1.31, 'wetland snow', { length: 0.75, width: 0.25, neck: 0.82, head: 0.14, muzzle: 0.24, wingspan: 1.6 });
  add('canada-goose', 'カナダガン', 'Branta canadensis', 'duck', '#a0997b', 1.18, 'wetland meadow', { length: 0.76, width: 0.26, neck: 0.7, head: 0.16, muzzle: 0.21, pattern: 'mask' });
  add('barnacle-goose', 'カオジロガン', 'Branta leucopsis', 'duck', '#a7aca0', 0.95, 'wetland meadow', { length: 0.68, width: 0.24, neck: 0.5, head: 0.16, muzzle: 0.17, pattern: 'bars' });
  add('snow-goose', 'ハクガン', 'Anser caerulescens', 'duck', '#dfdfd0', 1.08, 'wetland meadow', { length: 0.74, width: 0.25, neck: 0.55, head: 0.17, muzzle: 0.21, darkWings: true });
  add('bar-headed-goose', 'インドガン', 'Anser indicus', 'duck', '#bfc0ae', 1.04, 'wetland alpine', { length: 0.71, width: 0.24, neck: 0.6, head: 0.16, muzzle: 0.18, pattern: 'bars' });
  add('lesser-white-fronted-goose', 'カリガネ', 'Anser erythropus', 'duck', '#a59a7c', 0.88, 'wetland meadow', { length: 0.68, width: 0.24, neck: 0.47, head: 0.18, muzzle: 0.16, pattern: 'bars' });
  add('mandarin-duck', 'オシドリ', 'Aix galericulata', 'duck', '#ab8c58', 0.66, 'wetland forest', { length: 0.63, width: 0.23, neck: 0.28, head: 0.18, muzzle: 0.15, tail: 0.27, crown: '#6b8271' });
  add('wood-duck', 'アメリカオシ', 'Aix sponsa', 'duck', '#9f8462', 0.76, 'wetland forest', { length: 0.66, width: 0.23, neck: 0.32, head: 0.18, muzzle: 0.16, tail: 0.26, crown: '#5c7868' });
  add('northern-pintail', 'オナガガモ', 'Anas acuta', 'duck', '#aaa690', 0.84, 'wetland', { length: 0.72, width: 0.18, neck: 0.42, head: 0.13, muzzle: 0.21, tail: 0.45 });
  add('eurasian-teal', 'コガモ', 'Anas crecca', 'duck', '#a49b78', 0.55, 'wetland', { length: 0.58, width: 0.2, neck: 0.24, head: 0.15, muzzle: 0.2, tail: 0.22, crown: '#748c68' });
  add('eurasian-wigeon', 'ヒドリガモ', 'Mareca penelope', 'duck', '#a4a695', 0.75, 'wetland meadow', { length: 0.67, width: 0.23, neck: 0.29, head: 0.18, muzzle: 0.14, crown: '#ad8155' });
  add('northern-shoveler', 'ハシビロガモ', 'Spatula clypeata', 'duck', '#aa9874', 0.79, 'wetland', { length: 0.67, width: 0.23, neck: 0.27, head: 0.16, muzzle: 0.37, chest: '#ddd3b7' });
  add('tufted-duck', 'キンクロハジロ', 'Aythya fuligula', 'duck', '#565c50', 0.68, 'wetland', { length: 0.62, width: 0.24, neck: 0.25, head: 0.19, muzzle: 0.2, chest: '#d8dbca' });
  add('common-pochard', 'ホシハジロ', 'Aythya ferina', 'duck', '#b0b1a0', 0.78, 'wetland', { length: 0.68, width: 0.25, neck: 0.28, head: 0.17, muzzle: 0.23, crown: '#a66f4b' });
  add('common-eider', 'ホンケワタガモ', 'Somateria mollissima', 'duck', '#d2d6c7', 1.02, 'wetland snow', { length: 0.77, width: 0.29, depth: 0.3, neck: 0.33, head: 0.18, muzzle: 0.29, darkWings: true });
  add('smew', 'ミコアイサ', 'Mergellus albellus', 'duck', '#d6dbcf', 0.68, 'wetland forest', { length: 0.62, width: 0.2, neck: 0.31, head: 0.19, muzzle: 0.17, pattern: 'mask' });
  add('golden-pheasant', 'キンケイ', 'Chrysolophus pictus', 'duck', '#b5844d', 0.83, 'forest meadow', { length: 0.63, width: 0.2, leg: 0.25, neck: 0.37, muzzle: 0.1, tail: 1.18, crown: '#ccb65b' });
  add('lady-amhersts-pheasant', 'ギンケイ', 'Chrysolophus amherstiae', 'duck', '#bfc0ac', 0.91, 'forest alpine', { length: 0.67, width: 0.21, leg: 0.27, neck: 0.39, muzzle: 0.1, tail: 1.28, pattern: 'bars' });
  add('silver-pheasant', 'ハッカン', 'Lophura nycthemera', 'duck', '#d1d2c0', 0.98, 'forest', { length: 0.71, width: 0.23, leg: 0.31, neck: 0.38, muzzle: 0.11, tail: 0.97, crown: '#b5664b' });
  add('green-peafowl', 'マクジャク', 'Pavo muticus', 'duck', '#78977b', 1.46, 'forest meadow', { length: 0.77, width: 0.25, leg: 0.34, neck: 0.83, head: 0.16, muzzle: 0.12, fanTail: true });
  add('western-capercaillie', 'ヨーロッパオオライチョウ', 'Tetrao urogallus', 'duck', '#5e6659', 1.08, 'forest alpine', { length: 0.79, width: 0.31, depth: 0.32, neck: 0.37, head: 0.18, tail: 0.5, fanTail: true });
  add('black-grouse', 'クロライチョウ', 'Lyrurus tetrix', 'duck', '#485449', 0.84, 'forest meadow alpine', { length: 0.65, width: 0.25, depth: 0.29, neck: 0.3, muzzle: 0.09, tail: 0.39 });
  add('rock-ptarmigan', 'ライチョウ', 'Lagopus muta', 'duck', '#c8c8b7', 0.59, 'snow alpine', { length: 0.61, width: 0.26, depth: 0.27, leg: 0.18, neck: 0.22, muzzle: 0.08, pattern: 'bars' });
  add('willow-ptarmigan', 'カラフトライチョウ', 'Lagopus lagopus', 'duck', '#b7a181', 0.67, 'snow meadow', { length: 0.63, width: 0.27, depth: 0.29, neck: 0.25, muzzle: 0.1, tail: 0.21, pattern: 'bars' });
  add('wild-turkey', 'シチメンチョウ', 'Meleagris gallopavo', 'duck', '#8c7d62', 1.27, 'forest meadow', { length: 0.85, width: 0.35, depth: 0.37, leg: 0.43, neck: 0.43, head: 0.14, fanTail: true });
  add('helmeted-guineafowl', 'ホロホロチョウ', 'Numida meleagris', 'duck', '#8d9284', 0.85, 'meadow', { length: 0.72, width: 0.3, depth: 0.33, leg: 0.34, neck: 0.3, head: 0.11, pattern: 'spots' });
  add('japanese-quail', 'ウズラ', 'Coturnix japonica', 'duck', '#ad9b72', 0.32, 'meadow autumn', { length: 0.56, width: 0.26, depth: 0.26, leg: 0.2, neck: 0.17, muzzle: 0.08, tail: 0.08, pattern: 'bars' });
  add('chukar', 'イワシャコ', 'Alectoris chukar', 'duck', '#b8ad92', 0.56, 'alpine desert', { length: 0.62, width: 0.25, depth: 0.28, leg: 0.25, neck: 0.25, muzzle: 0.09, pattern: 'bars' });
  add('grey-partridge', 'ヨーロッパヤマウズラ', 'Perdix perdix', 'duck', '#b1a387', 0.52, 'meadow autumn', { length: 0.6, width: 0.27, depth: 0.28, leg: 0.22, neck: 0.2, muzzle: 0.08, pattern: 'bars' });
  add('blue-jay', 'アオカケス', 'Cyanocitta cristata', 'bird', '#839ba3', 0.47, 'forest autumn', { length: 0.58, width: 0.16, head: 0.16, muzzle: 0.15, wingspan: 0.89, tail: 0.46, chest: '#d3d8c7' });
  add('eurasian-jay', 'カケス', 'Garrulus glandarius', 'bird', '#b09b81', 0.53, 'forest autumn', { length: 0.61, width: 0.18, head: 0.17, muzzle: 0.18, wingspan: 0.98, tail: 0.4, pattern: 'mask' });

  add('saltwater-crocodile', 'イリエワニ', 'Crocodylus porosus', 'reptile', '#87917b', 2.1, 'wetland', { length: 1.55, width: 0.32, depth: 0.22, head: 0.28, muzzle: 0.67, tail: 1.47, scutes: true });
  add('american-alligator', 'アメリカアリゲーター', 'Alligator mississippiensis', 'reptile', '#737e6c', 1.62, 'wetland', { length: 1.43, width: 0.33, depth: 0.24, head: 0.3, muzzle: 0.47, tail: 1.26, scutes: true });
  add('chinese-alligator', 'ヨウスコウワニ', 'Alligator sinensis', 'reptile', '#929780', 0.97, 'wetland', { length: 1.31, width: 0.3, depth: 0.23, head: 0.27, muzzle: 0.39, tail: 1.07, scutes: true });
  add('spectacled-caiman', 'メガネカイマン', 'Caiman crocodilus', 'reptile', '#9b9b76', 1.14, 'wetland', { length: 1.35, width: 0.27, head: 0.24, muzzle: 0.45, tail: 1.19, scutes: true });
  add('cuviers-dwarf-caiman', 'コビトカイマン', 'Paleosuchus palpebrosus', 'reptile', '#807d62', 0.75, 'wetland forest', { length: 1.25, width: 0.28, depth: 0.24, head: 0.29, muzzle: 0.32, tail: 1.02, scutes: true });
  add('gharial', 'インドガビアル', 'Gavialis gangeticus', 'reptile', '#8b947c', 1.8, 'wetland', { length: 1.43, width: 0.24, depth: 0.2, head: 0.18, muzzle: 1.03, tail: 1.39, scutes: true });
  add('false-gharial', 'マレーガビアル', 'Tomistoma schlegelii', 'reptile', '#95916d', 1.7, 'wetland forest', { length: 1.48, width: 0.27, head: 0.22, muzzle: 0.77, tail: 1.34, scutes: true });
  add('nile-monitor', 'ナイルオオトカゲ', 'Varanus niloticus', 'reptile', '#909a75', 0.96, 'wetland', { length: 1.12, width: 0.22, neck: 0.23, head: 0.22, muzzle: 0.28, tail: 1.52, pattern: 'spots' });
  add('savannah-monitor', 'サバンナオオトカゲ', 'Varanus exanthematicus', 'reptile', '#a69c77', 0.64, 'meadow desert', { length: 1.18, width: 0.3, depth: 0.23, neck: 0.15, head: 0.28, tail: 1.02, pattern: 'spots' });
  add('perentie', 'ペレンティーオオトカゲ', 'Varanus giganteus', 'reptile', '#b1a272', 1.08, 'desert', { length: 1.23, width: 0.21, leg: 0.23, neck: 0.25, head: 0.24, tail: 1.61, pattern: 'spots' });
  add('asian-water-monitor', 'ミズオオトカゲ', 'Varanus salvator', 'reptile', '#858c70', 1.19, 'wetland forest', { length: 1.29, width: 0.26, neck: 0.23, head: 0.25, muzzle: 0.32, tail: 1.57, pattern: 'spots' });
  add('gila-monster', 'アメリカドクトカゲ', 'Heloderma suspectum', 'reptile', '#b69a79', 0.39, 'desert', { length: 1.18, width: 0.33, depth: 0.23, head: 0.31, muzzle: 0.14, tail: 0.78, pattern: 'patches' });
  add('central-bearded-dragon', 'フトアゴヒゲトカゲ', 'Pogona vitticeps', 'reptile', '#b7aa84', 0.31, 'desert', { length: 1.07, width: 0.32, depth: 0.2, head: 0.32, muzzle: 0.13, tail: 1.31, scutes: true });
  add('eastern-blue-tongued-skink', 'ヒガシアオジタトカゲ', 'Tiliqua scincoides', 'reptile', '#aaa080', 0.35, 'meadow forest', { length: 1.4, width: 0.33, depth: 0.22, leg: 0.1, head: 0.29, muzzle: 0.16, tail: 0.85, pattern: 'bars' });
  add('leopard-gecko', 'ヒョウモントカゲモドキ', 'Eublepharis macularius', 'reptile', '#bfb17f', 0.15, 'desert', { length: 1.13, width: 0.27, head: 0.3, muzzle: 0.11, leg: 0.2, tail: 0.91, pattern: 'spots-dark' });
  add('tokay-gecko', 'トッケイヤモリ', 'Gekko gecko', 'reptile', '#8faba2', 0.2, 'forest', { length: 1.17, width: 0.28, head: 0.32, muzzle: 0.12, leg: 0.21, tail: 1.07, pattern: 'spots' });
  add('green-basilisk', 'グリーンバシリスク', 'Basiliscus plumifrons', 'reptile', '#7fa36d', 0.38, 'forest wetland', { length: 1.01, width: 0.2, depth: 0.24, leg: 0.28, head: 0.22, tail: 1.8, scutes: true });
  add('leopard-tortoise', 'ヒョウモンガメ', 'Stigmochelys pardalis', 'tortoise', '#c0b17d', 0.63, 'meadow desert', { length: 0.74, width: 0.38, depth: 0.4, head: 0.12, neck: 0.2, pattern: 'spots-dark' });
  add('sulcata-tortoise', 'ケヅメリクガメ', 'Centrochelys sulcata', 'tortoise', '#b9aa7e', 0.96, 'desert meadow', { length: 0.82, width: 0.42, depth: 0.34, leg: 0.17, neck: 0.2, head: 0.14 });
  add('red-footed-tortoise', 'アカアシガメ', 'Chelonoidis carbonarius', 'tortoise', '#8f8d65', 0.54, 'forest meadow', { length: 0.78, width: 0.31, depth: 0.34, neck: 0.19, head: 0.12, darkLimbs: true });
  add('greek-tortoise', 'ギリシャリクガメ', 'Testudo graeca', 'tortoise', '#baac77', 0.38, 'desert meadow', { length: 0.71, width: 0.36, depth: 0.35, neck: 0.17, tail: 0.08, pattern: 'patches' });
  add('hermanns-tortoise', 'ヘルマンリクガメ', 'Testudo hermanni', 'tortoise', '#c5b574', 0.35, 'forest meadow', { length: 0.69, width: 0.34, depth: 0.32, neck: 0.16, tail: 0.12, pattern: 'patches' });
  add('common-frog', 'ヨーロッパアカガエル', 'Rana temporaria', 'frog', '#a59670', 0.62, 'wetland forest', { length: 0.21, width: 0.095, depth: 0.075, leg: 0.085, head: 0.085, pattern: 'spots-dark' });
  add('american-bullfrog', 'ウシガエル', 'Lithobates catesbeianus', 'frog', '#929a6b', 1.11, 'wetland', { length: 0.25, width: 0.13, depth: 0.1, leg: 0.09, head: 0.11, muzzle: 0.035 });
  add('dyeing-poison-frog', 'アイゾメヤドクガエル', 'Dendrobates tinctorius', 'frog', '#a9b16e', 0.36, 'forest wetland', { length: 0.2, width: 0.095, depth: 0.08, leg: 0.09, head: 0.085, pattern: 'patches' });
  add('golden-poison-frog', 'モウドクフキヤガエル', 'Phyllobates terribilis', 'frog', '#c6b468', 0.34, 'forest wetland', { length: 0.21, width: 0.1, depth: 0.078, leg: 0.08, head: 0.09, muzzle: 0.018 });
  add('red-eyed-tree-frog', 'アカメアマガエル', 'Agalychnis callidryas', 'frog', '#8fad71', 0.43, 'forest wetland', { length: 0.23, width: 0.08, depth: 0.065, leg: 0.12, head: 0.085, muzzle: 0.016 });
  add('monarch-butterfly', 'オオカバマダラ', 'Danaus plexippus', 'insect', '#bf9157', 0.73, 'meadow forest', { length: 0.11, width: 0.015, head: 0.021, wingspan: 0.38, butterfly: true, pattern: 'bars' });
  add('old-world-swallowtail', 'キアゲハ', 'Papilio machaon', 'insect', '#c8bb76', 0.69, 'meadow wetland', { length: 0.1, width: 0.014, head: 0.019, wingspan: 0.36, butterfly: true, pattern: 'stripes' });
  add('emperor-dragonfly', 'ヨーロッパギンヤンマ', 'Anax imperator', 'insect', '#83aaa0', 0.76, 'wetland', { length: 0.16, width: 0.013, head: 0.025, wingspan: 0.29, tail: 0, pattern: 'bars' });

  window.WildlifeCatalog = catalog;
  window.WildlifeBaseTaxonomy = {
    ibex: { name: 'アルプスアイベックス', scientificName: 'Capra ibex' },
    oryx: { name: 'ゲムズボック', scientificName: 'Oryx gazella' },
    rabbit: { name: 'ニホンノウサギ', scientificName: 'Lepus brachyurus' },
    porcupine: { name: 'タテガミヤマアラシ', scientificName: 'Hystrix cristata' },
    hedgehog: { name: 'ヨーロッパハリネズミ', scientificName: 'Erinaceus europaeus' },
    giraffe: { name: 'アミメキリン', scientificName: 'Giraffa reticulata' },
    camel: { name: '野生フタコブラクダ', scientificName: 'Camelus ferus' },
    tortoise: { name: 'アルダブラゾウガメ', scientificName: 'Aldabrachelys gigantea' },
    frog: { name: 'ニホンアマガエル', scientificName: 'Dryophytes japonicus' },
    butterfly: { name: 'メネラウスモルフォ', scientificName: 'Morpho menelaus' }
  };
  window.WildlifeCatalogMetadata = {
    morphology: 'Procedural rig proportions, not zoological measurements; habitat labels are the game biomes.',
    baseTaxonomy: 'Representative species selected for ten previously broad labels; existing identifiers are preserved. This is not a taxonomic audit of the other ninety original entries.',
    taxonomySources: [
      'https://www.mammaldiversity.org/releases/',
      'https://www.worldbirdnames.org/new/ioc-lists/master-list-2/',
      'https://www.avilist.org/checklist/v2026/',
      'https://reptile-database.reptarium.cz/',
      'https://amphibiansoftheworld.amnh.org/',
      'https://www.nhm.ac.uk/our-science/data/uk-species/taxon?tvk=NBNSYS0000005630',
      'https://reptile-database.reptarium.cz/Aldabrachelys/gigantea',
      'https://amphibiansoftheworld.amnh.org/Amphibia/Anura/Hylidae/Dryophytes/Dryophytes-japonicus',
      'https://www.nhm.ac.uk/our-science/data/lepindex/detail?taxonno=146387'
    ]
  };
})();
