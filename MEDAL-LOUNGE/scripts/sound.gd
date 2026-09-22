extends Node
## Original procedural audio. No external samples or licensing dependencies.
var voices: Array[AudioStreamPlayer] = []
var clips: Dictionary = {}
var music: AudioStreamPlayer
var room: AudioStreamPlayer
var levels := {"music":0.55,"room":0.45,"effects":0.75}
var rng := RandomNumberGenerator.new()
var last_collision := 0.0

func _ready() -> void:
	# Headless tests have no audio device and only exercise game rules.
	if DisplayServer.get_name() == "headless": return
	rng.seed = 88127
	for i in 16:
		var p := AudioStreamPlayer.new()
		add_child(p)
		voices.append(p)
	for k in ["insert","coin","ball","win","lever","launch","tower"]:
		clips[k] = effect(k)
	music = AudioStreamPlayer.new()
	room = AudioStreamPlayer.new()
	add_child(music)
	add_child(room)
	music.stream = music_loop()
	room.stream = ambience()
	apply_levels()
	music.play()
	room.play()

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

func play(kind: String, strength: float = 1.0) -> void:
	if not clips.has(kind) or levels.effects <= 0: return
	for p in voices:
		if not p.playing:
			p.stream = clips[kind]
			p.volume_db = linear_to_db(maxf(0.001,levels.effects*strength))
			p.pitch_scale = rng.randf_range(0.93,1.07) if kind != "win" else 1.0
			p.play()
			return

func contact(speed: float) -> void:
	var now := Time.get_ticks_msec()/1000.0
	if speed > 0.3 and now-last_collision > 0.035:
		last_collision = now
		play("coin",clampf(speed*0.15,0.12,0.6))

func apply_levels() -> void:
	if music:
		music.volume_db = linear_to_db(maxf(levels.music*0.55,0.001))
		music.stream_paused = levels.music <= 0
	if room:
		room.volume_db = linear_to_db(maxf(levels.room*0.5,0.001))
		room.stream_paused = levels.room <= 0
	if levels.effects <= 0:
		for voice in voices: voice.stop()

func _exit_tree() -> void:
	shutdown()

func shutdown() -> void:
	for player in voices:
		player.stop()
		player.stream = null
	if music:
		music.stop()
		music.stream = null
	if room:
		room.stop()
		room.stream = null
	clips.clear()
