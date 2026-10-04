# ブラウザ版の素材を活かして新しいベースを増やす

2026年10月4日更新。既存画像を再利用し、ブラウザ版のコマ分け・コマ数を基本に新しいベースキャラクターを多数生成する。追加生成を行わないという解釈を訂正する。全員に8方向や大量の新規コマを義務付ける旧案は採用しない。

## 確認した現行の形式

| 項目 | 現物とメタデータで確認した内容 |
| --- | --- |
| 既存ベース | 250種類。人物232種類と動物18種類 |
| キャラクター原本 | 29ファイル。原本を保存し、既存の切り出し情報を引き継ぐ |
| 直近の追加170種類 | 17枚の透過シート。基本は10行×8列で、1行に1体 |
| 1体の基本コマ | 歩行4コマ＋専用動作4コマ。フェンシング1体は専用動作3コマ |
| 再生時の枠 | 15枠。歩行5枠、ジェスチャー5枠、専用動作5枠。ジェスチャーと動作は原画を共有する場合がある |
| 初期16種類・旧64種類 | 既存の異なるコマ構成をそのまま維持。一律8コマへ減らさない |
| 実行時画像 | 2,543枚の異なる切り出しフレーム。15枠すべてが異なる新規原画という意味ではない |
| 既存背景 | 7枚の原本を活用。前景分離や拡張で足りない部分は追加生成する |

17枚は現在採用されているシート数。過去の失敗・修正を含む総生成回数を17回と断定する数字ではない。現在の追加シートの原本は1,122×1,402pxで、1体8コマ・1シート10体の構成を確認した。

## 新規制作の規則

1. 新しいベースも基本は1行1体、歩行4コマ＋主要動作4コマ。10体を1シートにまとめる。顔や体形や衣装の形で別人にし、色違いで人数を増やさない。
2. 同じ絵柄と縮尺、透過背景、列の動作順を引き継ぐ。コマ境界は生成後に実測し、人物ID・行・切り出し矩形・動作を記録する。
3. 会話、店での受け渡し、乗降、カメラマンの券の受け渡しなど、既存の専用動作だけで不足する箇所に差分を追加する。全員へ同じ数の差分を発注しない。
4. 大きな道具や複雑な動作は1枚の人数を減らす、補助列を作る、別シートにする。既存の顔と服を参照し、必要部分を直す。
5. 移動速度、停止、方向転換、会話のタイミング、密度の調整、背景との接触位置はゲーム側でも調整する。すべてを新しい絵で解決しない。
6. 旧画像の一括再生成は行わない。原本を上書きせず、追加画像と更新した切り出し情報を別管理する。

## 既存人物と制作台帳の対応

EXで始まるIDが生成済みベースの固定ID。計画書のSで始まるステージ専用枠は追加制作する候補、Gで始まる共通住民の1,900枠は以前に提案した拡張枠である。共通枠へはまず既存人物232人を割り当て、名前や顔を新しい候補へ置き換えて作り直すことを避ける。動物18種類は動物枠で活用し、人物数へ二重計上しない。具体的な配置と役割の対応は制作時に決める。

ステージ専用100人×24＝2,400人を新規制作する基本シートは、10人／枚なら240枚分。共通枠の規模を含む試算は生成回数の章を参照。追加差分・背景・環境と、失敗や修正の分は別に積み上げる。

## 生成済み250種類の一覧

以下は制作前の人物案ではなく、ファイルの存在を確認した既存ベース。元デザインを再利用する対象であり、全ての新しい役割に必要な絵が既に揃っているという意味ではない。

