from pathlib import Path
import json, hashlib, datetime
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'assets/production/animation-expansion'
DATA=json.loads((ROOT/'expedition/data.js').read_text().split('=',1)[1].rstrip(';\n'))
# Hand-authored placements, measured on the ACTUAL final background composite, 1672 x 941.
# Fields: Japanese name | English object / motion brief | x,y,w,h | surface
S={
1: '''江戸ガラスの風鈴|A small clear glass wind bell with a blue wave pattern and pale paper tail, bell and tail swinging gently from a fixed top hook|238,81,30,56|eave
祭りの三角小旗|A short cord of three red cream and gold triangular pennants, fabric rippling gently, both cord endpoints fixed|579,256,68,30|eave
竹の二重風車|A tiny bamboo toy pinwheel on a short stem, six red and gold folded paper vanes rotating around a stable hub|1530,386,30,48|planter
茶庭の湯気|Two fine curling wisps of warm tea steam, translucent and soft, no cups or table, rising and fading in place|967,698,37,45|table
噴水の細かい飛沫|Fine curved droplets and soft spray from a small daylight fountain, transparent gaps, no fountain structure or water disk|625,537,72,44|water
水車の落ち水しぶき|A narrow pale aqua falling-water spray with foamy droplets at the bottom, no wheel or solid water background|1461,155,63,48|water
鯉の池の波紋|Three delicate oval concentric water ripples with tiny gold reflected glints, spreading and fading, no fish or solid disk|1214,344,70,30|water
船着場のきらめき|Sparse turquoise and white reflected sunlight glints on a shallow canal, changing irregularly, no opaque water patch|386,854,41,17|water
桜の花びらの舞|A loose cluster of six pale pink cherry blossom petals gently tumbling in a tiny breeze loop, no tree or ground|1112,548,65,64|air
柳の綿毛|Four tiny cream willow seed tufts drifting in a soft oval eddy, no branches or ground, slow delicate motion|678,813,55,55|air
屋台のしゃぼん玉|Five small iridescent soap bubbles of unequal sizes slowly rising and dissolving, restrained highlights, no wand|360,466,45,65|air
回廊の房飾り|A decorative gold and crimson festival tassel on a short loop, threads swaying with slight delay, stable attachment at top|824,351,24,43|eave''',
2: '''温室のガラス風鈴|A small green glass flower bell with a leaf-shaped paper tail, swaying gently on a fixed hanging loop|177,97,27,52|eave
ガゼボの花リボン|A lavender satin bow with two loose ends tied to a fixed floral gazebo beam, ends flutter asynchronously|692,102,41,39|eave
苗売り場の蝶形風車|A tiny butterfly-shaped garden spinner on a thin wooden stake, wings turn slowly around the hub|1367,738,38,53|planter
庭カフェの湯気|A pair of very thin fragrant tea wisps, curling upwards and fading, no teapot or cup|1546,521,32,40|table
花噴水の霧|Fine translucent aqua mist and little droplets in a shallow arc, no fountain or opaque base|845,451,65,42|water
滝壺の泡|Small white foam crescents and scattered clear bubbles above an oval blue-green pond, no rocks or opaque pond|270,511,69,36|water
睡蓮池の輪|Two delicate oval ripple rings passing one another around clear gaps, no plants or solid water|619,266,63,29|water
雨上がりの葉しずく|Three bright clear drops dripping from a fixed short green leaf tip, leaf tip stationary, no branch or pot|995,132,28,47|planter
ローズアーチの花びら|Five soft crimson and blush rose petals swirling gently then returning to a seamless airy loop|1335,444,58,55|air
藤棚の花の房|A short cluster of lavender wisteria blossoms with a few tiny leaves, its stem fixed at the top while florets sway|1125,753,36,65|eave
養蜂庭の綿毛|Tiny golden pollen motes and two pale seed tufts floating above a flower bed, no insects or ground|216,791,63,45|air
温室の小さな換気羽根|A compact freestanding mint and brass desk fan with a circular protective cage, visible softly rotating blades, fixed base|1539,203,36,42|table''',
3: '''港の吹き流し|A small weathered blue and white striped fabric windsock attached to a fixed short bracket, opening stable and tail billowing|927,178,61,33|eave
魚屋の暖簾|A very short pair of indigo fabric streamers on a fixed horizontal cord, subtle wave emblem without letters, fluttering ends|67,143,43,38|eave
貝のウインドチャイム|Three small pearly shells hanging from a driftwood twig, each sways at a different delay, top hook fixed|1484,501,35,58|eave
焼き魚の湯気|Thin white fragrant steam from a grill, curling upwards in three uneven wisps, no grill or food|411,692,53,47|table
桟橋のさざ波|Pale aqua foam arcs and pinprick sun glints, oval ripple cycle, no boat or opaque sea|316,61,76,31|water
灯台下の波しぶき|A small white foamy wavelet rising and breaking softly, no rocks or sea surface rectangle|1142,113,72,39|water
牡蠣いけすの泡|A small cluster of clear water bubbles surfacing into thin rings, no tank or animal|1177,842,50,37|water
浜辺の潮の線|A shallow delicate foamy crescent that rolls forward slightly and recedes within the same frame, no sand background|121,839,83,35|water
カモメの羽|Two loose white and gray seabird feathers slowly tumbling, no bird or background|1490,75,45,49|air
帆具店の結び紐|A short sea-green pennant and two knotted cream rope ends suspended from a fixed upper loop, swaying in salt wind|1488,759,38,55|eave
市場のシャボン玉|Four small transparent turquoise-tinted soap bubbles floating upwards, burst into tiny droplets at loop midpoint|900,458,48,58|air
漁具屋の小風車|A little nautical signal-wheel toy with four multicolored triangular cloth sails, rotating on a fixed tiny brass stand|541,709,38,45|table''',
4: '''キャンディ風鈴|A clear candy-shaped glass wind bell with pink ribbon tail, suspended on fixed hook and swaying softly|114,135,30,49|eave
ショコラ屋のリボン|A brown and gold satin gift bow fixed at its center, two long ends flutter in a small breeze, no box|1308,428,46,38|eave
ケーキ屋の回転飾り|A tiny decorative cupcake pinwheel on a short pastel stand, frosting-shaped vanes rotate steadily|566,470,33,44|table
焼き菓子の香り|Two soft irregular curls of warm white bakery steam, no food or oven, rising and dissipating|1164,748,45,46|table
ケーキ噴水の飛沫|A crown of fine clear aqua fountain droplets with faint pink reflections, no cake or fountain base|837,484,78,38|water
小運河の波紋|Two thin oval ripple rings with pastel reflected highlights, no solid water shape|1467,280,58,27|water
砂糖菓子のきらめき|A handful of soft pearly sugar motes drifting above a confectionery tray, no tray or food, no flashing stars|106,193,39,36|table
ホットココアの湯気|A small warm cream-colored steam curl, very transparent, no cup or saucer|1020,859,28,37|table
桃色花びら|Five heart-like pink blossom petals gently tumbling in a confined breeze, organic soft edges|1028,115,57,58|air
パティスリーの紙モビール|A tiny three-tier pastry-shaped paper mobile with no letters, top thread fixed, ornaments gently sway|304,112,36,53|eave
飴売り場のしゃぼん玉|Small unequal iridescent soap bubbles with pale peach highlights, float and dissolve|574,348,46,59|air
お菓子屋のレース飾り|A short scalloped cream lace strip on fixed upper cord, lower scallops flutter slightly, no wall or frame|607,91,65,29|eave''',
5: '''本屋のしおりモビール|Three little paper bookmarks with simple gold leaf patterns, no lettering, hanging from one fixed twig and fluttering|122,130,34,49|eave
図書館の房飾り|A burgundy and gold silk bookmark tassel hanging from a fixed top loop, fine threads gently sway|896,136,23,49|eave
読書カフェの湯気|A gentle loop of two warm tea wisps, no cup or table, rise and fade|1306,163,35,42|table
古書店の小風車|A tiny folded-paper pinwheel made of cream paper with abstract sepia marks but no readable text, turns on a wooden stand|709,780,34,43|table
本の噴水のしぶき|Small clear water droplets and fine mist with daylight highlights, no stone book or fountain|831,476,66,45|water
秋の池の輪|Oval ripple rings with a few reflected gold points, no leaves or solid water disk|1360,126,57,29|water
印刷工房の紙の端|A short cream ribbon of blank paper on a compact spindle, paper end gently flips back and forth, fixed spindle|209,791,43,37|table
窓辺の羽ペン|A small white and amber decorative feather quill in a tiny brass holder, feather bends softly in breeze|1503,417,22,45|table
いちょうの葉の舞|Five golden ginkgo leaves fluttering down and circling gently, no tree or ground|1042,396,69,66|air
紅葉の葉の舞|Five distinct orange and russet maple leaves turning in a slow airy eddy, no branches|325,467,63,62|air
書棚のほこり光|A subtle cluster of warm dust motes moving slowly in a tiny patch of light, no rays or opaque glow square|74,393,39,45|air
園路のどんぐり風鈴|Two acorn-shaped wooden bells with short forest-green ribbon suspended on fixed twig, tiny gentle swings|1169,705,31,49|eave''',
6: '''雪の木鈴|Three carved wooden snowflake bells tied to a red ribbon, fixed upper loop, quiet irregular swaying|222,96,32,54|eave
毛糸屋のミトン飾り|A little pair of cream wool mittens on a red hanging cord, swaying softly, fixed top loop|506,701,40,51|eave
カフェのマグの湯気|Two thick but translucent warm white steam curls, no mug or table, slow rise and dissolve|1042,730,38,48|table
雪市の紙風車|A small ice-blue and white star paper pinwheel on a short wooden stem, smooth rotation around stable hub|96,399,35,49|planter
凍らない水路の小波|Very small icy blue ripples and white reflected glints, no opaque water, no ice sheet|269,750,65,30|water
水車の冷たい飛沫|Fine blue-white splashes and tiny foam flecks, no wheel or river background|1548,117,56,39|water
つららのしずく|A single slim clear icicle with a hanging water drop that falls and reforms, fixed at top|1116,664,20,54|eave
暖炉の煙|Soft pale gray smoke puff curling up gently, no chimney, flames or solid background|360,403,43,60|roof
小雪の舞|Six distinct tiny snowflakes drifting in a slow loop with varied spacing, no cloud or fog|682,582,70,76|air
松枝の粉雪|A sparse little puff of fine powdered snow falling and dispersing, no tree or branch|69,657,60,56|air
赤い冬の小旗|Three little red and cream triangular bunting flags on a fixed cord, softly rippling rather than stiff rotation|979,405,73,30|eave
氷のきらめき|A few soft reflected white and cyan glints sliding along a flat icy surface, no solid disk and no flashing effect|626,139,77,30|water''',
7: '''星の風鈴|A small gold star-shaped wind bell with indigo paper tail, swinging softly from fixed upper hook|132,97,30,53|eave
夜店の流れ房|A short crimson and gold festival tassel with three silk ends, stable attachment at top, swaying|529,294,25,49|eave
灯籠の炎|A small warm amber candle flame with restrained halo, flickers gently without flashing, no lantern casing|662,422,18,29|eave
団子屋の湯気|A thin loop of white warm steam in two curled wisps, no food or pot|1334,709,39,50|table
星映る池の輪|Two fine oval aqua ripple rings with sparse warm gold glints, no pond or fish|443,769,64,27|water
夜の滝のしぶき|Fine bluish transparent mist and droplets, no rocks, wheel or solid water surface|839,181,60,45|water
橋下の水面光|Soft elongated lantern reflections broken into three gentle moving gold strokes, no solid black or blue patch|1038,284,55,29|water
ランタンの小光|A handful of very faint firefly-like golden motes gently brightening and dimming asynchronously, no insect bodies|791,383,52,42|air
桜の夜の花びら|Four pale pink blossom petals softly drifting and turning, a little warm edge light, no branches|275,807,61,61|air
星祭りの紙モビール|Three tiny indigo and gold paper stars on hanging strings, top bar fixed, stars sway with slight delay|1525,381,38,58|eave
天文台の回転飾り|A small brass three-ring armillary ornament rotating slowly on a stable tabletop base, no glow or scenery|1053,802,38,45|table
楽屋の揺れるリボン|Two long midnight-blue silk ribbons on a gold knot, knot fixed, ribbons flutter gently|1552,810,40,53|eave''',
8: '''温泉宿の風鈴|A small smoky green glass wind bell and linen paper tail, gentle uneven swaying on fixed top hook|476,275,28,50|eave
湯の町の暖簾飾り|Three narrow indigo cloth ribbons with simple wave symbols without words on a fixed cord, lower ends ripple|1004,243,51,41|eave
洗濯庭のタオル|A single small white cotton towel clipped along its top edge to a short cord, cloth billows gently, no existing laundry duplicated|1137,568,50,49|eave
蒸し饅頭の湯気|Three warm translucent white curls rising from an unseen steaming basket, no basket or food|300,616,51,59|table
露天風呂の湯けむり|A low drifting wisp of hot spring steam with transparent edges, rolling locally without opaque fog or bath structure|874,156,84,57|water
足湯のゆらぎ|Delicate turquoise oval ripples and a faint steam wisp, no basin or solid water background|1391,611,64,38|water
川石のしぶき|A small spray of white water droplets and foamy crescents, no rocks or river rectangle|848,839,73,44|water
木の湯桶のしずく|A few clear water drops with pale blue reflections falling and dispersing, no bucket, no ground|1061,650,27,42|water
坂のもみじ|Five orange red maple leaves tumbling in a slow mountain breeze, no branches|1217,342,65,67|air
里山の綿毛|Four small fluffy cream seed heads drifting with irregular spacing, no plants|261,77,54,55|air
茶処の竹風車|A compact hand-carved bamboo garden spinner on a short stake, blades rotate slowly, stable support|1448,734,37,49|planter
宿の軒先のしずく|Three fine clear raindrops gathering beneath a short leaf-shaped copper rain-chain segment, gentle drip loop|1090,499,26,54|eave''',
9: '''駅の合図小旗|A compact pair of blue and cream railway pennants on a fixed short cord, cloth ripples gently, no letters|743,151,64,30|eave
駅カフェの湯気|Fine warm coffee steam rising in two irregular curls, no cup or table|294,513,34,46|table
荷物窓口の小扇風機|A tiny brass and sage desk fan with protective cage and stable base, blades rotate smoothly|1010,640,36,42|table
花売り場のリボン|A tied blue satin bouquet ribbon, bow center fixed and loose ends fluttering, no bouquet|1096,338,39,41|planter
駅前噴水の水しぶき|Fine clear curved fountain droplets and transparent spray, no stone fountain or disk|833,329,69,41|water
蒸気機関庫の排気|A small pale gray steam plume cycling upwards, no locomotive or chimney, soft dissipating top|234,213,46,61|roof
整備工房の歯車玩具|A small brass flywheel demonstration on a short dark green tabletop plinth, wheel turns steadily, no workshop background|1268,581,37,44|table
駅弁の温かな湯気|A tiny warm translucent steam puff from an unseen meal, no food or box|158,661,35,37|table
並木の葉|Five small fresh green leaves fluttering in a gentle eddy, no branches|1141,719,60,62|air
ホームの紙テープ|Two narrow cream and blue fabric streamers fastened to a single fixed short bracket, tails gently sway|1415,158,29,55|eave
郵便カウンターの羽飾り|A decorative little copper pigeon weather vane on a short tabletop stand, rotates a few degrees back and forth, not a live bird|633,597,38,42|table
駅ホールの光の粒|Sparse warm dust motes floating slowly within transparent space, no beams, floor or solid glow patch|827,136,47,57|air''',
10: '''運河の細いペナント|Three navy and cream canal-festival pennants on a fixed narrow cord, gentle rippling cloth|831,163,71,31|eave
船大工の風鈴|Three small copper chimes hung from a tiny driftwood bar, top loop fixed, chimes sway with delay|365,439,34,54|eave
運河カフェの湯気|A delicate white tea steam curl splitting and fading, no cup or table|1390,241,36,46|table
窓辺の吊りリボン|A narrow emerald ribbon bow tied at the top with two fluttering ends, no window frame|908,477,33,47|eave
水門の泡の列|A narrow stream of soft white foamy bubbles churning gently, no gate or opaque water patch|837,134,61,49|water
橋脚まわりの波紋|Thin oval ripples expanding around a clear center, blue and warm gold reflections, no pier|824,777,68,29|water
造船所の水しぶき|A few short arcs of translucent water droplets with a small foam crescent, no boat or shoreline|281,533,60,38|water
南の運河のきらめき|Sparse daylight glints moving in small irregular horizontal patterns on transparent ground, no water disk|1451,852,79,32|water
ヤナギの葉の舞|Five narrow fresh green willow leaves drifting down and circling, no branch|1183,169,53,61|air
水都の紙風車|A little nautical blue and yellow paper pinwheel on a short brass stand, smoothly rotating vanes|1577,272,37,45|table
画家の彩色モビール|Three tiny painted wooden color disks hanging on a fixed short string, gently swaying, no letters or palette|995,479,28,52|eave
造船所の縄の房|A short decorative sailor-knot tassel made of cream rope, fixed top loop, fiber ends sway softly|143,551,28,47|eave''',
11: '''収穫の麦飾り|A small tied sheaf of golden wheat suspended by a fixed green ribbon, grain heads sway gently|142,192,37,53|eave
果樹園の吹き流し|A short orange and cream striped fabric windsock on a fixed hook, soft billowing motion|792,105,59,30|eave
農家カフェの湯気|Two curls of warm herbal tea steam, no cup or table, drift up and fade|790,536,35,44|table
納屋の風車飾り|A small red and cream wooden pinwheel on a short stable tabletop support, slowly spinning vanes|1543,235,36,45|table
水車のはねる水|Small aqua droplets and white froth in a narrow arc, no wheel or stone wall|1335,581,75,51|water
畑の散水しずく|A fine low arc of clear irrigation droplets cycling across a small bed-sized gap, no hose or ground|214,187,71,34|planter
りんご畑の花びら|Four pale apple blossom petals with one small green leaf softly circling in a breeze, no tree|1015,293,59,56|air
牧草の穂の綿毛|Five pale cream grass seeds floating slowly with irregular spacing, no stems or soil|201,570,64,55|air
収穫祭のリボン|A small fan of five colorful thin ribbons fastened at the same upper point, tails flutter at different delays|840,728,43,55|eave
干しハーブの束|A tiny hanging bundle of sage and lavender tied with linen, fixed top and gently swaying stems|445,476,31,49|eave
焼きとうもろこしの湯気|Thin white steam curls with faint warm tint, no corn or grill, soft intermittent loop|688,753,40,43|table
南川の金色の光|Sparse golden sunlight glints in an oval area, no opaque water or ground, gentle changing pattern|395,909,73,30|water''',
12: '''遊園地の星風車|A small gold and blue star-shaped toy pinwheel on a short stable stem, smooth rotation|445,181,38,52|planter
チケット屋の小旗|Three striped pastel pennants on a fixed short cord, fabric rippling in a soft breeze|1206,107,63,29|eave
観覧車の追加リボン|A tiny gold bow with two royal-blue ribbon ends, bow tied at a fixed point and tails flutter gently, no ferris wheel|890,201,35,48|eave
お菓子屋の湯気|Two thin cream steam wisps from an unseen warm snack, no food or stall|1335,226,40,48|table
水遊びの飛沫|A small crown of clear cyan water droplets splashing up and falling, no pool or solid water background|858,543,77,46|water
入園口の噴水霧|A fine pale aqua fountain spray with transparent wispy edges, no basin|355,756,69,46|water
水路の虹色泡|Five tiny transparent bubbles drifting above faint oval water ripples, no solid disk|1346,897,66,43|water
カップ噴水の落水|A narrow ribbon of translucent falling water breaking into droplets, no cup or metal structure|907,463,41,65|water
劇場の紙吹雪|Seven small red blue and gold confetti pieces slowly tumbling in a compact loop, no stage or people|292,541,59,67|air
メリーゴーラウンドの房|A small crimson and golden fairground tassel hanging from a fixed top loop, silk ends sway, no carousel|354,199,25,44|eave
売店の虹モビール|A tiny arc of pastel wooden beads with dangling little stars, fixed hook, gentle asynchronous sway|1507,440,47,50|eave
雲形の風船飾り|A tiny white cloud-shaped helium balloon with a long gold string fixed at the bottom, subtly bobbing, no bunch or scenery|563,798,49,65|air''',
13: '''温室の葉形風鈴|A small translucent emerald leaf bell with a short cream tail, fixed upper hook, gentle wind swing|870,87,29,54|eave
飼育舎の木のモビール|Three carved wooden leaf shapes hanging from a twig, stable top attachment, unequal slow sway|1466,229,39,54|eave
カフェの湯気|Thin white fragrant tea steam, no cup or table, curls upwards and dissolves|1465,589,38,46|table
観察小屋の風車|A tiny green and sunflower-yellow wind spinner on a short stick, smooth slow rotation, fixed base|1175,176,37,49|planter
水鳥池のさざ波|Three fine oval aqua ripple rings expanding and disappearing, no bird or opaque pool|819,514,74,31|water
岩場の小さな霧|Fine translucent water mist and a few glinting droplets, no rocks or waterfall body|883,421,65,49|water
飼育園の散水|A thin low fan of clear water droplets with an intermittent sprinkling cycle, no sprinkler head, no ground|231,454,64,40|planter
南の川の泡|A few light white foam arcs and bubbles rolling gently, no shore or opaque water|1473,808,66,35|water
森の綿毛|Five tiny pale seed tufts floating at different heights, no plants, soft slow loop|554,143,66,67|air
熱帯の落ち葉|Four broad fresh green and pale yellow leaves gently twisting in an eddy, no branches|1008,682,61,59|air
巣箱の羽飾り|A little hanging ornament of three cream feathers and a wooden bead, fixed at top, slight swaying|416,107,29,51|eave
飼料室の卓上ファン|A compact sage green caged fan on a short stable base, visible blades rotating steadily, no furniture|1382,460,36,43|table''',
14: '''映画館のフィルム飾り|A small short loop of cream film leader with dark square perforations but no text, hangs from fixed top and flutters softly|971,276,31,51|eave
衣装室のリボン|A rose-red satin bow and two long tails pinned at the center, tails gently ripple, no costume|1305,122,38,51|eave
小道具室の紙風車|A tiny silver and turquoise paper pinwheel on a short stable black stand, turning smoothly|410,559,36,44|table
カフェのコーヒー蒸気|Two thin pale coffee steam curls rising from unseen cup, no cup or tabletop|1307,599,34,44|table
噴水セットの飛沫|Fine clear water droplets in a shallow arc, no fountain or scenery|838,267,58,37|water
海賊セットの霧|A small wispy patch of low theatrical sea mist with transparent edges, no boat or backdrop|239,544,77,41|table
蒸気撮影機の煙|A soft pale gray plume from an unseen little smoke machine, rising and dissipating, no machine or floor|111,398,44,66|roof
特殊効果の泡|Four transparent soap bubbles reflecting pale violet and blue studio light, gently rise and vanish, no bubble gun|924,464,48,57|air
西部劇の風の葉|Five small dry russet leaves tumbling slowly in an airy loop, no dust cloud or ground|248,237,61,61|air
楽屋の星モビール|Three little gold wooden stars hanging from fixed black crossbar, a gentle backstage sway, no text|1557,154,36,51|eave
舞台照明の散光|A restrained sparse cluster of warm dust motes in transparent space, no opaque beam or flashing spotlight|1405,444,55,60|air
フィルム巻き取り模型|A miniature brass film reel demonstration on a stable black tabletop base, reel slowly rotating, no projector beam or text|988,453,37,41|table''',
15: '''飛行港の吹き流し|A small blue cream and gold fabric windsock on a fixed bracket, slowly billowing with irregular folds|959,110,61,34|eave
空港カフェの湯気|Two slender warm white coffee wisps rising and dissolving, no cup or table|1032,478,37,43|table
気球工房のリボン|A gold knot with two long royal-blue silk ribbons, upper knot fixed, tails flutter gently|211,516,37,58|eave
格納庫の小回転模型|A little brass four-blade propeller model on a stable navy tabletop base, blades rotate around fixed horizontal hub|1437,618,39,44|table
雲の白いほころび|A small fluffy white wisp of cloud, edges slowly curl and dissolve with transparent gaps, no blue sky background|292,836,84,56|air
係留ロープの房|A small cream rope tassel with a brass ring fixed at top, fibers gently sway in high air|1471,149,28,49|eave
庭噴水の水滴|A small fine spray of pale blue fountain droplets, no basin or opaque water|828,661,64,40|water
蒸気機関の排気|A gentle pale steam puff curling upwards, no exhaust pipe or ship, fine transparent edges|646,213,43,61|roof
港の綿毛|Four tiny white seed tufts floating in a small circling current, no plants or birds|425,703,59,64|air
気球屋の星モビール|Three tiny gold and sky-blue stars strung from a fixed short crossbar, slow soft sway|478,447,37,53|eave
貨物窓口の扇風機|A small brass desk fan with navy cage and fixed base, softly rotating internal blades|1453,207,36,42|table
浮遊庭の三角旗|A short trio of blue cream and gold bunting pennants on a fixed thin cord, gently rippling|1037,613,68,29|eave''',
16: '''天文展示の小模型|A small brass ringed-planet orrery on a fixed teal plinth, two little orbiting spheres turn slowly, no room or glass case|1480,204,44,45|table
閲覧室の羽ペン|A small cream feather quill in a dark green glass inkwell, feather flexes gently in the breeze, base fixed|406,489,27,47|table
博物館の花リボン|A small ivory and turquoise ribbon bow fixed in the center, two tails gently flutter, no flower bouquet|1050,102,39,45|planter
カフェの湯気|Two very thin translucent tea wisps, soft rising and dissipating loop, no cup|363,814,35,43|table
中庭の水しぶき|Fine aqua fountain mist and tiny transparent droplets, no statue or stone fountain|831,540,67,45|water
温室の葉しずく|One small green leaf tip with tiny water droplets gathering and falling, leaf tip fixed at top, no branch|1035,439,26,49|planter
復元工房のほこり|A few faint warm dust motes drifting slowly above an unseen work surface, no tools or background|1371,501,43,45|table
科学室の小さな煙|A very fine pale lavender demonstration vapor plume, no flask or laboratory table|1505,252,32,47|table
秋の中庭の葉|Five soft gold and green leaves floating in a gentle looping eddy, no branches or ground|668,450,62,62|air
吊り下げ惑星の飾り|A tiny decorative mobile of three jewel-colored spheres on a fixed gold crossbar, gentle asynchronous sway|1613,147,40,51|eave
展示のプリズム光|Three delicate pastel glints moving slowly on transparent space, no flashing stars, prism or opaque glow|1313,290,36,39|table
機械展示の振り子模型|A tiny brass pendulum on a dark teal tabletop A-frame, bob swings gently from side to side, complete fixed base|920,769,38,48|table''',
17: '''工房の銅風鈴|Three tiny copper bell tubes on a short brass crossbar, stable top hook, irregular gentle swaying|711,142,34,56|eave
時計屋の歯車モビール|Three small brass gear shapes suspended on thin cords from fixed bar, gently sway independently, no clock face|301,320,36,55|eave
自転車店の小風車|A tiny miniature blue bicycle-wheel spinner on a stable wooden tabletop base, wheel rotates smoothly|1000,560,36,42|table
茶房の湯気|Two fine white tea steam curls rising and fading, no teapot or cup|1371,646,35,45|table
運河の小さな波|Delicate oval water ripple rings with warm gold reflections, no boat or opaque water|911,862,70,29|water
鋳物工房の蒸気|A small pale gray steam plume rising in uneven curls, no furnace or chimney, no flame|894,109,42,65|roof
硝子工房の熱のゆらぎ|A subtle translucent warm haze mixed with two tiny vapor wisps, no furnace or objects, restrained movement|1236,272,37,51|table
木工房の紙くず|Four tiny pale wood shavings lightly fluttering within a small loop, no wood block or tools|229,586,43,41|table
歯車庭の旗|A short cord of three deep blue and golden pennants, plain simple patterns without words, slight cloth rippling|1398,561,67,30|eave
乾燥台のハーブ|A tiny bundle of green and gray herbs suspended by fixed cream ribbon, stems sway with small delay|159,590,29,46|eave
窓辺の回転小模型|A little brass two-vane wind toy with a copper sphere on a stable square base, slow turn, no large machinery|1491,245,35,47|table
並木の種の舞|Four small cream and pale green seed pods gently circling in a slow breeze, no branches|1050,364,56,57|air''',
18: '''砂漠の布飾り|A short turquoise and gold silk ribbon tied to a fixed ring, two ends flutter softly in dry wind|226,211,33,51|eave
絨毯屋の房|A tiny burgundy and cream woven tassel hanging from a fixed top, soft fiber sway, no rug or wall|525,204,26,49|eave
香辛料店の香り|A few wispy curls of warm translucent pale gold steam, no pot or spices, airy and subtle|972,180,38,48|table
茶屋の湯気|Two slender white mint-tea steam wisps, no cup or tray, slow curl and fade|1456,585,35,43|table
オアシスのさざ波|Fine small turquoise oval ripple rings with bright sun reflections, no pool or solid water|340,873,73,28|water
中庭噴水の飛沫|Fine clear water droplets in a low spray, no fountain or basin|839,557,69,43|water
水屋の水滴|A few slim clear drops falling in a short continuous trickle with a tiny ripple below, no jar or basin|362,545,29,47|water
砂の小さな舞|Five tiny tan leaf-like flecks of dry seed chaff softly tumbling, very sparse, no opaque dust cloud or ground|540,99,61,57|air
椰子の葉先|A short soft green palm leaflet cluster with fixed upper stem, leaf tips sway in a tiny arc, no entire tree|1601,206,41,63|planter
天幕の小旗|Three little indigo cream and coral pennants on a fixed cord, cloth folds flutter gently|1450,518,63,28|eave
市場の銅風鈴|A small hammered copper bell with short green ribbon, fixed hook and gentle uneven swing|869,449,29,48|eave
香炉の細い煙|A tiny thin stream of translucent pale lavender incense smoke curling and dissolving, no burner or table|1335,239,27,49|table''',
19: '''山小屋の木鈴|Two carved pinecone bells on a little red cord, fixed top and gentle alpine wind sway|788,176,31,52|eave
リフト小屋の吹き流し|A small red cream and blue windsock, fixed support at opening, fabric tail billows softly|495,218,61,33|eave
スキー店の飾り紐|Two short red and gold fabric ribbons tied in one fixed knot, tails flutter, no ski equipment|126,510,35,48|eave
山のカフェの湯気|Three soft warm white steam curls rising and fading, no mug or food|734,242,41,50|table
崖の粉雪|A small soft puff of fine powdered snow drifting locally, no rock or solid snowbank|455,386,66,57|air
小川の冷たい泡|Tiny bluish white bubbles and thin foam rings moving gently, no stream bed or opaque water|857,867,64,31|water
氷の雫|One narrow clear icicle fixed at its top with a tiny drop that falls and reforms, no roof|948,492,19,52|eave
雪上車工房の排気|A pale gray exhaust vapor puff curling up slowly, no vehicle or pipe, transparent edges|1034,552,43,61|roof
雪の結晶の舞|Six sparse fine snow crystals drifting with irregular spacing, slow and non-flashing, no cloud|1447,388,63,71|air
針葉樹の粉雪|Tiny loose snow dust with two small brown pine needles softly tumbling, no tree branch|669,132,51,57|air
ゲレンデの小旗|Three little orange and cream triangular flags on a fixed short cord, rippling in a light wind|1436,248,64,27|eave
休憩所の冬モビール|Three white wooden snowflakes on a fixed short crossbar with red threads, gentle swaying|1461,511,37,51|eave''',
20: '''研究港の小吹き流し|A short turquoise white and gold fabric windsock on fixed mount, gentle flowing folds|1617,377,62,34|eave
マリンカフェの湯気|A pair of fine white coffee steam wisps, no cup or table, subtle curl and fade|204,528,34,43|table
研究室の卓上ファン|A compact white and aqua caged desk fan with fixed base, blades rotating smoothly|1327,234,36,42|table
貝のモビール|Three small pearly shells and blue glass beads suspended from fixed driftwood bar, soft asynchronous sway|1460,568,36,54|eave
潜水艇ドックの泡|A compact cluster of clear bubbles surfacing into thin rings, no submarine or solid water|817,623,62,42|water
水槽の細い泡|A narrow vertical trail of tiny clear cyan bubbles rising and dissolving, no tank or animal|251,261,26,62|water
海の光のゆらぎ|Sparse pale turquoise and white reflected water glints drifting in a small oval area, no water disk|1295,889,79,31|water
桟橋の波しぶき|Small white spray droplets and two foam crescents rolling gently, no pier or rocks|466,662,60,39|water
海風の白い羽|Two small loose white seabird feathers tumbling in a gentle eddy, no bird|1088,89,47,51|air
海藻の細い葉先|Three short green sea-grass tips with fixed base, sway together slowly as under water, no seabed or pot|608,893,36,44|water
環境観測の回転模型|A tiny white and aqua three-cup anemometer on a short stable stand, cups rotate smoothly|1430,180,35,49|table
夜光プランクトンの粒|Five very faint blue-green luminous motes drifting slowly on transparent space, subtle glow without strobe or animal bodies|960,66,53,42|water''',
21: '''雲の街の風鈴|A clear sky-blue glass bell with a white silk tail, fixed upper loop and gentle wind swing|349,183,29,51|eave
風車小屋のリボン|Two golden ribbons tied in a blue knot, knot fixed, long ends ripple in a soft breeze|936,182,35,56|eave
空カフェの湯気|A delicate pair of warm white steam wisps rising and fading, no cup or table|730,551,34,43|table
雲の庭の紙風車|A tiny cream and sky-blue six-vane paper pinwheel on a short gold stem, smoothly turning hub|449,477,38,50|planter
庭の滝の霧|Fine pale cyan water mist and tiny drops, no rocks or waterfall body|426,593,64,45|water
噴水の雲のしぶき|A small fountain spray of clear droplets with a faint white wisp at its peak, no fountain or opaque pool|401,258,62,45|water
雲の薄いかけら|A small fluffy white cloud fragment changing shape slowly with transparent holes, no blue sky rectangle|233,816,82,56|air
空の水路のゆらぎ|Thin oval aqua ripples and sparse gold highlights, no water disk or shore|339,634,68,28|water
飛行船桟橋の小旗|Three blue gold and cream triangular pennants on fixed cord, softly rippling, no text|1247,310,67,30|eave
花壇の綿毛|Four tiny cream seed tufts drifting in a small airy loop, no stems|644,699,57,61|air
市場の風モビール|A small mobile of three feather-shaped white wooden pieces, fixed top crossbar, unequal soft sways|1560,480,36,53|eave
空工房の羽根模型|A tiny brass four-blade fan ornament on a white stable tabletop base, slow smooth turning|1467,589,37,46|table''',
22: '''温室の光る種|Five tiny pastel green seed motes drifting in a gentle local spiral, restrained soft glow without flashing, no plants|387,172,51,49|air
魔法図書館のしおり|Three cream and purple bookmarks with abstract gold decorations but no letters, hanging from fixed bar and fluttering|694,99,32,49|eave
錬金室の薄煙|A small translucent lavender potion vapor curl splitting into two and fading, no flask or counter|1392,462,40,53|table
食堂のお茶の湯気|Two thin warm steam wisps from an unseen tea cup, no table or cup|289,687,35,42|table
魔法噴水の飛沫|Fine pale turquoise water droplets and two soft gold glints, no fountain or opaque water|833,711,62,43|water
温室のしずく|A few clear droplets falling from a fixed tiny green leaf tip, no pot or large plant|519,180,27,51|planter
天文の小惑星模型|A miniature brass orrery with three colored spheres gently orbiting above a fixed plinth, no background|1460,718,42,46|table
魔法工房の羽根風車|A tiny violet and gold feather-shaped pinwheel on a stable short stand, slow smooth rotation, no magical beam|1583,221,36,47|table
学寮の星モビール|Three small gold and violet wooden stars hanging on fixed strings, soft delayed swings, no runes or text|1003,443,36,53|eave
箒工房の房|A small bundle of pale straw bristles tied with violet cord, top fixed, fine ends sway softly|1517,438,28,52|eave
書庫の光るほこり|A sparse handful of warm luminous dust motes drifting softly, no opaque light beam, no strobing|812,113,46,55|air
青い花びらの舞|Five small periwinkle and lavender petals slowly tumbling in a circular breeze, no plant or background|461,761,60,62|air''',
23: '''都会の小旗|A short trio of blue and gold cloth pennants on a fixed cord, softly rippling, no lettering|807,155,64,29|eave
商店街の風鈴|A small clear amber glass bell with a cream paper tail, fixed upper hook and gentle swing|1019,271,27,51|eave
屋上カフェの湯気|A small pair of warm coffee steam curls, no cup or table, rise and fade|1203,291,34,44|table
劇場のリボン飾り|A gold knot with crimson silk tails hanging from fixed center, soft flutter, no stage curtain|1006,468,37,52|eave
公園噴水の飛沫|Fine aqua droplets in a small low fountain arc, no fountain structure or solid water|322,537,65,43|water
駅舎の排気蒸気|A small soft gray-white vapor plume curling upwards, no pipe or locomotive|255,138,43,62|roof
暮れの水面光|A few warm amber reflected strokes moving gently on transparent space, no solid water background|1600,885,63,29|water
カフェテラスの泡|Four small transparent soap bubbles reflecting late afternoon gold, floating and dissolving locally|548,624,46,57|air
公園の葉の舞|Five small green and gold leaves fluttering in an uneven slow eddy, no tree or ground|133,655,62,65|air
花屋のリボン|A tiny coral and cream satin bow, center fixed, long ends ripple gently, no bouquet or pot|758,269,34,41|planter
劇場の紙吹雪|Six small gold crimson and cream confetti pieces slowly turning in a compact airy loop, no audience|921,556,58,65|air
アパートの卓上ファン|A tiny white and sage desk fan with protective cage and stable base, steadily rotating blades, no furniture|1380,523,35,42|table''',
24: '''世界祭りの小旗|A small short string of four differently patterned colorful triangular pennants, geometric patterns without flags or text, endpoints fixed and cloth fluttering|278,169,75,31|eave
世界屋台のリボン|A bright turquoise gold and coral ribbon knot with loose ends, knot fixed, tails softly billow|852,169,42,49|eave
工芸広場の風鈴|A small hand-painted ceramic bell with simple floral marks and blue silk tail, fixed top hook, gentle swing|880,486,31,54|eave
屋台料理の湯気|Three fine warm white steam curls rising at different speeds and fading, no food or cooking equipment|766,245,48,52|table
水上劇場の飛沫|Fine clear water spray and small foam crescents, no stage boat or opaque water|1328,326,74,46|water
庭の小噴水の霧|A small aqua fountain mist crown with transparent gaps, no fountain or stonework|910,670,65,43|water
入口の水面光|Sparse bright sunlight glints in a little oval area, no water disk or solid background|1350,889,73,29|water
祝祭のしゃぼん玉|Six delicate transparent iridescent soap bubbles of varied sizes rising and dissolving, no wand or bubble machine|1000,726,53,66|air
音楽広場の紙吹雪|Seven tiny gold coral teal and cream confetti pieces slowly tumbling, no strobe or fireworks|327,519,61,67|air
カーニバルの房|A small ornate crimson gold and turquoise thread tassel, fixed top loop, fine ends softly sway|310,189,27,50|eave
花祭りの花びら|Five pink coral and pale yellow flower petals gently turning in a small breeze loop, no tree|1068,551,62,63|air
工芸屋の回転玩具|A tiny colorful wooden bird-shaped wind spinner on a short gold tabletop stand, wings turn around a fixed hub, a toy not a live bird|1230,556,40,48|table'''
}
assert len(S)==24

