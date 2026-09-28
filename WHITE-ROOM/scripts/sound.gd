extends Node

var ambient:AudioStreamPlayer
var effects=[]
var streams={}
var next_voice=0
var reverb:AudioEffectReverb

func _ready() -> void:
	if AudioServer.get_bus_index("Room")<0:
		AudioServer.add_bus()
		var index=AudioServer.bus_count-1
		AudioServer.set_bus_name(index,"Room")
		reverb=AudioEffectReverb.new()
		reverb.room_size=0.9
		reverb.damping=0.48
		reverb.wet=0.35
		reverb.dry=0.9
		AudioServer.add_bus_effect(index,reverb)
	for name in ["step1","step2","step3","handle","close","confirm","key"]:
		streams[name]=load("res://assets/audio/"+name+".wav")
	for i in range(8):
		var voice=AudioStreamPlayer.new()
		voice.bus="Room"
		add_child(voice)
		effects.append(voice)
	ambient=AudioStreamPlayer.new()
	ambient.stream=load("res://assets/audio/air-v2.wav")
	ambient.stream.loop_mode=AudioStreamWAV.LOOP_FORWARD
	ambient.stream.loop_end=int(ambient.stream.get_length()*ambient.stream.mix_rate)
	ambient.volume_db=-20
	add_child(ambient)
	ambient.play()
	prepare_variations()

func set_space(id:int) -> void:
	if is_instance_valid(reverb):
		reverb.room_size=0.97 if id==6 else (0.74 if id==7 else 0.88)
		reverb.wet=0.43 if id in [3,6,8] else 0.3
	ambient.pitch_scale=0.92+0.025*(id%5)

func play(name:String,level:float=-12.0) -> void:
	var voice=effects[next_voice]
	next_voice=(next_voice+1)%effects.size()
	voice.stream=streams[name]
	voice.volume_db=level
	voice.pitch_scale=randf_range(0.96,1.04)
	voice.play()

func footstep(_speed:float) -> void:
	if acoustic_active and acoustic_id in [7,8,9]:
		heard_variation=true
		var voice=effects[next_voice]
		next_voice=(next_voice+1)%effects.size()
		voice.stream=variation_streams[acoustic_id]
		voice.volume_db=-11
		voice.pitch_scale=randf_range(0.95,1.05)
		voice.play()
		return
	play("step"+str(randi_range(1,3)),-15.0)

func volume(value:float) -> void:
	AudioServer.set_bus_volume_db(0,linear_to_db(maxf(value,0.0001)))

func stop_all() -> void:
	if is_instance_valid(entry_source):
		entry_source.stop()
		entry_source.stream=null
	ambient.stop()
	ambient.stream=null
	for voice in effects:
		voice.stop()
		voice.stream=null
	streams.clear()

var entry_source:AudioStreamPlayer3D
var variation_streams=[]
var acoustic_id=0
var acoustic_time=0.0
var acoustic_cycle=0
var acoustic_active=false
var heard_variation=false
var suspended=false

func _process(_delta:float) -> void:
	# A 3D play request starts on the next physics tick. Keep a pause requested
	# in that same frame applied once its playback actually exists.
	if suspended:
		if is_instance_valid(entry_source) and entry_source.playing:entry_source.stream_paused=true
		for voice in effects:
			if voice.playing:voice.stream_paused=true

func prepare_variations() -> void:
	for i in range(20):variation_streams.append(load("res://assets/audio/variations/%02d.wav"%i))
	entry_source=AudioStreamPlayer3D.new()
	entry_source.bus="Room"
	entry_source.max_distance=75
	entry_source.unit_size=22
	entry_source.volume_db=-12
	add_child(entry_source)

func enter_space(id:int,listener:Node3D) -> void:
	acoustic_id=id
	acoustic_time=0
	acoustic_cycle=0
	acoustic_active=true
	heard_variation=not id in [7,8,9]
	entry_source.stop()
	entry_source.stream=variation_streams[id]
	entry_source.global_position=listener.global_position+Vector3(0,1,-5)
	if not id in [7,8,9]:entry_source.play()
	ambient.volume_db=-26 if id==17 else -20
	if is_instance_valid(reverb):
		reverb.damping=0.82 if id in [8,17] else 0.48
		reverb.wet=0.12 if id==8 else (0.55 if id in [0,9,16] else 0.3)

func tick(delta:float,listener:Node3D) -> void:
	if not acoustic_active:return
	acoustic_time+=delta
	if acoustic_id==10 or acoustic_id==19:
		entry_source.global_position=Vector3(sin(acoustic_time*0.25)*20,5,cos(acoustic_time*0.25)*20)
	if acoustic_time>float(acoustic_cycle+1)*16 and not acoustic_id in [6,7,8,9,16]:
		acoustic_cycle+=1
		entry_source.global_position=Vector3(-18 if acoustic_cycle%2==0 else 18,7,-15)
		entry_source.play()

func suspend(paused:bool) -> void:
	suspended=paused
	if is_instance_valid(entry_source):entry_source.stream_paused=paused
	for voice in effects:voice.stream_paused=paused

func play_threat(stage:int,cause:int) -> void:
	var voice=effects[next_voice]
	next_voice=(next_voice+1)%effects.size()
	var choice=[3,3,0,12,13,12][stage]
	if stage==5:choice=[17,12,13][posmod(cause,3)]
	voice.stream=variation_streams[choice]
	voice.volume_db=-8 if stage==5 else -13
	voice.pitch_scale=0.72 if stage>=3 else 0.85
	voice.play()
