extends RefCounted

const Runs=preload("res://scripts/run_catalog.gd")
const Puzzles=preload("res://scripts/puzzle_catalog.gd")
var game
var tests

func check(value:bool,label:String) -> void:
	tests.check(value,label)

func solution_by_controls(p:Dictionary) -> Array:
	var sequence=[]
	match p.mode:
		"toggle":
			for i in range(p.answer.size()):
				if p.answer[i]==1:sequence.append(i)
		"rotate":
			for i in range(p.answer.size()):
				for turn in range(p.answer[i]):sequence.append(i)
		_:sequence=p.answer.duplicate()
	return sequence

func check_semantics(p:Dictionary) -> bool:
	match p.kind:
		0:return Puzzles.mask_value(p.answer,p.masks)==p.target and p.target>0
		1:
			for i in range(3):
				if posmod(p.inputs[i]+1,4)!=p.answer[i]:return false
		2:return Puzzles.weight_value(p.answer,p.weights)==p.target and p.answer.count(1)==3
		3:return Puzzles.weight_value(p.answer,p.weights)==p.target
		4:
			for i in range(1,4):
				if p.times[p.answer[i]]<=p.times[p.answer[i-1]]:return false
		5:return p.options[p.answer[0]]==p.base+(p.base+2)*2
		6:return p.answer[0]>=0 and p.answer[0]<6
		7:return p.answer.size()==4 and p.answer.has(0) and p.answer.has(1) and p.answer.has(2) and p.answer.has(3)
		8:
			var heading=0
			for i in range(3):
				heading=posmod(heading+p.answer[i],4)
				if heading!=p.target[i]:return false
		9:
			var degree=[0,0,0,0]
			var edges=[[0,1],[1,2],[2,3],[0,2],[1,3],[0,3]]
			for i in range(6):
				if p.answer[i]==1:
					degree[edges[i][0]]+=1
					degree[edges[i][1]]+=1
			return degree==[1,2,2,1] and Puzzles.weight_value(p.answer,p.weights)==p.target
	return true

