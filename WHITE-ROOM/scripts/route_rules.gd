extends RefCounted

const Catalog=preload("res://scripts/run_catalog.gd")
const GLYPHS=["●","△","□","＋"]
const DIRECTIONS=["北","東","南","西"]
const CLUES=[
	[0,"塗りつぶされた、角のない刻印を選べ。"],
	[1,"輪郭で囲まれ、角が三つある刻印を選べ。"],
	[2,"同じ長さの四辺で囲まれた刻印を選べ。"],
	[3,"二本の線が直角に交わる。内側を囲まない刻印を選べ。"],
	[0,"三角と四角は進路ではない。残る印のうち、曲線だけのものへ。"],
	[1,"四つの角は多すぎる。角のない印も違う。三つの角を探せ。"],
	[2,"三本では閉じない。四本の辺で、一つの空間を囲め。"],
	[3,"丸でも、多角形でもない。縦と横が交わる印へ。"]
]

static func ensure(state:Dictionary) -> void:
	if not state.has("route_rooms"):
		var rng=RandomNumberGenerator.new()
		rng.seed=int(state.anomaly_seed)+98471
		state.route_rooms=[0]+Catalog.shuffled([1,3,4],rng)+[0]+Catalog.shuffled([5,6,7,8],rng)+[2,0]
		state.route_forward=[]
		state.route_clues=[]
		state.route_marks=[]
		for i in range(state.route_rooms.size()):
			var back=posmod(int(state.route_forward[i-1])+2,4) if i>0 else -1
			var options=range(4).filter(func(v):return v!=back)
			var forward=int(options[rng.randi_range(0,options.size()-1)])
			var clue=rng.randi_range(0,CLUES.size()-1)
			var marks=Catalog.shuffled(range(4),rng)
			var target=int(CLUES[clue][0])
			var other=marks.find(target)
			marks[other]=marks[forward]
			marks[forward]=target
			state.route_forward.append(forward)
			state.route_clues.append(clue)
			state.route_marks.append(marks)
		var room_id=int(state.get("room",0))
		state.route_index=state.route_rooms.find(room_id)
		if room_id==0 and state.get("powered",false):state.route_index=state.route_rooms.size()-1
		elif room_id==0 and state.get("key",false):state.route_index=4
		state.route_furthest=state.route_index
	if not state.has("route_pending_wrong"):state.route_pending_wrong=false
	if not state.has("route_errors"):state.route_errors=0

static func back_side(state:Dictionary) -> int:
	var i=int(state.route_index)
	return posmod(int(state.route_forward[i-1])+2,4) if i>0 else -1

static func choice(state:Dictionary,side:int) -> String:
	if side==back_side(state):return "back"
	if int(state.route_index)<state.route_rooms.size()-1 and side==int(state.route_forward[int(state.route_index)]):return "forward"
	return "wrong"

static func destination_index(state:Dictionary,side:int) -> int:
	match choice(state,side):
		"forward":return int(state.route_index)+1
		"back":return int(state.route_index)-1
	return int(state.route_index)

static func mark(state:Dictionary,side:int) -> String:
	if side==back_side(state):return "↶"
	return GLYPHS[int(state.route_marks[int(state.route_index)][side])]

static func clue(state:Dictionary) -> String:
	if int(state.route_index)==state.route_rooms.size()-1:
		return "通常の四つの扉に出口はない。西壁の中央から北へ12m、境界の継ぎ目を探せ。"
	return str(CLUES[int(state.route_clues[int(state.route_index)])][1])

static func task(state:Dictionary) -> String:
	var id=int(state.room)
	if id in [1,3,4] and not id in state.clues:return "この部屋の観測器を調べ、数字を記録すると進路の扉が開く。"
	if id==0 and int(state.route_index)==4 and not state.key:return "北壁で ○→△→□ の数字を入力し、箱の下の保全キーを取る。"
	if id==2 and not state.powered:
		if state.get("campaign",false) and state.solved_stations.size()<6:return "給電には校正が6台必要。この部屋の観測器、または ↶ の扉から戻って校正する。"
		return "北壁の回路にキーを使い、○→□→△ の順で接続する。"
	return ""

static func preview(state:Dictionary,side:int) -> Dictionary:
	var result=state.duplicate(true)
	result.route_index=destination_index(state,side)
	result.room=int(state.route_rooms[result.route_index])
	if result.route_index>int(state.route_furthest):result.danger=maxi(0,int(state.danger)-2)
	result.route_preview_same=choice(state,side)!="forward"
	return result
