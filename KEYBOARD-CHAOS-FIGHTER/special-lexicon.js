const makeSpecial = (spec) => ({
    ...spec,
    id: spec.id,
    canonical: spec.canonical,
    aliases: spec.aliases,
    theme: spec.theme,
    effectType: spec.effectType,
    damage: spec.damage,
    status: spec.status ?? null,
    meterCost: spec.meterCost,
    castTime: spec.castTime,
    projectile: spec.projectile ?? { speed: 8, size: 22, color: "#ffffff", arc: 0, pierce: 0 },
    area: spec.area ?? { radius: 110, range: 300 },
    duration: spec.duration ?? 4,
    vfx: spec.vfx,
    sfxText: spec.sfxText
});

const themedSpecials = (theme, defaults, entries) =>
    entries.map(([id, canonical, aliases, overrides = {}]) =>
        makeSpecial({
            ...defaults,
            ...overrides,
            id,
            canonical,
            aliases,
            theme,
            projectile: { ...(defaults.projectile ?? {}), ...(overrides.projectile ?? {}) },
            area: { ...(defaults.area ?? {}), ...(overrides.area ?? {}) }
        })
    );

const SPECIAL_LEXICON = [
    ...themedSpecials("flame", {
        effectType: "projectile",
        damage: 70,
        status: "burn",
        meterCost: 22,
        castTime: 0.42,
        projectile: { speed: 9.5, size: 22, color: "#ff6b39", arc: 0, pierce: 0 },
        area: { radius: 104, range: 300 },
        duration: 3.1,
        vfx: "Crimson Burst",
        sfxText: "BWOOM"
    }, [
        ["fire", "火", ["ほのお", "fire", "honoo"]],
        ["flame", "炎", ["ほむら", "flame", "homura"], { effectType: "beam", damage: 74, meterCost: 24, vfx: "Homura Rail", sfxText: "SHAAA" }],
        ["magma", "マグマ", ["まぐま", "magma", "maguma"], { effectType: "zone", damage: 62, duration: 5.6, area: { radius: 128, range: 200 }, vfx: "Molten Floor", sfxText: "GORO" }],
        ["lava", "溶岩", ["ようがん", "lava", "yougan"], { effectType: "meteor", damage: 80, meterCost: 28, castTime: 0.52, vfx: "Lava Bombard", sfxText: "GADOOM" }],
        ["ember", "熾火", ["おきび", "ember", "okibi"], { damage: 60, projectile: { speed: 11, size: 16, color: "#ffb25f" }, vfx: "Ash Spark", sfxText: "PACHI" }],
        ["furnace", "炉", ["かまど", "furnace", "kamado"], { effectType: "buff", damage: 0, status: "rage", meterCost: 18, duration: 6.2, vfx: "Heat Up", sfxText: "HOOO" }],
        ["volcano", "火山", ["かざん", "volcano", "kazan"], { effectType: "rain", damage: 78, meterCost: 29, castTime: 0.58, vfx: "Volcano Shower", sfxText: "DOGOON" }],
        ["sun", "太陽", ["たいよう", "sun", "taiyou"], { effectType: "orbit", damage: 66, meterCost: 26, duration: 5.2, projectile: { speed: 0, size: 28, color: "#ffd45d" }, vfx: "Solar Halo", sfxText: "VAAAA" }]
    ]),
    ...themedSpecials("ice", {
        effectType: "projectile",
        damage: 66,
        status: "freeze",
        meterCost: 22,
        castTime: 0.4,
        projectile: { speed: 8.5, size: 20, color: "#88dfff", arc: 0, pierce: 0 },
        area: { radius: 110, range: 290 },
        duration: 3.8,
        vfx: "Frozen Needle",
        sfxText: "SHIN"
    }, [
        ["ice", "氷", ["こおり", "ice", "koori"]],
        ["snow", "雪", ["ゆき", "snow", "yuki"], { effectType: "rain", damage: 58, meterCost: 20, duration: 4.8, vfx: "Snow Fall", sfxText: "SARA" }],
        ["blizzard", "吹雪", ["ふぶき", "blizzard", "fubuki"], { effectType: "zone", damage: 64, meterCost: 26, duration: 5.4, vfx: "Whiteout Dome", sfxText: "GOOO" }],
        ["frost", "霜", ["しも", "frost", "shimo"], { effectType: "trap", damage: 50, meterCost: 18, duration: 5, vfx: "Frost Seal", sfxText: "CHIRI" }],
        ["icicle", "つらら", ["つらら", "icicle", "tsurara"], { damage: 72, projectile: { speed: 11, size: 18, color: "#b3edff" }, vfx: "Icicle Spear", sfxText: "TSSK" }],
        ["glacier", "氷河", ["ひょうが", "glacier", "hyouga"], { effectType: "wall", damage: 40, meterCost: 24, duration: 5.8, vfx: "Glacier Wall", sfxText: "DOSH" }],
        ["hail", "雹", ["ひょう", "hail", "hyou"], { effectType: "rain", damage: 70, meterCost: 27, castTime: 0.48, vfx: "Hailstorm", sfxText: "BARA" }],
        ["crystal", "結晶", ["けっしょう", "crystal", "kesshou"], { effectType: "barrier", damage: 0, meterCost: 20, duration: 5, status: "guard", vfx: "Crystal Veil", sfxText: "PIII" }]
    ]),
    ...themedSpecials("thunder", {
        effectType: "beam",
        damage: 72,
        status: "shock",
        meterCost: 24,
        castTime: 0.38,
        projectile: { speed: 13, size: 18, color: "#ffe45d", arc: 0, pierce: 1 },
        area: { radius: 118, range: 320 },
        duration: 2.9,
        vfx: "Volt Strike",
        sfxText: "KRAK"
    }, [
        ["thunder", "雷", ["かみなり", "thunder", "kaminari"]],
        ["lightning", "稲妻", ["いなずま", "lightning", "inazuma"], { effectType: "rush", damage: 76, meterCost: 23, vfx: "Lightning Dash", sfxText: "ZAAAP" }],
        ["electric", "電気", ["でんき", "electric", "denki"], { effectType: "projectile", damage: 68, vfx: "Electric Orb", sfxText: "BZZT" }],
        ["plasma", "プラズマ", ["ぷらずま", "plasma", "purazuma"], { effectType: "beam", damage: 80, meterCost: 28, castTime: 0.5, vfx: "Plasma Rail", sfxText: "FSSSH" }],
        ["storm", "嵐", ["あらし", "storm", "arashi"], { effectType: "rain", damage: 74, meterCost: 27, duration: 4.6, vfx: "Storm Grid", sfxText: "GARRR" }],
        ["magnet", "磁石", ["じしゃく", "magnet", "jishaku"], { effectType: "zone", damage: 56, meterCost: 19, duration: 5.2, status: "pull", vfx: "Magnet Field", sfxText: "NNNN" }],
        ["battery", "充電", ["じゅうでん", "battery", "juuden"], { effectType: "buff", damage: 0, meterCost: 16, duration: 6, status: "haste", vfx: "Charge Rise", sfxText: "PON" }],
        ["flash", "閃光", ["せんこう", "flash", "senkou"], { effectType: "beam", damage: 64, meterCost: 21, status: "blind", vfx: "Flash Line", sfxText: "PAAAN" }]
    ]),
    ...themedSpecials("wind", {
        effectType: "rush",
        damage: 60,
        status: "slow",
        meterCost: 18,
        castTime: 0.28,
        projectile: { speed: 11, size: 18, color: "#8effda", arc: 0, pierce: 0 },
        area: { radius: 108, range: 340 },
        duration: 3.4,
        vfx: "Wind Rush",
        sfxText: "WHOOSH"
    }, [
        ["wind", "風", ["かぜ", "wind", "kaze"]],
        ["gale", "疾風", ["しっぷう", "gale", "shippuu"], { damage: 68, meterCost: 20, vfx: "Gale Burst", sfxText: "SHUU" }],
        ["tornado", "竜巻", ["たつまき", "tornado", "tatsumaki"], { effectType: "zone", damage: 62, meterCost: 24, duration: 5, status: "lift", vfx: "Twister Cage", sfxText: "GURURU" }],
        ["cyclone", "旋風", ["せんぷう", "cyclone", "senpuu"], { effectType: "projectile", damage: 58, meterCost: 19, vfx: "Cyclone Disk", sfxText: "FWOOP" }],
        ["feather", "羽", ["はね", "feather", "hane"], { effectType: "buff", damage: 0, meterCost: 14, duration: 6.4, status: "evade", vfx: "Feather Light", sfxText: "PASA" }],
        ["whistle", "口笛", ["くちぶえ", "whistle", "kuchibue"], { effectType: "beam", damage: 54, meterCost: 17, status: "stagger", vfx: "Whistle Slice", sfxText: "FIII" }],
        ["cloud", "雲", ["くも", "cloud", "kumo"], { effectType: "barrier", damage: 0, meterCost: 18, duration: 4.8, status: "mist", vfx: "Cloud Mantle", sfxText: "MOKO" }],
        ["sky", "空", ["そら", "sky", "sora"], { effectType: "rain", damage: 68, meterCost: 25, castTime: 0.44, vfx: "Sky Drop", sfxText: "FUUUN" }]
    ]),
    ...themedSpecials("water", {
        effectType: "wave",
        damage: 64,
        status: "soak",
        meterCost: 20,
        castTime: 0.34,
        projectile: { speed: 9, size: 22, color: "#3fb4ff", arc: 0, pierce: 0 },
        area: { radius: 120, range: 320 },
        duration: 4.2,
        vfx: "Aqua Crash",
        sfxText: "SPLASH"
    }, [
        ["water", "水", ["みず", "water", "mizu"]],
        ["rain", "雨", ["あめ", "rain", "ame"], { effectType: "rain", damage: 60, meterCost: 18, duration: 4.8, vfx: "Rain Barrage", sfxText: "SHATA" }],
        ["wave", "波", ["なみ", "wave", "nami"], { effectType: "wave", damage: 70, meterCost: 23, vfx: "Breaker Wave", sfxText: "DAN" }],
        ["tide", "潮", ["しお", "tide", "shio"], { effectType: "rush", damage: 66, meterCost: 21, vfx: "Tidal Dash", sfxText: "ZOOO" }],
        ["bubble", "泡", ["あわ", "bubble", "awa"], { effectType: "trap", damage: 48, meterCost: 16, duration: 5.6, status: "float", vfx: "Bubble Snare", sfxText: "POKO" }],
        ["whale", "鯨", ["くじら", "whale", "kujira"], { effectType: "summon", damage: 82, meterCost: 29, castTime: 0.54, vfx: "Whale Charge", sfxText: "BOMMM" }],
        ["river", "川", ["かわ", "river", "kawa"], { effectType: "projectile", damage: 58, meterCost: 17, vfx: "River Current", sfxText: "SAA" }],
        ["ocean", "海", ["うみ", "ocean", "umi"], { effectType: "barrier", damage: 0, meterCost: 22, duration: 5.5, status: "guard", vfx: "Ocean Dome", sfxText: "WOOON" }]
    ]),
    ...themedSpecials("earth", {
        effectType: "wall",
        damage: 58,
        status: "stagger",
        meterCost: 20,
        castTime: 0.38,
        projectile: { speed: 7.6, size: 26, color: "#b1895f", arc: 0, pierce: 0 },
        area: { radius: 130, range: 250 },
        duration: 5.4,
        vfx: "Stone Rise",
        sfxText: "DODON"
    }, [
        ["earth", "土", ["つち", "earth", "tsuchi"]],
        ["rock", "岩", ["いわ", "rock", "iwa"], { effectType: "projectile", damage: 72, meterCost: 23, projectile: { speed: 8.3, size: 24, color: "#8d6d4a" }, vfx: "Rock Shot", sfxText: "DON" }],
        ["sand", "砂", ["すな", "sand", "suna"], { effectType: "zone", damage: 50, meterCost: 17, duration: 5, status: "blind", vfx: "Sand Vortex", sfxText: "JARI" }],
        ["mountain", "山", ["やま", "mountain", "yama"], { effectType: "wall", damage: 64, meterCost: 24, duration: 6.2, vfx: "Mountain Block", sfxText: "GOGO" }],
        ["canyon", "谷", ["たに", "canyon", "tani"], { effectType: "trap", damage: 62, meterCost: 19, duration: 4.6, status: "root", vfx: "Canyon Crack", sfxText: "BAKI" }],
        ["fossil", "化石", ["かせき", "fossil", "kaseki"], { effectType: "summon", damage: 74, meterCost: 25, duration: 4.4, vfx: "Fossil Beast", sfxText: "GASHA" }],
        ["desert", "砂漠", ["さばく", "desert", "sabaku"], { effectType: "rain", damage: 68, meterCost: 24, duration: 4.4, status: "weaken", vfx: "Desert Storm", sfxText: "ZAZA" }],
        ["mud", "泥", ["どろ", "mud", "doro"], { effectType: "zone", damage: 52, meterCost: 18, duration: 5.8, status: "slow", vfx: "Mud Lock", sfxText: "BETCHA" }]
    ]),
    ...themedSpecials("light", {
        effectType: "beam",
        damage: 68,
        status: "radiant",
        meterCost: 22,
        castTime: 0.36,
        projectile: { speed: 11, size: 20, color: "#fff1a0", arc: 0, pierce: 1 },
        area: { radius: 114, range: 360 },
        duration: 4,
        vfx: "Luminous Arc",
        sfxText: "KIIIN"
    }, [
        ["light", "光", ["ひかり", "light", "hikari"]],
        ["daybreak", "夜明け", ["よあけ", "daybreak", "yoake"], { effectType: "heal", damage: 0, meterCost: 18, duration: 0, vfx: "Dawn Recovery", sfxText: "AAN" }],
        ["mirror", "鏡", ["かがみ", "mirror", "kagami"], { effectType: "counter", damage: 62, meterCost: 20, duration: 3.8, status: "reflect", vfx: "Mirror Flash", sfxText: "PING" }],
        ["halo", "光輪", ["こうりん", "halo", "kourin"], { effectType: "orbit", damage: 66, meterCost: 24, duration: 5.4, vfx: "Halo Orbit", sfxText: "VYNN" }],
        ["star", "星", ["ほし", "star", "hoshi"], { effectType: "rain", damage: 72, meterCost: 26, duration: 4.5, vfx: "Star Rain", sfxText: "TIN" }],
        ["prism", "プリズム", ["ぷりずむ", "prism", "purizumu"], { effectType: "beam", damage: 78, meterCost: 27, vfx: "Prism Cutter", sfxText: "FRAAA" }],
        ["aurora", "オーロラ", ["おーろら", "aurora", "orora"], { effectType: "barrier", damage: 0, meterCost: 19, duration: 5.3, status: "regen", vfx: "Aurora Curtain", sfxText: "WIIIN" }],
        ["angel", "天使", ["てんし", "angel", "tenshi"], { effectType: "summon", damage: 75, meterCost: 28, duration: 4.2, vfx: "Angel Dive", sfxText: "RIN" }]
    ]),
    ...themedSpecials("dark", {
        effectType: "trap",
        damage: 62,
        status: "curse",
        meterCost: 21,
        castTime: 0.4,
        projectile: { speed: 9, size: 22, color: "#8c62ff", arc: 0, pierce: 0 },
        area: { radius: 118, range: 300 },
        duration: 4.8,
        vfx: "Shadow Snare",
        sfxText: "GIII"
    }, [
        ["dark", "闇", ["やみ", "dark", "yami"]],
        ["shadow", "影", ["かげ", "shadow", "kage"], { effectType: "rush", damage: 70, meterCost: 22, vfx: "Shadow Rush", sfxText: "SWISH" }],
        ["moon", "月", ["つき", "moon", "tsuki"], { effectType: "projectile", damage: 64, meterCost: 20, vfx: "Moon Disc", sfxText: "SHUU" }],
        ["night", "夜", ["よる", "night", "yoru"], { effectType: "barrier", damage: 0, meterCost: 18, duration: 5.1, status: "mist", vfx: "Night Cloak", sfxText: "SAAA" }],
        ["phantom", "幻", ["まぼろし", "phantom", "maboroshi"], { effectType: "counter", damage: 66, meterCost: 20, duration: 3.8, vfx: "Phantom Slip", sfxText: "YURARI" }],
        ["curse", "呪い", ["のろい", "curse", "noroi"], { effectType: "zone", damage: 56, meterCost: 19, duration: 6, status: "curse", vfx: "Curse Circle", sfxText: "ZAWA" }],
        ["abyss", "深淵", ["しんえん", "abyss", "shinen"], { effectType: "summon", damage: 82, meterCost: 29, castTime: 0.52, vfx: "Abyss Maw", sfxText: "GOON" }],
        ["crow", "烏", ["からす", "crow", "karasu"], { effectType: "rain", damage: 68, meterCost: 24, duration: 4.4, vfx: "Crow Scatter", sfxText: "KAA" }]
    ]),
    ...themedSpecials("plant", {
        effectType: "trap",
        damage: 58,
        status: "root",
        meterCost: 18,
        castTime: 0.34,
        projectile: { speed: 8.5, size: 18, color: "#74d66f", arc: 0, pierce: 0 },
        area: { radius: 126, range: 280 },
        duration: 5.6,
        vfx: "Verdant Grip",
        sfxText: "GROW"
    }, [
        ["leaf", "葉", ["はっぱ", "leaf", "happa"]],
        ["flower", "花", ["はな", "flower", "hana"], { effectType: "buff", damage: 0, meterCost: 14, duration: 6, status: "regen", vfx: "Bloom Heal", sfxText: "PON" }],
        ["seed", "種", ["たね", "seed", "tane"], { effectType: "projectile", damage: 52, meterCost: 15, vfx: "Seed Shot", sfxText: "PAT" }],
        ["vine", "蔦", ["つた", "vine", "tsuta"], { effectType: "trap", damage: 64, meterCost: 19, duration: 5.8, status: "root", vfx: "Vine Snare", sfxText: "SHURU" }],
        ["forest", "森", ["もり", "forest", "mori"], { effectType: "zone", damage: 60, meterCost: 21, duration: 6.2, vfx: "Forest Domain", sfxText: "SASA" }],
        ["rose", "薔薇", ["ばら", "rose", "bara"], { effectType: "projectile", damage: 70, meterCost: 22, status: "bleed", vfx: "Rose Lance", sfxText: "CHIK" }],
        ["cactus", "仙人掌", ["さぼてん", "cactus", "saboten"], { effectType: "barrier", damage: 36, meterCost: 20, duration: 5, status: "thorns", vfx: "Cactus Guard", sfxText: "TOKO" }],
        ["mushroom", "茸", ["きのこ", "mushroom", "kinoko"], { effectType: "summon", damage: 66, meterCost: 23, duration: 4.8, status: "poison", vfx: "Mushroom Puff", sfxText: "POFU" }]
    ]),
    ...themedSpecials("metal", {
        effectType: "projectile",
        damage: 72,
        status: "armorbreak",
        meterCost: 23,
        castTime: 0.4,
        projectile: { speed: 10.2, size: 20, color: "#c1cad6", arc: 0, pierce: 1 },
        area: { radius: 110, range: 320 },
        duration: 4.2,
        vfx: "Metal Burst",
        sfxText: "CLANG"
    }, [
        ["iron", "鉄", ["てつ", "iron", "tetsu"]],
        ["steel", "鋼", ["はがね", "steel", "hagane"], { effectType: "barrier", damage: 0, meterCost: 20, duration: 5.4, status: "guard", vfx: "Steel Plate", sfxText: "GAKIN" }],
        ["silver", "銀", ["ぎん", "silver", "gin"], { effectType: "beam", damage: 76, meterCost: 25, vfx: "Silver Ray", sfxText: "SHAAA" }],
        ["gold", "金", ["きん", "gold", "kin"], { effectType: "buff", damage: 0, meterCost: 18, duration: 6.1, status: "wealth", vfx: "Golden Flow", sfxText: "PIRIN" }],
        ["copper", "銅", ["どう", "copper", "dou"], { effectType: "projectile", damage: 64, meterCost: 19, status: "shock", vfx: "Copper Coil", sfxText: "BIP" }],
        ["chain", "鎖", ["くさり", "chain", "kusari"], { effectType: "trap", damage: 60, meterCost: 18, duration: 5.5, status: "pull", vfx: "Chain Snag", sfxText: "JARA" }],
        ["blade", "刃", ["やいば", "blade", "yaiba"], { effectType: "rush", damage: 82, meterCost: 27, vfx: "Blade Drive", sfxText: "ZAN" }],
        ["gear", "歯車", ["はぐるま", "gear", "haguruma"], { effectType: "orbit", damage: 68, meterCost: 24, duration: 5.2, vfx: "Gear Orbit", sfxText: "GIRN" }]
    ]),
    ...themedSpecials("animal", {
        effectType: "summon",
        damage: 74,
        status: "bleed",
        meterCost: 24,
        castTime: 0.44,
        projectile: { speed: 10, size: 24, color: "#ffb571", arc: 0, pierce: 0 },
        area: { radius: 120, range: 300 },
        duration: 4.6,
        vfx: "Beast Rush",
        sfxText: "ROAR"
    }, [
        ["cat", "猫", ["ねこ", "cat", "neko"], { effectType: "summon", damage: 70, meterCost: 22, vfx: "Cat Parade", sfxText: "NYAN" }],
        ["dog", "犬", ["いぬ", "dog", "inu"], { effectType: "rush", damage: 72, meterCost: 22, vfx: "Hound Lunge", sfxText: "WAN" }],
        ["tiger", "虎", ["とら", "tiger", "tora"], { effectType: "rush", damage: 84, meterCost: 28, vfx: "Tiger Pounce", sfxText: "GAOO" }],
        ["wolf", "狼", ["おおかみ", "wolf", "ookami"], { effectType: "summon", damage: 78, meterCost: 25, vfx: "Wolf Pack", sfxText: "AOOO" }],
        ["rabbit", "兎", ["うさぎ", "rabbit", "usagi"], { effectType: "buff", damage: 0, meterCost: 15, duration: 6.2, status: "haste", vfx: "Rabbit Step", sfxText: "PYON" }],
        ["snake", "蛇", ["へび", "snake", "hebi"], { effectType: "projectile", damage: 68, meterCost: 20, status: "poison", vfx: "Snake Fang", sfxText: "SHA" }],
        ["dragon", "竜", ["りゅう", "dragon", "ryuu"], { effectType: "beam", damage: 90, meterCost: 30, castTime: 0.55, status: "burn", vfx: "Dragon Breath", sfxText: "GRAAA" }],
        ["fox", "狐", ["きつね", "fox", "kitsune"], { effectType: "counter", damage: 64, meterCost: 19, duration: 4.2, vfx: "Fox Mirage", sfxText: "KON" }]
    ]),
    ...themedSpecials("food", {
        effectType: "projectile",
        damage: 56,
        status: "stagger",
        meterCost: 17,
        castTime: 0.32,
        projectile: { speed: 9.3, size: 22, color: "#ffca7a", arc: 0, pierce: 0 },
        area: { radius: 112, range: 280 },
        duration: 4.4,
        vfx: "Kitchen Crash",
        sfxText: "POW"
    }, [
        ["sushi", "寿司", ["すし", "sushi", "susi"], { effectType: "projectile", damage: 64, meterCost: 18, shots: 3, vfx: "Sushi Spinner", sfxText: "KURUN" }],
        ["ramen", "拉麺", ["らーめん", "ramen", "raamen"], { effectType: "rain", damage: 66, meterCost: 22, duration: 4.6, status: "slow", vfx: "Noodle Downpour", sfxText: "ZURU" }],
        ["curry", "咖喱", ["かれー", "curry", "karee"], { effectType: "zone", damage: 58, meterCost: 18, duration: 5.2, status: "burn", vfx: "Curry Swamp", sfxText: "TORO" }],
        ["coffee", "珈琲", ["こーひー", "coffee", "koohii"], { effectType: "buff", damage: 0, meterCost: 14, duration: 6, status: "haste", vfx: "Caffeine Surge", sfxText: "GOKU" }],
        ["cake", "ケーキ", ["けーき", "cake", "keeki"], { effectType: "heal", damage: 0, meterCost: 16, duration: 0, vfx: "Sweet Recovery", sfxText: "FUWA" }],
        ["soda", "炭酸", ["たんさん", "soda", "tansan"], { effectType: "beam", damage: 60, meterCost: 19, status: "shock", vfx: "Soda Blast", sfxText: "SHUWA" }],
        ["honey", "蜂蜜", ["はちみつ", "honey", "hachimitsu"], { effectType: "trap", damage: 48, meterCost: 16, duration: 5.8, status: "slow", vfx: "Honey Trap", sfxText: "NETTO" }],
        ["pepper", "胡椒", ["こしょう", "pepper", "koshou"], { effectType: "rain", damage: 62, meterCost: 20, duration: 4.2, status: "blind", vfx: "Pepper Storm", sfxText: "HACK" }]
    ]),
    ...themedSpecials("emotion", {
        effectType: "buff",
        damage: 0,
        status: "focus",
        meterCost: 16,
        castTime: 0.3,
        projectile: { speed: 8, size: 20, color: "#ff8ec0", arc: 0, pierce: 0 },
        area: { radius: 110, range: 300 },
        duration: 6,
        vfx: "Heart Pulse",
        sfxText: "THUMP"
    }, [
        ["joy", "喜び", ["よろこび", "joy", "yorokobi"], { effectType: "heal", duration: 0, meterCost: 15, vfx: "Joy Bloom", sfxText: "HAHA" }],
        ["anger", "怒り", ["いかり", "anger", "ikari"], { effectType: "buff", damage: 0, meterCost: 16, duration: 6.4, status: "rage", vfx: "Anger Drive", sfxText: "GRRR" }],
        ["sorrow", "悲しみ", ["かなしみ", "sorrow", "kanashimi"], { effectType: "zone", damage: 50, meterCost: 17, duration: 5.6, status: "slow", vfx: "Blue Drizzle", sfxText: "SHIN" }],
        ["love", "愛", ["あい", "love", "ai"], { effectType: "barrier", damage: 0, meterCost: 18, duration: 5.1, status: "regen", vfx: "Love Shield", sfxText: "PON" }],
        ["fear", "恐れ", ["おそれ", "fear", "osore"], { effectType: "trap", damage: 54, meterCost: 18, duration: 5.2, status: "weaken", vfx: "Fear Field", sfxText: "ZOWA" }],
        ["laugh", "笑い", ["わらい", "laugh", "warai"], { effectType: "beam", damage: 58, meterCost: 18, status: "stagger", vfx: "Laugh Wave", sfxText: "WAHAHA" }],
        ["dream", "夢", ["ゆめ", "dream", "yume"], { effectType: "counter", damage: 62, meterCost: 19, duration: 4.2, vfx: "Dream Slip", sfxText: "FUWARI" }],
        ["courage", "勇気", ["ゆうき", "courage", "yuuki"], { effectType: "rush", damage: 74, meterCost: 23, vfx: "Courage Break", sfxText: "ORA" }]
    ]),
    ...themedSpecials("concept", {
        effectType: "time",
        damage: 62,
        status: "fracture",
        meterCost: 22,
        castTime: 0.44,
        projectile: { speed: 9, size: 24, color: "#8cc8ff", arc: 0, pierce: 1 },
        area: { radius: 120, range: 330 },
        duration: 5.4,
        vfx: "Concept Shift",
        sfxText: "ZNNN"
    }, [
        ["time", "時間", ["じかん", "time", "jikan"], { effectType: "time", damage: 52, meterCost: 20, duration: 4.4, status: "slow", vfx: "Time Stop Ripple", sfxText: "TIK" }],
        ["space", "空間", ["くうかん", "space", "kuukan"], { effectType: "teleport", damage: 70, meterCost: 23, vfx: "Space Fold", sfxText: "BLIK" }],
        ["zero", "零", ["ぜろ", "zero", "zero"], { effectType: "beam", damage: 76, meterCost: 24, status: "drain", vfx: "Zero Slash", sfxText: "VOID" }],
        ["logic", "論理", ["ろんり", "logic", "ronri"], { effectType: "counter", damage: 68, meterCost: 20, duration: 4.2, status: "analyze", vfx: "Logic Guard", sfxText: "CLICK" }],
        ["chaos", "混沌", ["こんとん", "chaos", "konton"], { effectType: "rain", damage: 82, meterCost: 28, duration: 4.8, status: "curse", vfx: "Chaos Storm", sfxText: "GYAAN" }],
        ["gravity", "重力", ["じゅうりょく", "gravity", "juuryoku"], { effectType: "zone", damage: 64, meterCost: 22, duration: 5, status: "pull", vfx: "Gravity Well", sfxText: "DOOM" }],
        ["echo", "残響", ["ざんきょう", "echo", "zankyou"], { effectType: "orbit", damage: 60, meterCost: 19, duration: 5.2, vfx: "Echo Ring", sfxText: "YAAA" }],
        ["memory", "記憶", ["きおく", "memory", "kioku"], { effectType: "buff", damage: 0, meterCost: 17, duration: 6, status: "focus", vfx: "Memory Stack", sfxText: "PING" }]
    ]),
    ...themedSpecials("daily", {
        effectType: "wall",
        damage: 52,
        status: "stagger",
        meterCost: 16,
        castTime: 0.32,
        projectile: { speed: 8, size: 22, color: "#d2d2d2", arc: 0, pierce: 0 },
        area: { radius: 116, range: 270 },
        duration: 5.2,
        vfx: "Daily Impact",
        sfxText: "BONK"
    }, [
        ["wall", "壁", ["かべ", "wall", "kabe"], { effectType: "wall", damage: 48, meterCost: 18, duration: 6.2, vfx: "Wall Raise", sfxText: "DAN" }],
        ["clock", "時計", ["とけい", "clock", "tokei"], { effectType: "time", damage: 54, meterCost: 17, duration: 4.8, status: "slow", vfx: "Clock Freeze", sfxText: "TICK" }],
        ["umbrella", "傘", ["かさ", "umbrella", "kasa"], { effectType: "barrier", damage: 0, meterCost: 15, duration: 5, status: "guard", vfx: "Umbrella Guard", sfxText: "PASA" }],
        ["book", "本", ["ほん", "book", "hon"], { effectType: "projectile", damage: 58, meterCost: 16, vfx: "Book Shot", sfxText: "PATA" }],
        ["key", "鍵", ["かぎ", "key", "kagi"], { effectType: "beam", damage: 64, meterCost: 18, status: "armorbreak", vfx: "Unlock Beam", sfxText: "CHAKI" }],
        ["cup", "コップ", ["こっぷ", "cup", "koppu"], { effectType: "projectile", damage: 56, meterCost: 16, shots: 2, projectile: { speed: 9.5, size: 20, color: "#b8f1ff" }, vfx: "Cup Barrage", sfxText: "KON" }],
        ["chair", "椅子", ["いす", "chair", "isu"], { effectType: "summon", damage: 72, meterCost: 22, duration: 4.2, vfx: "Chair Slam", sfxText: "GATAN" }],
        ["phone", "電話", ["でんわ", "phone", "denwa"], { effectType: "trap", damage: 50, meterCost: 16, duration: 5.8, status: "shock", vfx: "Call Field", sfxText: "RING" }]
    ])
];

window.SPECIAL_LEXICON = SPECIAL_LEXICON;