func run(g,t) -> void:
	game=g
	tests=t
	var previous={}
	var pool_valid=true
	var swaps_valid=true
	var puzzles_valid=true
	var covered={}
	# Independent invariants over many seeds, not snapshots of one generated run.
	for seed_value in range(1,301):
		var roster=Runs.generate(seed_value*131,previous)
		var changed=0
		for group in range(3):
			var values=roster[Runs.KEYS[group]]
			var unique={}
			for v in values:
				unique[v]=true
				pool_valid=pool_valid and v>=0 and v<Runs.COUNTS[group]
				if not previous.is_empty() and not v in previous[Runs.KEYS[group]]:changed+=1
			pool_valid=pool_valid and unique.size()==Runs.ACTIVE[group]
		if not previous.is_empty():swaps_valid=swaps_valid and changed==20
		var state=roster.duplicate(true)
		state.anomaly_seed=seed_value*131
		state.campaign=true
		for id in range(1,9):
			var p=Puzzles.make(state,id)
			covered[p.kind]=true
			var controls=Puzzles.initial(p)
			puzzles_valid=puzzles_valid and not Puzzles.correct(p,controls) and check_semantics(p)
			for index in solution_by_controls(p):controls=Puzzles.change(p,controls,index)
			puzzles_valid=puzzles_valid and Puzzles.correct(p,controls)
		previous=roster
	check(pool_valid,"300 runs each contain exactly 30 spatial, 12 acoustic and 8 distinct puzzle families")
	check(swaps_valid,"All 299 consecutive new runs exchange exactly 20 of the 50 families")
	check(puzzles_valid and covered.size()==10,"2400 seeded puzzles have reachable solutions consistent with their rules; all ten families covered")
	# Real legacy-format JSON, with none of the newly introduced fields.
	var old_state={"room":3,"clues":[1,3],"key":false,"cipher":false,"powered":false,"anomaly_seed":77,"anomaly_index":4,"current_event":8}
	var legacy=game.Profile.new()
	legacy.path=game.profile.path+".legacy"
	var old_file=FileAccess.open(legacy.path,FileAccess.WRITE)
	old_file.store_string(JSON.stringify({"version":1,"state":old_state,"settings":{}}))
	old_file.close()
	check(legacy.load_profile() and not legacy.state.campaign and Puzzles.code(legacy.state)=="472" and legacy.state.clues==[1,3],"A genuine pre-v1.2 save retains its original cipher and requires no new calibrations")
	DirAccess.remove_absolute(legacy.path)
	game.begin_game(true)
	var first=game.profile.state.duplicate(true)
	game.begin_game(true)
	var count=0
	for key in Runs.KEYS:
		for v in game.profile.state[key]:
			if not v in first[key]:count+=1
	check(count==20,"The actual New Game action exchanges exactly 20 families")
	check(not game.submit_cipher(Puzzles.code(game.profile.state)),"The boundary cipher cannot bypass uncollected calibrated observations")
	# Exercise every puzzle through the same Button.pressed path used by the UI.
	for kind in range(10):
		game.profile.state.puzzle_pool[0]=kind
		game.profile.state.solved_stations=[]
		game.profile.state.station_controls={}
		await tests.relocate(1,Vector3(9,0.03,-7.8),0,-15)
		var hit=game.player.aim_query()
		check(hit.has("collider") and hit.collider.get_meta("action","")=="station","Puzzle family %d has a reachable physical observation station"%kind)
		game.interact()
		var panel=game.station_ui
		check(game.mode=="station" and not panel.submit(),"Puzzle family %d opens and safely rejects its initial state"%kind)
		game.advance_failure(10)
		panel.next_hint()
		panel.next_hint()
		check(not panel.hint.text.is_empty(),"Puzzle family %d supplies a full recovery hint"%kind)
		for index in solution_by_controls(panel.puzzle):panel.buttons[index].pressed.emit()
		check(panel.submit() and 1 in game.profile.state.solved_stations,"Puzzle family %d is solvable through actual UI controls"%kind)
	# A real generated campaign: calibrations, variable code, key, circuit, exit.
	game.begin_game(true)
	var seeds=game.profile.state.duplicate(true)
	for id in [1,3,4,2,5,6]:
		await tests.relocate(id,Vector3(9,0.03,-7.8),0,-15)
		game.interact()
		var panel=game.station_ui
		var actions=solution_by_controls(panel.puzzle)
		if id==1:
			panel.buttons[actions[0]].pressed.emit()
			var before=panel.controls.duplicate()
			game.save_game()
			var saved=game.Profile.new()
			saved.path=game.profile.path
			check(saved.load_profile() and saved.state.station_controls["1"]==before,"Partially adjusted station controls survive a real save/reload")
			check(saved.state.visual_pool==seeds.visual_pool and saved.state.puzzle_pool==seeds.puzzle_pool and saved.state.audio_pool==seeds.audio_pool,"All three run rosters survive a real save/reload without rerolling")
			panel.reset()
		for index in actions:panel.buttons[index].pressed.emit()
		check(panel.submit(),"Generated campaign calibrates station %02d"%id)
		game.resume_game()
	check(game.profile.state.solved_stations.size()==6 and game.profile.state.clues.size()==3,"Six calibrations include all three cipher observations")
	await tests.relocate(0,Vector3(-2.1,0.03,-27.5),0,-20)
	game.show_cipher()
	check(game.submit_cipher(Puzzles.code(game.profile.state)),"The generated observation code opens the physical key compartment")
	check(game.take_key(),"The new campaign awards its physical key")
	await tests.relocate(2,Vector3(-2.3,0.03,-27.5),0,-10)
	game.show_relay()
	game.relay_press(0)
	game.relay_press(2)
	check(game.relay_press(1),"Six calibrations plus the key allow the final boundary circuit")
	game.save_game()
	var continued=game.Profile.new()
	continued.path=game.profile.path
	check(continued.load_profile() and continued.state.solved_stations.size()==6 and continued.state.powered,"Calibrated stations and final circuit survive reload")
	await tests.relocate(0,Vector3(-28.5,0.03,-12),PI/2)
	game.interact()
	game.player.test_input=Vector2(0,-1)
	await tests.frames(45)
	game.player.test_input=Vector2.ZERO
	check(game.profile.state.escaped,"A generated campaign reaches the ending by physically crossing its hidden exit")
	# Each sound design is a loaded non-empty audio stream, and pause freezes it.
	var audio_ok=true
	game.sound.suspend(false)
	for id in range(20):
		game.sound.enter_space(id,game.player)
		await tests.frames(2)
		audio_ok=audio_ok and game.sound.entry_source.stream!=null and game.sound.entry_source.stream.get_length()>0.9
		game.sound.suspend(true)
		await tests.frames(2)
		audio_ok=audio_ok and (game.sound.entry_source.stream_paused or not game.sound.entry_source.playing)
		game.sound.suspend(false)
	check(audio_ok,"All 20 original audio designs load and pause correctly")

	game.sound.enter_space(0,game.player)
	game.sound.suspend(true)
	await tests.frames(4)
	check(game.sound.entry_source.stream_paused,"Pausing in the same frame as room entry also pauses the deferred 3D playback")
	game.sound.suspend(false)
