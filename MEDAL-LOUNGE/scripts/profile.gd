extends RefCounted
var path := "user://medal_lounge_v1.json"
var balance := 600
var earned := 0
var shots := 0
var jackpots := 0
var refill_at := 0
var tutorial_seen := false
var machine := 0
var tables: Dictionary = {}
var audio := {"music":0.55,"room":0.45,"effects":0.75}
var haptics := true
var quality := 0
var last_error := ""
var test_mode := false

func _init(is_test: bool = false, storage_path: String = "user://medal_lounge_v1.json") -> void:
	test_mode = is_test
	path = storage_path
	if test_mode: return
	for candidate in [path, path+".bak"]:
		if not FileAccess.file_exists(candidate): continue
		var json := JSON.new()
		if json.parse(FileAccess.get_file_as_string(candidate)) != OK: continue
		var data = json.data
		if not data is Dictionary or data.get("version",0) != 1: continue
		balance = clampi(int(data.get("balance",600)),0,9999999)
		earned = maxi(0,int(data.get("earned",0)))
		shots = maxi(0,int(data.get("shots",0)))
		jackpots = maxi(0,int(data.get("jackpots",0)))
		refill_at = int(data.get("refill_at",0))
		tutorial_seen = bool(data.get("tutorial",false))
		machine = clampi(int(data.get("machine",0)),0,1)
		tables = data.get("tables",{}) if data.get("tables",{}) is Dictionary else {}
		audio = data.get("audio",audio) if data.get("audio",audio) is Dictionary else audio
		for key in ["music","room","effects"]: audio[key] = clampf(float(audio.get(key,0.5)),0,1)
		haptics = bool(data.get("haptics",true))
		quality = clampi(int(data.get("quality",0)),0,1)
		return

func save() -> bool:
	if test_mode: return true
	var data := {"version":1,"balance":balance,"earned":earned,"shots":shots,"jackpots":jackpots,
		"refill_at":refill_at,"tutorial":tutorial_seen,"machine":machine,"tables":tables,
		"audio":audio,"haptics":haptics,"quality":quality}
	var f := FileAccess.open(path+".tmp",FileAccess.WRITE)
	if f == null:
		last_error = "保存できません: " + error_string(FileAccess.get_open_error())
		return false
	f.store_string(JSON.stringify(data))
	f.flush()
	f.close()
	if FileAccess.file_exists(path):
		DirAccess.copy_absolute(path,path+".bak")
	var err := DirAccess.rename_absolute(path+".tmp",path)
	last_error = "" if err == OK else "保存できません: " + error_string(err)
	return err == OK

func spend() -> bool:
	if balance <= 0: return false
	balance -= 1
	shots += 1
	return true

func award(count: int) -> void:
	balance += count
	earned += count

func refill() -> bool:
	var now := int(Time.get_unix_time_from_system())
	if balance >= 100 or now < refill_at: return false
	balance += 300
	refill_at = now + 60
	return true