def save(path,obj):
 path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')

alljobs=[]
for si,raw in S.items():
 stage=DATA['stages'][si-1];sid=f'S{si:02}';refs=OUT/'references';ref=refs/f'{sid}-runtime-background.png'
 provenance=json.loads(ref.with_suffix('.json').read_text())
 objects=[]
 for row,line in enumerate(raw.splitlines()):
  name,action,rect,surface=line.split('|');x,y,w,h=map(float,rect.split(','))
  anchor=[.5,0] if surface=='eave' else ([.5,1] if surface in ('table','planter') else [.5,.5])
  layer='underActors' if surface=='water' else 'sky' if surface in ('air','roof','eave') else 'depth'
  # Canvas anchor is tied to the painted surface, but props themselves remain modest in size.
  # Attached environmental effects scale with the background, table ornaments cap at 1.4x to stay human sized.
  scale=min(stage['width']/1672,1.4) if surface in ('table','planter') else stage['width']/1672
  wx=x/1672*stage['width'];wy=y/941*stage['height']
  obj=dict(id=f'{sid}-ENV{row+1:02}',row=row%4,name=name,action=action,frames=8,fps=4 if surface in ('water','table') else 3,
    loop=True,anchor=anchor,layer=layer,motion='fixed',placement=dict(x=round(wx,3),y=round(wy,3),width=round(w*scale,3),height=round(h*scale,3),depthY=round(wy,3),coordinateSpace='world',referencePosition=[x,y],referenceSize=[1672,941],referenceDimensions=[w,h],surface=surface,integration='additive',collision=False,backgroundReferenceSHA256=provenance['referenceSHA256']),
    sizePolicy='human-scale-capped-1.4' if surface in ('table','planter') else 'background-relative',reviewState='planned-on-final-background-awaiting-generated-clip-review')
  objects.append(obj)
 assert len(objects)==12,si
 # Placement overview annotated from existing imagery, never used as output artwork.
 overview=Image.open(ref).convert('RGB');pen=ImageDraw.Draw(overview)
 for i,obj in enumerate(objects):
  p=obj['placement'];x,y=p['referencePosition'];w,h=p['referenceDimensions'];ax,ay=obj['anchor'];box=[x-w*ax,y-h*ay,x+w*(1-ax),y+h*(1-ay)]
  pen.rectangle(box,outline='#ec3bd2',width=2);pen.ellipse((x-3,y-3,x+3,y+3),fill='#ec3bd2');pen.text((box[0],box[1]-12),f'{i+1:02}',fill='#8b005d',stroke_width=1,stroke_fill='white')
 overview.save(refs/f'{sid}-environment-placements.png')
 for batch in range(3):
  ordinal=721+(si-1)*3+batch;jid=f'A{ordinal:04}';selected=objects[batch*4:batch*4+4]
  if (OUT/'attempts'/f'{jid}.json').exists():
   alljobs.append(json.loads((OUT/'jobs'/f'{jid}.json').read_text()));continue
  # Reference board: actual environment at left, enlarged target detail at right, one pair per sprite row.
  board=Image.new('RGB',(1200,1200),'#edeade');draw=ImageDraw.Draw(board);original=Image.open(ref).convert('RGB')
  for row,obj in enumerate(selected):
   p=obj['placement'];x,y=p['referencePosition'];w,h=p['referenceDimensions'];ax,ay=obj['anchor'];bounds=[x-w*ax,y-h*ay,x+w*(1-ax),y+h*(1-ay)]
   wide=original.resize((480,270),Image.Resampling.LANCZOS);d=ImageDraw.Draw(wide);d.rectangle([bounds[0]/1672*480,bounds[1]/941*270,bounds[2]/1672*480,bounds[3]/941*270],outline='#ec3bd2',width=2)
   board.paste(wide,(8,row*300+24))
   left=max(0,min(1672-480,round(x-240)));top=max(0,min(941-240,round(y-120)))
   crop=original.crop((left,top,left+480,top+240)).resize((640,320),Image.Resampling.LANCZOS)
   crop=crop.resize((640,270),Image.Resampling.LANCZOS);d=ImageDraw.Draw(crop);d.rectangle([(bounds[0]-left)*640/480,(bounds[1]-top)*270/240,(bounds[2]-left)*640/480,(bounds[3]-top)*270/240],outline='#ec3bd2',width=2)
   board.paste(crop,(550,row*300+24));draw.text((8,row*300+6),f'ROW {row+1} : target context only, generate the described transparent NEW detail, NOT the background',fill='#333')
  boardpath=refs/f'{jid}.png';board.save(boardpath)
  prompt=('Use case: game-asset. Create ONE high-quality environment animation sprite sheet for Wacha Wacha Town. '
   'Match the hand-painted storybook toy-town look and gentle overhead three-quarter perspective of the supplied reference board. '
   'The reference has FOUR horizontal rows. Each row shows a town overview and target-location crop. The magenta outlines are placement guides only. '
   'Do NOT reproduce any scene, architecture, people, placement marks or reference-board writing. Create ONLY the four NEW small transparent animated details described below. '
   'EXACT GRID: FOUR equal rows by EIGHT equal columns, 32 isolated sprites. Each row is the same object in eight sequential frames of ONE smooth seamless loop. '
   'TRUE transparent alpha background everywhere around and between sprites; no white or colored canvas, no floor, no square glow, no matte, no drop shadows. '
   'No text, labels, borders, guides, grids or watermarks. Every cell must contain the complete animation silhouette with generous transparent gutters. '
   'Keep an identical scale and stable anchor across all eight cells in each row; no cumulative object translation or scale changes. '
   'Show clear but gentle sequential motion rather than eight identical copies. First and last frames connect smoothly. '
   'Each object must remain finely detailed and readable at a small in-game size; avoid excessive micro-detail or flashing effects. '
   'Do not draw additional equipment already present in the background. No human or animal characters. Landscape canvas ideally 2048 x 1024. '
   f'Stage {sid}: {stage["name"]}.\n')
  for row,obj in enumerate(selected):
   an='top-center attachment remains absolutely fixed' if obj['anchor']==[.5,0] else 'bottom-center support remains absolutely fixed' if obj['anchor']==[.5,1] else 'animation remains centered at the same point'
   prompt+=f'Row {row+1}: {obj["action"]}. {an}.\n'
  job=dict(id=jid,ordinal=ordinal,stage=sid,kind='environment',rows=4,cols=8,prompt=prompt,reference=str(boardpath),transparent=True,objects=selected,status='planned',referenceBackground=str(ref),referenceProvenance=provenance,placementOverview=str(refs/f'{sid}-environment-placements.png'),cleanPlateRequired=False)
  save(OUT/'jobs'/f'{jid}.json',job);alljobs.append(job)