| 固定ID | 名前 | 区分 | 原本 | 行 | 使用中の異なるコマ |
| --- | --- | --- | --- | --- | --- |
| EX001 | リーフ | 人物 | assets/walk-a.png | 1 | 15 |
| EX002 | ココ | 人物 | assets/walk-a.png | 2 | 15 |
| EX003 | ソラじい | 人物 | assets/walk-a.png | 3 | 15 |
| EX004 | モコ | 人物 | assets/walk-a.png | 4 | 15 |
| EX005 | マリン | 人物 | assets/walk-a.png | 5 | 15 |
| EX006 | アン | 人物 | assets/walk-b.png | 1 | 15 |
| EX007 | シェフ | 人物 | assets/walk-b.png | 2 | 15 |
| EX008 | スミレ | 人物 | assets/walk-b.png | 3 | 15 |
| EX009 | ハナばあ | 人物 | assets/walk-b.png | 4 | 15 |
| EX010 | ポポ | 人物 | assets/walk-b.png | 5 | 15 |
| EX011 | おまわりさん | 人物 | assets/walk-c.png | 1 | 15 |
| EX012 | ドロボー | 人物 | assets/walk-c.png | 2 | 15 |
| EX013 | つり名人 | 人物 | assets/walk-c.png | 3 | 15 |
| EX014 | パン屋さん | 人物 | assets/walk-c.png | 4 | 15 |
| EX015 | うたう旅人 | 人物 | assets/walk-c.png | 5 | 15 |
| EX016 | ちびザウルス | 人物 | assets/walk-c.png | 6 | 15 |
| EX017 | 杖のおじいちゃん | 人物 | assets/diversity/people-a.png | 1 | 14 |
| EX018 | 編み物のおばあちゃん | 人物 | assets/diversity/people-a.png | 2 | 14 |
| EX019 | 玉乗りピエロ | 人物 | assets/diversity/people-a.png | 3 | 14 |
| EX020 | カメラの青年 | 人物 | assets/diversity/people-a.png | 4 | 14 |
| EX021 | 体操のお姉さん | 人物 | assets/diversity/people-a.png | 5 | 14 |
| EX022 | バスケのお兄さん | 人物 | assets/diversity/people-a.png | 6 | 14 |
| EX023 | レインボーのダンサー | 人物 | assets/diversity/people-a.png | 7 | 14 |
| EX024 | 本好きの人 | 人物 | assets/diversity/people-a.png | 8 | 14 |
| EX025 | 柴犬 | 動物 | assets/diversity/animals.png | 1 | 14 |
| EX026 | ダックス | 動物 | assets/diversity/animals.png | 2 | 14 |
| EX027 | ふわふわプードル | 動物 | assets/diversity/animals.png | 3 | 14 |
| EX028 | 大きな牧羊犬 | 動物 | assets/diversity/animals.png | 4 | 14 |
| EX029 | 三毛猫 | 動物 | assets/diversity/animals.png | 5 | 14 |
| EX030 | 黒ねこ | 動物 | assets/diversity/animals.png | 6 | 14 |
| EX031 | ふとっちょ茶トラ | 動物 | assets/diversity/animals.png | 7 | 14 |
| EX032 | ふわふわ白ねこ | 動物 | assets/diversity/animals.png | 8 | 14 |
| EX033 | パン職人 | 人物 | assets/diversity/workers.png | 1 | 15 |
| EX034 | 大工さん | 人物 | assets/diversity/workers.png | 2 | 15 |
| EX035 | 庭師さん | 人物 | assets/diversity/workers.png | 3 | 15 |
| EX036 | ペンキ屋さん | 人物 | assets/diversity/workers.png | 4 | 15 |
| EX037 | 清掃員さん | 人物 | assets/diversity/workers.png | 5 | 15 |
| EX038 | 画家さん | 人物 | assets/diversity/workers.png | 6 | 15 |
| EX039 | 陶芸家さん | 人物 | assets/diversity/potter.png | 1 | 15 |
| EX040 | 花屋さん | 人物 | assets/diversity/workers.png | 7 | 15 |
| EX041 | 太鼓のおじさん | 人物 | assets/diversity/festival.png | 1 | 15 |
| EX042 | バイオリンの人 | 人物 | assets/diversity/festival.png | 2 | 15 |
| EX043 | アコーディオン奏者 | 人物 | assets/diversity/festival.png | 3 | 15 |
| EX044 | 大道芸人 | 人物 | assets/diversity/festival.png | 4 | 15 |
| EX045 | 風船屋さん | 人物 | assets/diversity/festival.png | 5 | 15 |
| EX046 | シャボン玉の子 | 人物 | assets/diversity/festival.png | 6 | 15 |
| EX047 | パントマイムの人 | 人物 | assets/diversity/festival.png | 7 | 15 |
| EX048 | リボンの踊り子 | 人物 | assets/diversity/festival.png | 8 | 15 |
| EX049 | ヨガの人 | 人物 | assets/diversity/sports.png | 1 | 15 |
| EX050 | フラフープの人 | 人物 | assets/diversity/sports.png | 2 | 15 |
| EX051 | スケーター | 人物 | assets/diversity/sports.png | 3 | 15 |
| EX052 | なわとびの子 | 人物 | assets/diversity/sports.png | 4 | 15 |
| EX053 | ダンベルのおじさん | 人物 | assets/diversity/sports.png | 5 | 15 |
| EX054 | 空手家 | 人物 | assets/diversity/sports.png | 6 | 15 |
| EX055 | サッカー少年 | 人物 | assets/diversity/sports.png | 7 | 15 |
| EX056 | バレリーナ | 人物 | assets/diversity/sports.png | 8 | 15 |
| EX057 | 和服のおばあちゃん | 人物 | assets/diversity/neighbors.png | 1 | 15 |
| EX058 | サリーの女性 | 人物 | assets/diversity/neighbors.png | 2 | 15 |
| EX059 | ターバンのおじさん | 人物 | assets/diversity/neighbors.png | 3 | 15 |
| EX060 | 車いすの画家 | 人物 | assets/diversity/neighbors.png | 4 | 15 |
| EX061 | 補聴器の女の子 | 人物 | assets/diversity/neighbors.png | 5 | 15 |
| EX062 | ひげの紳士 | 人物 | assets/diversity/neighbors.png | 6 | 15 |
| EX063 | スーツの女性 | 人物 | assets/diversity/neighbors.png | 7 | 15 |
| EX064 | パンクのお姉さん | 人物 | assets/diversity/neighbors.png | 8 | 15 |
| EX065 | 赤ちゃんとパパ | 人物 | assets/diversity/families.png | 1 | 15 |
| EX066 | 赤ちゃんとママ | 人物 | assets/diversity/families.png | 2 | 15 |
| EX067 | 双子のお姉ちゃん | 人物 | assets/diversity/families.png | 3 | 15 |
| EX068 | ぬいぐるみの子 | 人物 | assets/diversity/families.png | 4 | 15 |
| EX069 | 大きなリュックの人 | 人物 | assets/diversity/families.png | 5 | 15 |
| EX070 | おしゃれな紳士 | 人物 | assets/diversity/families.png | 6 | 15 |
| EX071 | レインボーの女性 | 人物 | assets/diversity/families.png | 7 | 15 |
| EX072 | 日傘のおばさん | 人物 | assets/diversity/families.png | 8 | 15 |
| EX073 | 宇宙飛行士 | 人物 | assets/diversity/costumes.png | 1 | 15 |
| EX074 | 小さな魔女 | 人物 | assets/diversity/costumes.png | 2 | 15 |
| EX075 | 大きなロボット | 人物 | assets/diversity/costumes.png | 3 | 15 |
| EX076 | カエルの人 | 人物 | assets/diversity/costumes.png | 4 | 15 |
| EX077 | ペンギンの人 | 人物 | assets/diversity/costumes.png | 5 | 15 |
| EX078 | ドラゴンの人 | 人物 | assets/diversity/costumes.png | 6 | 15 |
| EX079 | 探偵さん | 人物 | assets/diversity/costumes.png | 7 | 15 |
| EX080 | 海賊のおじいさん | 人物 | assets/diversity/costumes.png | 8 | 15 |
| EX081 | 時計職人 | 人物 | assets/expansion/expansion-01.png | 1 | 8 |
| EX082 | 鍵屋さん | 人物 | assets/expansion/expansion-01.png | 2 | 8 |
| EX083 | 靴職人 | 人物 | assets/expansion/expansion-01.png | 3 | 8 |
| EX084 | ガラス職人 | 人物 | assets/expansion/expansion-01.png | 4 | 8 |
| EX085 | 仕立て屋さん | 人物 | assets/expansion/expansion-01.png | 5 | 8 |
| EX086 | かご職人 | 人物 | assets/expansion/expansion-01.png | 6 | 8 |
| EX087 | 革職人 | 人物 | assets/expansion/expansion-01.png | 7 | 8 |
| EX088 | 和傘職人 | 人物 | assets/expansion/expansion-01.png | 8 | 8 |
| EX089 | 提灯職人 | 人物 | assets/expansion/expansion-01.png | 9 | 8 |
| EX090 | 石工さん | 人物 | assets/expansion/expansion-01.png | 10 | 8 |
| EX091 | クレープ屋さん | 人物 | assets/expansion/expansion-02.png | 1 | 8 |
| EX092 | 寿司職人 | 人物 | assets/expansion/expansion-02.png | 2 | 8 |
| EX093 | アイス屋さん | 人物 | assets/expansion/expansion-02.png | 3 | 8 |
| EX094 | たこ焼き屋さん | 人物 | assets/expansion/expansion-02.png | 4 | 8 |
| EX095 | ピザ職人 | 人物 | assets/expansion/expansion-02.png | 5 | 8 |
| EX096 | チョコ職人 | 人物 | assets/expansion/expansion-02.png | 6 | 8 |
| EX097 | お茶屋さん | 人物 | assets/expansion/expansion-02.png | 7 | 8 |
| EX098 | 果物屋さん | 人物 | assets/expansion/expansion-02.png | 8 | 8 |
| EX099 | たい焼き屋さん | 人物 | assets/expansion/expansion-02.png | 9 | 8 |
| EX100 | ドーナツ屋さん | 人物 | assets/expansion/expansion-02.png | 10 | 8 |
| EX101 | 魚屋さん | 人物 | assets/expansion/expansion-03.png | 1 | 8 |
| EX102 | 八百屋さん | 人物 | assets/expansion/expansion-03.png | 2 | 8 |
| EX103 | 古道具屋さん | 人物 | assets/expansion/expansion-03.png | 3 | 8 |
| EX104 | 帽子屋さん | 人物 | assets/expansion/expansion-03.png | 4 | 8 |
| EX105 | ぬいぐるみ屋さん | 人物 | assets/expansion/expansion-03.png | 5 | 8 |
| EX106 | レコード屋さん | 人物 | assets/expansion/expansion-03.png | 6 | 8 |
| EX107 | 花束のおじさん | 人物 | assets/expansion/expansion-03.png | 7 | 8 |
| EX108 | 新聞屋さん | 人物 | assets/expansion/expansion-03.png | 8 | 8 |
| EX109 | ジャム屋さん | 人物 | assets/expansion/expansion-03.png | 9 | 8 |
| EX110 | せっけん屋さん | 人物 | assets/expansion/expansion-03.png | 10 | 8 |
| EX111 | 消防士さん | 人物 | assets/expansion/expansion-04.png | 1 | 8 |
| EX112 | 郵便屋さん | 人物 | assets/expansion/expansion-04.png | 2 | 8 |
| EX113 | 車掌さん | 人物 | assets/expansion/expansion-04.png | 3 | 8 |
| EX114 | 救急隊員さん | 人物 | assets/expansion/expansion-04.png | 4 | 8 |
| EX115 | 研究者さん | 人物 | assets/expansion/expansion-04.png | 5 | 8 |
| EX116 | 先生 | 人物 | assets/expansion/expansion-04.png | 6 | 8 |
| EX117 | 司書さん | 人物 | assets/expansion/expansion-04.png | 7 | 8 |
| EX118 | 配管工さん | 人物 | assets/expansion/expansion-04.png | 8 | 8 |
| EX119 | 電気屋さん | 人物 | assets/expansion/expansion-04.png | 9 | 8 |
| EX120 | 獣医さん | 人物 | assets/expansion/expansion-04.png | 10 | 8 |
| EX121 | サックスの人 | 人物 | assets/expansion/expansion-05.png | 1 | 8 |
| EX122 | チェロの人 | 人物 | assets/expansion/expansion-05.png | 2 | 8 |
| EX123 | フルートの人 | 人物 | assets/expansion/expansion-05.png | 3 | 8 |
| EX124 | トランペットの人 | 人物 | assets/expansion/expansion-05.png | 4 | 8 |
| EX125 | ハープの人 | 人物 | assets/expansion/expansion-05.png | 5 | 8 |
| EX126 | 三味線の人 | 人物 | assets/expansion/expansion-05.png | 6 | 8 |
| EX127 | マラカスの人 | 人物 | assets/expansion/expansion-05.png | 7 | 8 |
| EX128 | 木琴の人 | 人物 | assets/expansion/expansion-05.png | 8 | 8 |
| EX129 | チューバの人 | 人物 | assets/expansion/expansion-05.png | 9 | 8 |
| EX130 | ハーモニカの人 | 人物 | assets/expansion/expansion-05.png | 10 | 8 |
| EX131 | 凧あげの子 | 人物 | assets/expansion/expansion-06.png | 1 | 8 |
| EX132 | こま回しの子 | 人物 | assets/expansion/expansion-06.png | 2 | 8 |
| EX133 | けん玉の子 | 人物 | assets/expansion/expansion-06.png | 3 | 8 |
| EX134 | 竹馬の人 | 人物 | assets/expansion/expansion-06.png | 4 | 8 |
| EX135 | 竹とんぼの子 | 人物 | assets/expansion/expansion-06.png | 5 | 8 |
| EX136 | 紙飛行機の人 | 人物 | assets/expansion/expansion-06.png | 6 | 8 |
| EX137 | シャボンの老人 | 人物 | assets/expansion/expansion-06.png | 7 | 8 |
| EX138 | お手玉のおばさん | 人物 | assets/expansion/expansion-06.png | 8 | 8 |
| EX139 | 将棋のおじいさん | 人物 | assets/expansion/expansion-06.png | 9 | 8 |
| EX140 | ブーメランの人 | 人物 | assets/expansion/expansion-06.png | 10 | 8 |
| EX141 | 卓球の人 | 人物 | assets/expansion/expansion-07.png | 1 | 8 |
| EX142 | テニスの人 | 人物 | assets/expansion/expansion-07.png | 2 | 8 |
| EX143 | バドミントンの人 | 人物 | assets/expansion/expansion-07.png | 3 | 8 |
| EX144 | フェンシングの人 | 人物 | assets/expansion/expansion-07.png | 4 | 7 |
| EX145 | ボウリングの人 | 人物 | assets/expansion/expansion-07.png | 5 | 8 |
| EX146 | ラグビーの人 | 人物 | assets/expansion/expansion-07.png | 6 | 8 |
| EX147 | サーファー | 人物 | assets/expansion/expansion-07.png | 7 | 8 |
| EX148 | ローラースケートの人 | 人物 | assets/expansion/expansion-07.png | 8 | 8 |
| EX149 | 太極拳のおばあちゃん | 人物 | assets/expansion/expansion-07.png | 9 | 8 |
| EX150 | 体操のおじいちゃん | 人物 | assets/expansion/expansion-07.png | 10 | 8 |
| EX151 | 養蜂家さん | 人物 | assets/expansion/expansion-08.png | 1 | 8 |
| EX152 | きのこ博士 | 人物 | assets/expansion/expansion-08.png | 2 | 8 |
| EX153 | 盆栽のおじいさん | 人物 | assets/expansion/expansion-08.png | 3 | 8 |
| EX154 | 蝶をみる人 | 人物 | assets/expansion/expansion-08.png | 4 | 8 |
| EX155 | 双眼鏡の人 | 人物 | assets/expansion/expansion-08.png | 5 | 8 |
| EX156 | 種まきの人 | 人物 | assets/expansion/expansion-08.png | 6 | 8 |
| EX157 | 落ち葉のおじさん | 人物 | assets/expansion/expansion-08.png | 7 | 8 |
| EX158 | 虫めがねの子 | 人物 | assets/expansion/expansion-08.png | 8 | 8 |
| EX159 | 植木鉢の人 | 人物 | assets/expansion/expansion-08.png | 9 | 8 |
| EX160 | バラの庭師 | 人物 | assets/expansion/expansion-08.png | 10 | 8 |
| EX161 | 折り紙の人 | 人物 | assets/expansion/expansion-09.png | 1 | 8 |
| EX162 | 模型の人 | 人物 | assets/expansion/expansion-09.png | 2 | 8 |
| EX163 | 刺しゅうの人 | 人物 | assets/expansion/expansion-09.png | 3 | 8 |
| EX164 | 人形師さん | 人物 | assets/expansion/expansion-09.png | 4 | 8 |
| EX165 | 書道の人 | 人物 | assets/expansion/expansion-09.png | 5 | 8 |
| EX166 | スケッチの人 | 人物 | assets/expansion/expansion-09.png | 6 | 8 |
| EX167 | 折りたたみ椅子の人 | 人物 | assets/expansion/expansion-09.png | 7 | 8 |
| EX168 | 風車を作る子 | 人物 | assets/expansion/expansion-09.png | 8 | 8 |
| EX169 | ビーズの人 | 人物 | assets/expansion/expansion-09.png | 9 | 8 |
| EX170 | ラジコンの人 | 人物 | assets/expansion/expansion-09.png | 10 | 8 |
| EX171 | 旅行のおばあちゃん | 人物 | assets/expansion/expansion-10.png | 1 | 8 |
| EX172 | 登山のおじさん | 人物 | assets/expansion/expansion-10.png | 2 | 8 |
| EX173 | カメラのおばさん | 人物 | assets/expansion/expansion-10.png | 3 | 8 |
| EX174 | スケッチ旅行者 | 人物 | assets/expansion/expansion-10.png | 4 | 8 |
| EX175 | ピクニックの人 | 人物 | assets/expansion/expansion-10.png | 5 | 8 |
| EX176 | おみやげの青年 | 人物 | assets/expansion/expansion-10.png | 6 | 8 |
| EX177 | 双眼鏡のおばあさん | 人物 | assets/expansion/expansion-10.png | 7 | 8 |
| EX178 | 海辺の子 | 人物 | assets/expansion/expansion-10.png | 8 | 8 |
| EX179 | 虫よけの人 | 人物 | assets/expansion/expansion-10.png | 9 | 8 |
| EX180 | 水筒の人 | 人物 | assets/expansion/expansion-10.png | 10 | 8 |
| EX181 | ロングコートの紳士 | 人物 | assets/expansion/expansion-11.png | 1 | 8 |
| EX182 | ベレーの女性 | 人物 | assets/expansion/expansion-11.png | 2 | 8 |
| EX183 | モードな青年 | 人物 | assets/expansion/expansion-11.png | 3 | 8 |
| EX184 | 虹色のスカーフの人 | 人物 | assets/expansion/expansion-11.png | 4 | 8 |
| EX185 | 大きなイヤリングの人 | 人物 | assets/expansion/expansion-11.png | 5 | 8 |
| EX186 | 花柄スーツの人 | 人物 | assets/expansion/expansion-11.png | 6 | 8 |
| EX187 | 和モダンの人 | 人物 | assets/expansion/expansion-11.png | 7 | 8 |
| EX188 | リボンの紳士 | 人物 | assets/expansion/expansion-11.png | 8 | 8 |
| EX189 | フリルの人 | 人物 | assets/expansion/expansion-11.png | 9 | 8 |
| EX190 | スニーカーの人 | 人物 | assets/expansion/expansion-11.png | 10 | 8 |
| EX191 | おんぶのおばあちゃん | 人物 | assets/expansion/expansion-12.png | 1 | 8 |
| EX192 | 絵本のパパ | 人物 | assets/expansion/expansion-12.png | 2 | 8 |
| EX193 | おやつのママ | 人物 | assets/expansion/expansion-12.png | 3 | 8 |
| EX194 | 肩車のお父さん | 人物 | assets/expansion/expansion-12.png | 4 | 8 |
| EX195 | 赤い長靴の子 | 人物 | assets/expansion/expansion-12.png | 5 | 8 |
| EX196 | 工作の子 | 人物 | assets/expansion/expansion-12.png | 6 | 8 |
| EX197 | しゃがむおじいちゃん | 人物 | assets/expansion/expansion-12.png | 7 | 8 |
| EX198 | 手袋のおばさん | 人物 | assets/expansion/expansion-12.png | 8 | 8 |
| EX199 | お菓子の兄ちゃん | 人物 | assets/expansion/expansion-12.png | 9 | 8 |
| EX200 | リュックのお姉ちゃん | 人物 | assets/expansion/expansion-12.png | 10 | 8 |
| EX201 | 大きな騎士 | 人物 | assets/expansion/expansion-13.png | 1 | 8 |
| EX202 | 小さな妖精 | 人物 | assets/expansion/expansion-13.png | 2 | 8 |
| EX203 | かぼちゃの人 | 人物 | assets/expansion/expansion-13.png | 3 | 8 |
| EX204 | きのこの人 | 人物 | assets/expansion/expansion-13.png | 4 | 8 |
| EX205 | ゆきだるまの人 | 人物 | assets/expansion/expansion-13.png | 5 | 8 |
| EX206 | ねこの仮装の人 | 人物 | assets/expansion/expansion-13.png | 6 | 8 |
| EX207 | 王冠のおじいさん | 人物 | assets/expansion/expansion-13.png | 7 | 8 |
| EX208 | 天使のお姉さん | 人物 | assets/expansion/expansion-13.png | 8 | 8 |
| EX209 | カラフルな怪獣 | 人物 | assets/expansion/expansion-13.png | 9 | 8 |
| EX210 | 本の妖精 | 人物 | assets/expansion/expansion-13.png | 10 | 8 |
| EX211 | バナナの人 | 人物 | assets/expansion/expansion-14.png | 1 | 8 |
| EX212 | いちごの人 | 人物 | assets/expansion/expansion-14.png | 2 | 8 |
| EX213 | 宇宙人の人 | 人物 | assets/expansion/expansion-14.png | 3 | 8 |
| EX214 | パンダの人 | 人物 | assets/expansion/expansion-14.png | 4 | 8 |
| EX215 | トラの人 | 人物 | assets/expansion/expansion-14.png | 5 | 8 |
| EX216 | うさぎの人 | 人物 | assets/expansion/expansion-14.png | 6 | 8 |
| EX217 | カニの人 | 人物 | assets/expansion/expansion-14.png | 7 | 8 |
| EX218 | ハチの人 | 人物 | assets/expansion/expansion-14.png | 8 | 8 |
| EX219 | 恐竜博士 | 人物 | assets/expansion/expansion-14.png | 9 | 8 |
| EX220 | 星の人 | 人物 | assets/expansion/expansion-14.png | 10 | 8 |
| EX221 | ビーグル | 動物 | assets/expansion/expansion-15.png | 1 | 8 |
| EX222 | コーギー | 動物 | assets/expansion/expansion-15.png | 2 | 8 |
| EX223 | ハスキー | 動物 | assets/expansion/expansion-15.png | 3 | 8 |
| EX224 | ダルメシアン | 動物 | assets/expansion/expansion-15.png | 4 | 8 |
| EX225 | 垂れ耳うさぎ | 動物 | assets/expansion/expansion-15.png | 5 | 8 |
| EX226 | 白うさぎ | 動物 | assets/expansion/expansion-15.png | 6 | 8 |
| EX227 | ハリネズミ | 動物 | assets/expansion/expansion-15.png | 7 | 8 |
| EX228 | アヒル | 動物 | assets/expansion/expansion-15.png | 8 | 8 |
| EX229 | ミニブタ | 動物 | assets/expansion/expansion-15.png | 9 | 8 |
| EX230 | リス | 動物 | assets/expansion/expansion-15.png | 10 | 8 |
| EX231 | 自転車整備士 | 人物 | assets/expansion/expansion-16.png | 1 | 8 |
| EX232 | 船長さん | 人物 | assets/expansion/expansion-16.png | 2 | 8 |
| EX233 | パイロットさん | 人物 | assets/expansion/expansion-16.png | 3 | 8 |
| EX234 | バスの運転手 | 人物 | assets/expansion/expansion-16.png | 4 | 8 |
| EX235 | 鉄道模型の人 | 人物 | assets/expansion/expansion-16.png | 5 | 8 |
| EX236 | 宇宙好きの子 | 人物 | assets/expansion/expansion-16.png | 6 | 8 |
| EX237 | 消防好きの子 | 人物 | assets/expansion/expansion-16.png | 7 | 8 |
| EX238 | 車いすのダンサー | 人物 | assets/expansion/expansion-16.png | 8 | 8 |
| EX239 | 車いすの読書家 | 人物 | assets/expansion/expansion-16.png | 9 | 8 |
| EX240 | ベビーカーの人 | 人物 | assets/expansion/expansion-16.png | 10 | 8 |
| EX241 | りんご飴の人 | 人物 | assets/expansion/expansion-17.png | 1 | 8 |
| EX242 | 金魚すくいの人 | 人物 | assets/expansion/expansion-17.png | 2 | 8 |
| EX243 | お面のおばさん | 人物 | assets/expansion/expansion-17.png | 3 | 8 |
| EX244 | 星を見る人 | 人物 | assets/expansion/expansion-17.png | 4 | 8 |
| EX245 | 灯りのおじいさん | 人物 | assets/expansion/expansion-17.png | 5 | 8 |
| EX246 | 太鼓の子 | 人物 | assets/expansion/expansion-17.png | 6 | 8 |
| EX247 | 踊る花笠の人 | 人物 | assets/expansion/expansion-17.png | 7 | 8 |
| EX248 | わたあめの人 | 人物 | assets/expansion/expansion-17.png | 8 | 8 |
| EX249 | 扇子の青年 | 人物 | assets/expansion/expansion-17.png | 9 | 8 |
| EX250 | 花火柄の人 | 人物 | assets/expansion/expansion-17.png | 10 | 8 |

原本の行は読みやすい1始まりで表示。JSON内のrowとゲーム内のbase indexは既存実装に合わせて0始まり。
