extends Node
## Sample-based cabinet mix. Source/licence manifest: assets/audio/CREDITS.md.
const ROOT := "res://assets/audio/"
const MAX_FX := 24
const MAX_ROOM := 8
var voices: Array[AudioStreamPlayer] = []
var distant: Array[AudioStreamPlayer] = []
var loops: Array[AudioStreamPlayer] = []
var cues: Array[AudioStreamPlayer] = []
var clips: Dictionary = {}
var banks: Dictionary = {}
var previous: Dictionary = {}
var music: AudioStreamPlayer
var room: AudioStreamPlayer
var spin: AudioStreamPlayer
var tension: AudioStreamPlayer
var levels := {"music":0.55,"room":0.45,"effects":0.75}
var rng := RandomNumberGenerator.new()
var last_collision := 0.0
var ready_audio := false
var machine_active := false
var spinning := false
var duck := 1.0
var result_hold := 0.0
var background_clock := 0.3
var spin_tick := 0.0
var gate_open := false
var last_roll := -1
var scene_stage := 0
var audit := {"starts":0,"gates":0,"results":0,"room_events":0,"played":0,"dropped":0}

func _ready() -> void:
	# Normal headless rule tests do not synthesize or decode audio.
	if DisplayServer.get_name() == "headless" and not "--audio-test" in OS.get_cmdline_user_args(): return
	rng.seed = 88127
	configure_buses()
	load_banks()
	if "--diagnostics" in OS.get_cmdline_user_args():
		print("AUDIO: ",clips.size()+1," imported samples; ",banks.size()," banks; pooled effects=",MAX_FX+MAX_ROOM+4)
	for kind in ["insert","coin","ball","win","lever","launch","tower"]:
		clips[kind] = effect(kind)
	for i in MAX_FX: voices.append(player("ML_Effects"))
	for i in MAX_ROOM: distant.append(player("ML_DistantL" if i%2 == 0 else "ML_DistantR"))
	for i in 4: cues.append(player("ML_Effects"))
	music = player("ML_Music")
	room = player("ML_Room")
	music.stream = music_loop()
	room.stream = ambience()
	loops.assign([music,room])
	var crowd := player("ML_Room")
	var recording := load(ROOT+"ambience/busy-room-breviceps.ogg") as AudioStreamOggVorbis
	recording.loop = true
	crowd.stream = recording
	crowd.volume_db = -10
	loops.append(crowd)
	spin = player("ML_Effects")
	spin.stream = rolling_loop()
	spin.volume_db = -24
	spin.play()
	spin.stream_paused = true
	tension = player("ML_Effects")
	tension.stream = tension_loop()
	tension.volume_db = -18
	tension.play()
	tension.stream_paused = true
	music.volume_db = -5
	room.volume_db = -12
	for loop in loops: loop.play()
	ready_audio = true
	apply_levels()

func player(bus: String) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.bus = bus
	add_child(p)
	return p

func bus(name: String, send: String = "Master") -> int:
	var idx := AudioServer.get_bus_index(name)
	if idx < 0:
		idx = AudioServer.bus_count
		AudioServer.add_bus()
		AudioServer.set_bus_name(idx,name)
		AudioServer.set_bus_send(idx,send)
	return idx

func configure_buses() -> void:
	var master := bus("ML_Master")
	if AudioServer.get_bus_effect_count(master) == 0:
		var limiter := AudioEffectHardLimiter.new()
		limiter.ceiling_db = -1.5
		AudioServer.add_bus_effect(master,limiter)
	bus("ML_Music","ML_Master")
	bus("ML_Room","ML_Master")
	bus("ML_Effects","ML_Master")
	for side in ["L","R"]:
		var near_bus := bus("ML_Near"+side,"ML_Effects")
		var far_bus := bus("ML_Distant"+side,"ML_Room")
		for idx in [near_bus,far_bus]:
			if AudioServer.get_bus_effect_count(idx) > 0: continue
			var pan := AudioEffectPanner.new()
			pan.pan = (-0.58 if side == "L" else 0.58) if idx == far_bus else (-0.3 if side == "L" else 0.3)
			AudioServer.add_bus_effect(idx,pan)
			if idx == far_bus:
				var lowpass := AudioEffectLowPassFilter.new()
				lowpass.cutoff_hz = 3400
				AudioServer.add_bus_effect(idx,lowpass)
				var reverb := AudioEffectReverb.new()
				reverb.room_size = 0.75
				reverb.wet = 0.22
				reverb.dry = 0.85
				AudioServer.add_bus_effect(idx,reverb)

