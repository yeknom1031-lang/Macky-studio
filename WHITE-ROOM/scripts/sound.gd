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
	play("step"+str(randi_range(1,3)),-15.0)

func volume(value:float) -> void:
	AudioServer.set_bus_volume_db(0,linear_to_db(maxf(value,0.0001)))

func stop_all() -> void:
	ambient.stop()
	ambient.stream=null
	for voice in effects:
		voice.stop()
		voice.stream=null
	streams.clear()
