extends RefCounted

const LIMIT=5
const CAUSES=["黒い影に飲み込まれた","足元の床が崩落した","二つのモニュメントに押し潰された"]
const WARNINGS=["","照明が弱まった。誤答は部屋に蓄積する。","影が近づいている。確定する前に手掛かりを見直そう。","床が沈んだ。正解すれば危険度が2下がる。","次の誤答で死亡する。装置のヒントを確認しよう。","境界が、あなたを拒んだ。"]

static func ensure(state:Dictionary) -> void:
	for key in ["danger","mistakes","deaths"]:
		if not state.has(key):state[key]=0
	if not state.has("dead"):state.dead=false
	if not state.has("death_cause"):state.death_cause=-1
	if not state.has("last_failure"):state.last_failure=""

static func mistake(state:Dictionary,reason:String) -> bool:
	ensure(state)
	if state.dead or state.get("escaped",false):return false
	state.mistakes=int(state.mistakes)+1
	state.danger=mini(LIMIT,int(state.danger)+1)
	state.last_failure=reason
	if state.danger==LIMIT:
		state.death_cause=posmod(int(state.anomaly_seed)+int(state.deaths),3)
		state.deaths=int(state.deaths)+1
		state.dead=true
	return true

static func success(state:Dictionary) -> void:
	ensure(state)
	if not state.dead:state.danger=maxi(0,int(state.danger)-2)

static func status(state:Dictionary) -> String:
	ensure(state)
	return "危険度 %d / 5%s"%[int(state.danger),"　次の誤答で死亡" if state.danger==4 else ""]