summary=dict(schemaVersion=1,createdAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),generationCalls=72,sheetGrid=[4,8],objectDesigns=288,animationFrames=2304,idRange=['A0721','A0792'],generationTool='built-in image_gen.imagegen',plannedOnly=True,policy='Additive cutouts only. No duplicated building, ride, fountain, existing wheel, entire tree, or opaque scene. Per-row fixed anchor. Positions based on final rendered backgrounds, including ordered detail tiles.',stages=[{'stage':f'S{i:02}','jobs':[f'A{721+(i-1)*3+j:04}' for j in range(3)]} for i in range(1,25)],runtimeContract={'stageField':'animatedScenery','transform':'Map every job.objects row to one clip; derive its 8 source frames from inspected actual image dimensions; copy object.anchor/fps/layer/motion; wrap object.placement in placements[]; image is job.id.','placementBasis':'World coordinates already calculated; do not rescale x/y a second time. referencePosition/referenceDimensions are review evidence only.','collision':'false: only attached decorations, transparent effects and small ornaments on already-painted surfaces. No new navigable blockers.','animation':'8 sequential frames, 3–4 fps. Random deterministic per-instance phase. No unrequested positional drift or scale wobble.','release':'Generated sheets and final renderer placements require visual QA before enabling. Reject white/opaque backgrounds, missing or merged cells and duplicate existing equipment.'})
save(OUT/'environment-plan.json',summary)
print(json.dumps({'jobs':len(alljobs),'objects':sum(len(j['objects']) for j in alljobs),'references':72,'stageComposites':24,'range':['A0721','A0792']},ensure_ascii=False))
