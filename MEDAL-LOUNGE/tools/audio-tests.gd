extends SceneTree
var passes := 0
var failures := 0
func _initialize() -> void: run.call_deferred()
func check(ok: bool, title: String) -> void:
	print("PASS: " if ok else "FAIL: ",title)
	if ok: passes += 1
	else: failures += 1
func run() -> void:
	var s = load("res://scripts/sound.gd").new()
	root.add_child(s)
	check(s.ready_audio,"audio test initializes actual sample mixer")
	if not s.ready_audio:
		quit(1)
		return
	var imported := 0
	for folder in ["casino","impact","interface","jingles","ambience"]:
		for file in ResourceLoader.list_directory(s.ROOT+folder):
			if not file.ends_with(".ogg"): continue
			var stream = load(s.ROOT+folder+"/"+file)
			check(stream is AudioStream and stream.get_length() > 0.01,"sample decodes: "+file)
			imported += 1
	check(imported == 66,"66 licensed samples packaged")
	for bank in s.banks:
		check(not s.banks[bank].is_empty() and s.choose(bank) != null,"sound bank resolves: "+bank)
	var first = s.choose("coin")
	check(s.choose("coin") != first,"consecutive medal hits vary sample")
	check(s.voices.size() == 24 and s.distant.size() == 8 and s.cues.size() == 4,"bounded pools reserve fanfare channels")
	var voice_nodes: int = s.get_child_count()
	s.set_party_mode(true)
	check(s.music.stream == s.party_music and is_equal_approx(s.party_music.get_length(),8.0),"party has original eight-second dance loop")
	s.set_party_mode(false)
	check(s.music.stream == s.normal_music,"switching away restores original BGM")
	for i in 4:
		s.set_party_mode(true)
		s.set_party_mode(false)
	check(s.get_child_count() == voice_nodes,"music switching reuses audio players")
	if "--party-audio" in OS.get_cmdline_user_args(): s.set_party_mode(true)
	var recorder := AudioEffectRecord.new()
	recorder.format = AudioStreamWAV.FORMAT_16_BITS
	var idx := AudioServer.get_bus_index("ML_Master")
	check(AudioServer.get_bus_effect(idx,0) is AudioEffectHardLimiter,"master has peak limiter")
	AudioServer.add_bus_effect(idx,recorder)
	# Record only game output, never microphone/system audio. Keep speaker output muted in QA.
	AudioServer.set_bus_mute(0,true)
	recorder.set_recording_active(true)
	s.set_machine_active(true)
	for i in 50:
		if i%5 == 0: s.play("insert",0.75,-0.5 if i%10 == 0 else 0.5)
		if i%3 == 0: s.play("coin",0.3)
		await create_timer(0.1).timeout
	s.roulette_start(0)
	for i in 65:
		s.roulette_update(0.1,i*0.1,2.0, i*0.4)
		await create_timer(0.1).timeout
	check(s.audit.gates == 1,"shutter-opening cue fires once per draw")
	check(s.duck < 0.4,"roulette ducks background music")
	s.roulette_result("advance")
	await create_timer(3.0).timeout
	s.roulette_start(2)
	for i in 40:
		s.roulette_update(0.1,i*0.1,2.3,i*0.5)
		await create_timer(0.1).timeout
	s.roulette_result("jackpot")
	for i in 50:
		if i%3 == 0: s.play("tower",0.32)
		if i%2 == 0: s.play("coin",0.3)
		await create_timer(0.1).timeout
	recorder.set_recording_active(false)
	var recording := recorder.get_recording()
	check(recording != null and recording.data.size() > 44100,"game bus recording contains PCM")
	if recording:
		var pcm := recording.data
		var peak := 0.0
		var squares := 0.0
		for i in range(0,pcm.size(),2):
			var sample := pcm.decode_s16(i)/32768.0
			peak = maxf(peak,absf(sample))
			squares += sample*sample
		var rms := sqrt(squares/(pcm.size()/2))
		print("AUDIO METRICS: peak=",peak," RMS=",rms," seconds=",recording.get_length())
		check(peak > 0.02 and peak < 0.95,"recorded mix is audible without digital clipping")
		check(rms > 0.008,"mix has sustained ambience, not only sparse clicks")
		recording.save_to_wav("res://docs/audio-preview-party.wav" if "--party-audio" in OS.get_cmdline_user_args() else "res://docs/audio-preview-v4.wav")
	s.roulette_start(1)
	s.set_machine_active(false)
	check(s.spin.stream_paused and s.tension.stream_paused,"modal pauses roulette loops")
	s.set_machine_active(true)
	check(not s.spin.stream_paused,"resume restores rolling loop")
	s.levels.effects = 0
	s.apply_levels()
	check(AudioServer.is_bus_mute(AudioServer.get_bus_index("ML_Effects")),"effect slider mutes all effect paths")
	check(s.spin.stream_paused,"effect mute pauses spin stem")
	s.levels.room = 0
	s.levels.music = 0
	s.apply_levels()
	check(AudioServer.is_bus_mute(AudioServer.get_bus_index("ML_Room")) and AudioServer.is_bus_mute(AudioServer.get_bus_index("ML_Music")),"room and music sliders fully mute")
	s.cancel_roulette()
	check(not s.spinning and not s.spin.playing and not s.tension.playing,"switching tables cancels roulette audio")
	check(s.audit.room_events >= 10,"distant cabinets create varied ongoing activity")
	s.shutdown()
	check(not s.ready_audio and not s.music.playing,"shutdown stops all streams")
	AudioServer.remove_bus_effect(idx,1)
	s.queue_free()
	await process_frame
	await process_frame
	print("AUDIO TEST RESULT: ",passes," passes, ",failures," failures")
	quit(0 if failures == 0 else 1)
