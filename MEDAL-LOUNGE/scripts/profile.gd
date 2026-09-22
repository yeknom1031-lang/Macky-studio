extends RefCounted
var path := "user://medal_lounge_v3.json"
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
var archive_dir := "user://medal_lounge_archives"
var last_archive := ""

func _init(is_test: bool = false, storage_path: String = "user://medal_lounge_v3.json") -> void:
	test_mode = is_test
	path = storage_path
	if test_mode: return
	var candidates := [path,path+".bak"]
	if path == "user://medal_lounge_v3.json" and not FileAccess.file_exists(path):
		candidates.append_array(["user://medal_lounge_v2.json","user://medal_lounge_v2.json.bak","user://medal_lounge_v1.json"])
	for candidate in candidates:
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
		machine = clampi(int(data.get("machine",0)),0,2)
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
	# Free play: count inserted medals, never charge or gate on the old wallet.
	shots += 1
	return true

func award(count: int) -> void:
	balance += count
	earned += count

func refill() -> bool:
	return true

func archive_current() -> bool:
	if test_mode: return true
	if not save(): return false
	var folder_error := DirAccess.make_dir_recursive_absolute(archive_dir)
	if folder_error != OK:
		last_error = "前のプレイを保管できません: "+error_string(folder_error)
		return false
	var name := archive_dir+"/run_%d_%d.json" % [int(Time.get_unix_time_from_system()),Time.get_ticks_usec()]
	var err := DirAccess.copy_absolute(path,name)
	if err != OK: last_error = "前のプレイを保管できません: "+error_string(err)
	else: last_archive = name
	return err == OK

func new_game(which: int) -> bool:
	if not archive_current(): return false
	tables = {}
	balance = 600
	earned = 0
	shots = 0
	jackpots = 0
	machine = which
	refill_at = 0
	return save()
