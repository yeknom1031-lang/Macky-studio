extends Node

var ambience: AudioStreamPlayer
var steps: AudioStreamPlayer
var cue: AudioStreamPlayer
var volume = 0.65

func _ready() -> void:
	ambience = AudioStreamPlayer.new()
	ambience.stream = load("res://assets/audio/platform.wav")
	add_child(ambience)
	ambience.volume_db = -13
	ambience.finished.connect(ambience.play)
	ambience.play()
	steps = AudioStreamPlayer.new()
	steps.stream = load("res://assets/audio/step.wav")
	add_child(steps)
	cue = AudioStreamPlayer.new()
	add_child(cue)
	set_volume(volume)

func set_volume(value: float) -> void:
	volume = value
	AudioServer.set_bus_volume_db(0, linear_to_db(maxf(value, 0.001)))
	AudioServer.set_bus_mute(0, value <= 0.001)

func footstep() -> void:
	steps.pitch_scale = randf_range(0.92, 1.09)
	steps.volume_db = -13
	steps.play()

func chime(correct: bool) -> void:
	cue.stream = load("res://assets/audio/accept.wav" if correct else "res://assets/audio/reject.wav")
	cue.volume_db = -12
	cue.play()

func stop_all() -> void:
	for stream in [ambience, steps, cue]:
		if is_instance_valid(stream):
			stream.stop()
			stream.stream = null
