extends RefCounted

const Routes=preload("res://scripts/route_rules.gd")
const Failure=preload("res://scripts/failure_rules.gd")
const Catalog=preload("res://scripts/anomaly_catalog.gd")
const PATH = "user://white_room_v1.json"
var path = PATH
var state = {}
var settings = {"volume":0.48,"sensitivity":0.11,"fov":78.0,"brightness":1.0,"bob":false,"fullscreen":false,"gi":true}
var error_message = ""

func fresh(previous:Dictionary={}) -> void:
	var old=previous if not previous.is_empty() else state.duplicate(true)
	state = {"room":0,"position":[0.0,0.05,22.0],"yaw":0.0,"pitch":0.0,"clues":[],"notes":[],"visits":[0],"cipher":false,"key":false,"relay_unlocked":false,"powered":false,"escaped":false,"seconds":0.0,"crossings":0}
	Catalog.ensure(state)
	state.merge(Catalog.Runs.generate(int(state.anomaly_seed),old),true)
	state.campaign=true
	state.run_number=int(old.get("run_number",0))+1
	state.anomaly_index=0
	state.room_entries={}
	Catalog.enter(state,0)
	Failure.ensure(state)
	Routes.ensure(state)

func load_profile() -> bool:
	for candidate in [path,path+".bak"]:
		if not FileAccess.file_exists(candidate):
			continue
		var file = FileAccess.open(candidate,FileAccess.READ)
		if file == null:
			continue
		var parser=JSON.new()
		if parser.parse(file.get_as_text())!=OK:
			continue
		var value=parser.data
		if not value is Dictionary or int(value.get("version",0)) != 1:
			continue
		if value.get("settings") is Dictionary:
			for key in settings:
				if value.settings.has(key) and typeof(value.settings[key]) in [TYPE_BOOL,TYPE_FLOAT,TYPE_INT]:
					settings[key]=value.settings[key]
		settings.volume=clampf(float(settings.volume),0.0,1.0)
		settings.sensitivity=clampf(float(settings.sensitivity),0.04,0.3)
		settings.fov=clampf(float(settings.fov),65.0,100.0)
		settings.brightness=clampf(float(settings.brightness),0.8,1.25)
		if not value.get("state") is Dictionary:
			continue
		state={}
		fresh()
		for key in state:
			if value.state.has(key) and typeof(value.state[key]) == typeof(state[key]):
				state[key]=value.state[key]
		# JSON stores all numeric values as floats.
		state.room=clampi(int(value.state.get("room",0)),0,8)
		state.crossings=maxi(0,int(value.state.get("crossings",0)))
		state.seconds=maxf(0.0,float(value.state.get("seconds",0.0)))
		if state.position.size()!=3:
			state.position=[0.0,0.05,22.0]
		for i in range(3):
			if not typeof(state.position[i]) in [TYPE_INT,TYPE_FLOAT] or not is_finite(float(state.position[i])):
				state.position=[0.0,0.05,22.0]
		state.clues=state.clues.filter(func(x):return int(x) in [1,3,4])
		if state.powered:
			state.relay_unlocked=true
			state.key=true
			state.cipher=true
		for key in ["anomaly_seed","anomaly_index","current_event","current_audio","run_number","danger","mistakes","deaths","death_cause","route_index","route_furthest","route_errors"]:
			state[key]=int(value.state.get(key,state[key]))
		state.campaign=bool(value.state.get("campaign",false))
		if not value.state.has("visual_pool"):
			state.merge(Catalog.Runs.generate(int(state.anomaly_seed)),true)
		Catalog.ensure(state)
		# JSON numbers are floats; normalize identity and control arrays as well.
		for key in ["visual_pool","audio_pool","puzzle_pool","clues","visits","solved_stations","observed_anomalies","heard_audio"]:
			state[key]=state[key].map(func(v):return int(v))
		for key in state.station_controls:
			if state.station_controls[key] is Array:
				state.station_controls[key]=state.station_controls[key].map(func(v):return int(v))
		if not value.state.has("route_rooms"):
			for key in ["route_rooms","route_forward","route_clues","route_marks","route_index","route_furthest"]:state.erase(key)
		Routes.ensure(state)
		for key in ["route_rooms","route_forward","route_clues"]:state[key]=state[key].map(func(v):return int(v))
		for i in range(state.route_marks.size()):state.route_marks[i]=state.route_marks[i].map(func(v):return int(v))
		state.route_index=clampi(int(state.route_index),0,state.route_rooms.size()-1)
		state.route_furthest=maxi(state.route_index,int(state.route_furthest))
		state.room=int(state.route_rooms[state.route_index])
		Failure.ensure(state)
		state.danger=clampi(int(state.danger),0,5)
		if state.danger==5:state.dead=true
		if state.dead:state.death_cause=posmod(int(state.death_cause),3)
		state.current_event=posmod(int(state.current_event),40)
		return true
	fresh()
	return false

func save() -> bool:
	error_message=""
	var temporary=path+".tmp"
	var file=FileAccess.open(temporary,FileAccess.WRITE)
	if file==null:
		error_message="保存先を開けませんでした。"
		return false
	file.store_string(JSON.stringify({"version":1,"state":state,"settings":settings}))
	file.flush()
	file.close()
	if FileAccess.file_exists(path):
		DirAccess.copy_absolute(path,path+".bak")
	var result=DirAccess.rename_absolute(temporary,path)
	if result!=OK:
		error_message="進行状況を保存できませんでした。"
	return result==OK

func retry_after_death() -> void:
	var previous=state.duplicate(true)
	fresh()
	for key in ["anomaly_seed","visual_pool","audio_pool","puzzle_pool","run_number","deaths","campaign","route_rooms","route_forward","route_clues","route_marks"]:state[key]=previous[key]
	state.anomaly_index=0
	state.room_entries={}
	Catalog.enter(state,0)
