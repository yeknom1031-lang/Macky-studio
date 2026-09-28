extends Node

var ambient:AudioStreamPlayer
var effects=[]
var streams={}
var next_voice=0

func _ready() -> void:
	for name in ["step1","step2","step3","handle","close","confirm","key"]:
		streams[name]=load("res://assets/audio/"+name+".wav")
	for i in range(8):
		var voice=AudioStreamPlayer.new()
		add_child(voice)
		effects.append(voice)
	ambient=AudioStreamPlayer.new()
	ambient.stream=load("res://assets/audio/room.wav")
	ambient.stream.loop_mode=AudioStreamWAV.LOOP_FORWARD
	ambient.stream.loop_end=int(ambient.stream.get_length()*ambient.stream.mix_rate)
	ambient.volume_db=-20
	add_child(ambient)
	ambient.play()

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
