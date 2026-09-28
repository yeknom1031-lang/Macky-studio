extends RefCounted

const NAMES=["消灯の波","降りてくる天井","無重力の立方体","高すぎる扉","主のいない影","呼吸する壁","冷たい色温度","室内の雨","逆行する時計","終わらない額縁","壁の赤い裂け目","遅れて返る反響","目を離すと回る柱","追いかける光","宙に消える階段","増殖する扉"]
const DESCRIPTIONS=["照明が奥から順に消え、ゆっくりと戻った。","頭上の格子が、音もなく近づいてくる。","白い塊が重さを失っていた。","手の届かない高さに、普通の木の扉があった。","何もない場所から、大きな影だけが動いていた。","壁の一部が、呼吸のように前後している。","室内の光が、白から冷たい青へ変わっていく。","天井の下で雨が降り、床に波紋が残る。","時計の針が逆向きに回っていた。","額縁の中に、さらに同じ額縁が続いていた。","白い壁に細い赤い光が走った。","自分の足音だけが、遅れて違う場所から戻る。","見直すたびに、宙の柱の向きが変わっていた。","誰も触れていない照明が、こちらを向く。","床に届かない階段が、空中で途切れている。","壁の上に閉じた扉が何枚も並んでいた。"]

static func ensure(state:Dictionary) -> void:
	if not state.has("anomaly_seed"):state.anomaly_seed=randi_range(1,2000000000)
	if not state.has("anomaly_index"):state.anomaly_index=1
	if not state.has("current_event"):state.current_event=0
	if not state.has("observed_anomalies"):state.observed_anomalies=[]
	if not state.has("room_entries"):state.room_entries={}

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
	var deck=order(int(state.anomaly_seed))
	return int(deck[int(state.anomaly_index)%deck.size()])

static func enter(state:Dictionary,id:int) -> void:
	state.current_event=peek(state)
	state.anomaly_index=int(state.anomaly_index)+1
	state.room_entries[str(id)]=int(state.room_entries.get(str(id),0))+1