func load_banks() -> void:
	for folder in ["casino","impact","interface","jingles"]:
		var paths := ResourceLoader.list_directory(ROOT+folder)
		for file in paths:
			if not file.ends_with(".ogg"): continue
			var key := file.get_basename()
			clips[key] = load(ROOT+folder+"/"+file)
	banks = {
		"button": matching("click_"),
		"insert": matching("chips-collide-"),
		"coin": matching("impactMetal_light_")+matching("chips-collide-"),
		"lever": matching("switch_"),
		"launch": matching("chips-handle-"),
		"ball": matching("confirmation_"),
		"win": ["jingles_STEEL00","jingles_STEEL01"],
		"tower": matching("chips-stack-")+matching("impactMetal_medium_"),
		"start": ["jingles_STEEL06"],
		"gate": matching("open_"),
		"pocket": matching("impactPlate_light_"),
		"advance": ["jingles_STEEL10"],
		"jackpot": ["jingles_STEEL16"],
		"tick": matching("tick_"),
		"rattle": matching("dice-shake-"),
		"room_chips": matching("chips-handle-")+matching("chips-stack-")+matching("dice-"),
		"room_ui": matching("select_")+matching("confirmation_"),
		"room_bell": matching("impactBell_heavy_"),
		"room_jingle": matching("jingles_")
	}

func matching(prefix: String) -> Array:
	var result: Array = []
	for key in clips:
		if str(key).begins_with(prefix): result.append(key)
	result.sort()
	return result

func choose(kind: String) -> AudioStream:
	var choices: Array = banks.get(kind,[])
	if choices.is_empty(): return clips.get(kind)
	var index := rng.randi_range(0,choices.size()-1)
	if choices.size() > 1 and index == previous.get(kind,-1): index = (index+1)%choices.size()
	previous[kind] = index
	return clips[choices[index]]

func play(kind: String, strength: float = 1.0, pan: float = 0.0) -> void:
	if not ready_audio or levels.effects <= 0: return
	var stream := choose(kind)
	if stream == null: return
	for p in voices:
		if not p.playing:
			p.bus = "ML_NearL" if pan < -0.1 else ("ML_NearR" if pan > 0.1 else "ML_Effects")
			p.stream = stream
			p.volume_db = linear_to_db(maxf(0.001,strength*0.48))
			p.pitch_scale = rng.randf_range(0.94,1.06) if kind != "win" else 1.0
			p.play()
			audit.played += 1
			return
	audit.dropped += 1

func cue(kind: String, slot: int, gain_db: float = -6.0) -> void:
	if not ready_audio or levels.effects <= 0: return
	var p := cues[slot]
	p.stop()
	p.stream = choose(kind)
	p.volume_db = gain_db
	p.pitch_scale = 1.0
	if p.stream: p.play()

func roulette_start(stage: int) -> void:
	spinning = true
	gate_open = false
	spin_tick = 0.0
	last_roll = -1
	scene_stage = stage
	result_hold = 0.0
	audit.starts += 1
	cue("start",0,-7)
	play("rattle",0.25)
	if ready_audio:
		spin.play()
		tension.play()
		spin.stream_paused = not machine_active or levels.effects <= 0
		tension.stream_paused = spin.stream_paused

func roulette_update(delta: float, clock: float, speed: float, angle: float) -> void:
	if not spinning: return
	if clock >= 2.2 and not gate_open:
		gate_open = true
		audit.gates += 1
		cue("gate",1,-6)
	spin_tick -= delta
	if spin_tick <= 0:
		spin_tick = clampf(0.18/(speed+0.25),0.07,0.23)
		play("tick",0.22+scene_stage*0.05,sin(angle)*0.5)
	if ready_audio:
		spin.pitch_scale = clampf(0.75+speed*0.25,0.8,1.5)
		spin.volume_db = -21 if gate_open else -25
		tension.pitch_scale = 1.0+scene_stage*0.07
		tension.volume_db = -14 if gate_open else -20

