extends RefCounted

const Runs=preload("res://scripts/run_catalog.gd")

const NAMES=["消灯の波","降りてくる天井","無重力の立方体","高すぎる扉","主のいない影","呼吸する壁","冷たい色温度","室内の雨","逆行する時計","終わらない額縁","壁の赤い裂け目","遅れて返る反響","目を離すと回る柱","追いかける光","宙に消える階段","増殖する扉"]
const EXTRA_NAMES=["光の振り子", "水平線のない窓", "宙に浮く薄板", "天井の波紋", "白い機械の回転", "壁を登る目盛り", "一本だけ傾く柱", "冷光の格子", "近づく環", "奥行きのある壁", "凍結した雨粒", "折り返す壁板", "回る天井の羽根", "接地しない柱", "光の水位", "反転した家具", "粒子の上昇", "遠い四角い太陽", "畳まれる額縁", "壁の波打つ継ぎ目", "沈黙する照明", "流れる床の線", "空中の白い環", "ずれる三つの時計"]
const EXTRA_DESCRIPTIONS=["長い光が、頭上で静かに揺れる。", "窓の向こうが白一色だった。", "薄い板が、空中で波のようにうねる。", "天井の四角い波紋が広がる。", "巨大な輪が、ゆっくり回転していた。", "壁の目盛りだけが上へ滑っていく。", "一本の柱が、重力を忘れたように傾く。", "冷たい格子が頭上を覆っている。", "四角い環が、互いを通り抜ける。", "壁面が何層もの奥行きを持っている。", "落ちるはずの雨粒が止まっている。", "壁の薄板が、本のページのように動く。", "天井の羽根だけが静かに回っている。", "柱の下端と床の間に、大きな隙間がある。", "光の水平線が、壁をゆっくり上っていく。", "机のような形が、頭上で逆さになっている。", "小さな粒が、床から天井へ帰っていく。", "白い正方形が、遠い太陽のように光っている。", "四角い額が一枚ずつ向きを変える。", "白い壁の縦の継ぎ目が、別々に揺れる。", "半分の照明がゆっくり静まる。", "床を横切る線が、音もなく流れる。", "白い環が、傾きながら浮いている。", "三つの時計が、違う時間を進んでいた。"]
const DESCRIPTIONS=["照明が奥から順に消え、ゆっくりと戻った。","頭上の格子が、音もなく近づいてくる。","白い塊が重さを失っていた。","手の届かない高さに、普通の木の扉があった。","何もない場所から、大きな影だけが動いていた。","壁の一部が、呼吸のように前後している。","室内の光が、白から冷たい青へ変わっていく。","天井の下で雨が降り、床に波紋が残る。","時計の針が逆向きに回っていた。","額縁の中に、さらに同じ額縁が続いていた。","白い壁に細い赤い光が走った。","自分の足音だけが、遅れて違う場所から戻る。","見直すたびに、宙の柱の向きが変わっていた。","誰も触れていない照明が、こちらを向く。","床に届かない階段が、空中で途切れている。","壁の上に閉じた扉が何枚も並んでいた。"]

static func ensure(state:Dictionary) -> void:
	if not state.has("anomaly_seed"):state.anomaly_seed=randi_range(1,2000000000)
	if not state.has("anomaly_index"):state.anomaly_index=1
	if not state.has("current_event"):state.current_event=0
	if not state.has("observed_anomalies"):state.observed_anomalies=[]
	if not state.has("room_entries"):state.room_entries={}
	Runs.ensure(state)

static func order(seed_value:int) -> Array:
	var rng=RandomNumberGenerator.new()
	rng.seed=seed_value
	var result=range(NAMES.size())
	for i in range(result.size()-1,0,-1):
		var j=rng.randi_range(0,i)
		var old=result[i]
		result[i]=result[j]
		result[j]=old
	var first=result.find(0)
	result[first]=result[0]
	result[0]=0
	return result

static func peek(state:Dictionary) -> int:
	ensure(state)
	# One full shuffled cycle before any repeat. Opening and closing a door
	# never consumes the next event; only physically entering does.
	var deck=state.visual_pool
	return int(deck[int(state.anomaly_index)%deck.size()])

static func enter(state:Dictionary,id:int) -> void:
	state.current_event=peek(state)
	state.current_audio=Runs.next_audio(state,int(state.anomaly_index))
	state.anomaly_index=int(state.anomaly_index)+1
	state.room_entries[str(id)]=int(state.room_entries.get(str(id),0))+1

static func title(id:int) -> String:
	return NAMES[id] if id<16 else EXTRA_NAMES[id-16]

static func description(id:int) -> String:
	return DESCRIPTIONS[id] if id<16 else EXTRA_DESCRIPTIONS[id-16]
