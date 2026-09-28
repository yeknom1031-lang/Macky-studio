extends RefCounted

# Disjoint categories: 40 spatial + 20 acoustic + 10 puzzle families.
const COUNTS=[40,20,10]
const ACTIVE=[30,12,8]
const KEYS=["visual_pool","audio_pool","puzzle_pool"]
const AUDIO_NAMES=["遠い金属の余韻","圧力の抜ける入口","水滴の列","低い空洞の共鳴","天井の細い唸り","配管を流れる水","二重に鳴るラッチ","濡れた足音","布に吸われる足音","硬い床の高い反響","壁から壁へ移る風","ゆっくり脈打つ換気","床下の振動","氷のような軋み","電気接点の連なり","遠方の排水","戻ってくる入室音","高音だけが消えた空気","揺れる調律音","回転する通気口"]

static func shuffled(values:Array,rng:RandomNumberGenerator) -> Array:
	var result=values.duplicate()
	for i in range(result.size()-1,0,-1):
		var j=rng.randi_range(0,i)
		var old=result[i]
		result[i]=result[j]
		result[j]=old
	return result

static func generate(seed_value:int,previous:Dictionary={}) -> Dictionary:
	var rng=RandomNumberGenerator.new()
	rng.seed=seed_value
	var result={}
	for group in range(3):
		var key=KEYS[group]
		var old=previous.get(key,[])
		var valid=old is Array and old.size()==ACTIVE[group]
		if valid:
			var unique={}
			for item in old:
				unique[int(item)]=true
				if int(item)<0 or int(item)>=COUNTS[group]:valid=false
			valid=valid and unique.size()==ACTIVE[group]
		if valid:
			var excluded=[]
			for id in range(COUNTS[group]):
				if not id in old:excluded.append(id)
			# Every previously absent family returns: 10 + 8 + 2 = exactly 20.
			var retained=shuffled(old,rng).slice(0,ACTIVE[group]-excluded.size())
			result[key]=shuffled(excluded+retained,rng)
		else:result[key]=shuffled(range(COUNTS[group]),rng).slice(0,ACTIVE[group])
	return result

static func ensure(state:Dictionary) -> void:
	if not state.has("visual_pool") or not state.has("audio_pool") or not state.has("puzzle_pool"):
		state.merge(generate(int(state.get("anomaly_seed",1))),true)
	if not state.has("current_audio"):state.current_audio=int(state.audio_pool[0])
	if not state.has("heard_audio"):state.heard_audio=[]
	if not state.has("campaign"):state.campaign=false
	if not state.has("solved_stations"):state.solved_stations=[]
	if not state.has("station_controls"):state.station_controls={}
	if not state.has("station_hints"):state.station_hints={}
	if not state.has("run_number"):state.run_number=1

static func next_audio(state:Dictionary,index:int) -> int:
	return int(state.audio_pool[posmod(index,state.audio_pool.size())])