func roulette_result(result: String) -> void:
	spinning = false
	result_hold = 6.0 if result == "jackpot" else 3.0
	audit.results += 1
	if not ready_audio: return
	spin.stop()
	tension.stop()
	cues[0].stop()
	cue("pocket",1,-7)
	cue(result,2,-4 if result == "jackpot" else -7)
	if result == "jackpot": cue("room_bell",3,-13)

func cancel_roulette() -> void:
	spinning = false
	result_hold = 0.0
	if not ready_audio: return
	spin.stop()
	tension.stop()
	for p in cues: p.stop()

func set_machine_active(value: bool) -> void:
	machine_active = value
	if not ready_audio: return
	spin.stream_paused = not value or not spinning or levels.effects <= 0
	tension.stream_paused = spin.stream_paused
	for p in cues: p.stream_paused = not value

func _process(delta: float) -> void:
	if not ready_audio: return
	if machine_active: result_hold = maxf(0,result_hold-delta)
	var focus := machine_active and (spinning or result_hold > 0)
	duck = lerpf(duck,0.32 if focus else 1.0,minf(1,delta*3))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("ML_Music"),linear_to_db(maxf(0.001,levels.music*duck)))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("ML_Room"),linear_to_db(maxf(0.001,levels.room*(0.6 if focus else 1.0))))
	background_clock -= delta
	if background_clock <= 0 and levels.room > 0:
		background_clock = rng.randf_range(0.35,1.05)
		var kind: String = ["room_chips","room_chips","room_ui","room_bell","room_jingle"][rng.randi_range(0,4)]
		for p in distant:
			if p.playing: continue
			p.stream = choose(kind)
			p.volume_db = rng.randf_range(-23,-15) if kind != "room_jingle" else rng.randf_range(-26,-19)
			p.pitch_scale = rng.randf_range(0.93,1.07)
			p.play()
			audit.room_events += 1
			break

func contact(speed: float) -> void:
	var now := Time.get_ticks_msec()/1000.0
	if speed > 0.3 and now-last_collision > 0.055:
		last_collision = now
		play("coin",clampf(speed*0.15,0.12,0.55))

func apply_levels() -> void:
	if not ready_audio: return
	for key in ["music","room","effects"]: levels[key] = clampf(float(levels.get(key,0.5)),0,1)
	for pair in [["music","ML_Music"],["room","ML_Room"],["effects","ML_Effects"]]:
		var idx := AudioServer.get_bus_index(pair[1])
		AudioServer.set_bus_mute(idx,levels[pair[0]] <= 0)
		AudioServer.set_bus_volume_db(idx,linear_to_db(maxf(0.001,levels[pair[0]])))
	if levels.effects <= 0:
		for p in voices+cues: p.stop()
	set_machine_active(machine_active)

func rolling_loop() -> AudioStreamWAV:
	var n := 22050*2
	var data := PackedByteArray()
	data.resize(n*2)
	var filtered := 0.0
	for i in n:
		var t := i/22050.0
		filtered = filtered*0.72+rng.randf_range(-1,1)*0.28
		write_sample(data,i,(filtered*0.45+sin(TAU*176*t)*0.025)*(0.68+0.32*cos(TAU*14*t)))
	return wav(data,true)

func tension_loop() -> AudioStreamWAV:
	var n := 22050*4
	var data := PackedByteArray()
	data.resize(n*2)
	for i in n:
		var t := i/22050.0
		var step := int(t/0.125)%8
		var freq: float = [220.0,261.63,329.63,440.0,523.25,440.0,329.63,261.63][step]
		var tick := fmod(t,0.125)
		var beat := fmod(t,0.5)
		var value := sin(TAU*freq*t)*exp(-tick*32)*0.22
		value += sin(180*beat+8*(1-exp(-beat*40)))*exp(-beat*26)*0.26
		value += rng.randf_range(-1,1)*exp(-tick*85)*0.035
		write_sample(data,i,value)
	return wav(data,true)

