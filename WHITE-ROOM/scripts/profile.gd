extends RefCounted

const PATH = "user://white_room_v1.json"
var path = PATH
var state = {}
var settings = {"volume":0.48,"sensitivity":0.11,"fov":78.0,"brightness":1.0,"bob":false,"fullscreen":false}
var error_message = ""

func fresh() -> void:
	state = {"room":0,"position":[0.0,0.05,22.0],"yaw":0.0,"pitch":0.0,"clues":[],"notes":[],"visits":[0],"cipher":false,"key":false,"relay_unlocked":false,"powered":false,"escaped":false,"seconds":0.0,"crossings":0}

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