func wav(data: PackedByteArray, loop: bool = false) -> AudioStreamWAV:
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = 22050
	w.data = data
	if loop:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_end = data.size()/2
	return w

func write_sample(data: PackedByteArray, i: int, value: float) -> void:
	data.encode_s16(i*2,int(clampf(value,-0.92,0.92)*32767.0))

func effect(kind: String) -> AudioStreamWAV:
	var duration := 0.22
	if kind == "win": duration = 1.4
	if kind == "tower": duration = 1.5
	if kind == "launch": duration = 0.45
	var count := int(duration*22050)
	var data := PackedByteArray()
	data.resize(count*2)
	for i in count:
		var t := i/22050.0
		var value := 0.0
		match kind:
			"coin", "insert":
				value = (sin(TAU*2317*t)+sin(TAU*3471*t)*0.6+sin(TAU*5123*t)*0.3)*exp(-t*30)*0.2
			"lever": value = rng.randf_range(-1,1)*exp(-t*100)*0.32
			"ball": value = sin(TAU*(780*t-400*t*t))*exp(-t*14)*0.38
			"launch":
				value = rng.randf_range(-1,1)*0.09*sin(t*340)*sin(PI*t/duration)
			"win":
				var notes := [523.25,659.25,783.99,1046.5,1318.5,1568.0]
				var step := mini(int(t/0.16),5)
				value = (sin(TAU*notes[step]*t)+sin(TAU*notes[step]*2*t)*0.2)*0.25*exp(-fmod(t,0.16)*9)*minf(1,(duration-t)*4)
			"tower":
				value = (rng.randf_range(-1,1)*0.35+sin(t*18900)*0.07)*pow(maxf(0,1-t/duration),0.5)*(0.5+0.5*sin(t*183))
		write_sample(data,i,value)
	return wav(data)

func music_loop() -> AudioStreamWAV:
	var duration := 8.0
	var data := PackedByteArray()
	data.resize(int(duration*22050)*2)
	var scale := [57,60,64,67,55,59,62,67,53,57,60,64,52,56,59,64]
	for i in int(duration*22050):
		var t := i/22050.0
		var note: int = scale[int(t/0.25)%16]
		var freq := 440.0*pow(2.0,(note-69)/12.0)
		var phase := fmod(t,0.25)
		var bell := (sin(TAU*freq*t)+sin(TAU*freq*2*t)*0.35)*exp(-phase*14)*0.13
		var bass_note: int = [33,31,29,28][int(t/2.0)%4]
		var bass_f := 440.0*pow(2.0,(bass_note-69)/12.0)
		var bass := sin(TAU*bass_f*t)*0.14*exp(-fmod(t,0.5)*5)
		var beat := fmod(t,0.5)
		var kick := sin(380*beat+20*(1-exp(-beat*30)))*exp(-beat*30)*0.22
		var hat := rng.randf_range(-1,1)*exp(-phase*100)*0.07
		write_sample(data,i,bell+bass+kick+hat)
	return wav(data,true)

func ambience() -> AudioStreamWAV:
	var duration := 6.0
	var data := PackedByteArray()
	data.resize(int(duration*22050)*2)
	for i in int(duration*22050):
		var t := i/22050.0
		var motor := sin(TAU*60*t)*0.04+sin(TAU*120*t)*0.017
		var chatter := sin(TAU*(1060+120*sin(t*TAU/3))*t)*pow(maxf(0,sin(t*TAU/1.5)),12)*0.027
		write_sample(data,i,motor+chatter+rng.randf_range(-0.01,0.01))
	return wav(data,true)


func _exit_tree() -> void:
	shutdown()

func shutdown() -> void:
	ready_audio = false
	for p in voices+distant+loops+cues+[spin,tension]:
		if is_instance_valid(p):
			p.stop()
			p.stream = null
	clips.clear()
	banks.clear()
