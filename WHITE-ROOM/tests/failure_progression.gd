extends RefCounted

const Rules=preload("res://scripts/failure_rules.gd")
const Puzzles=preload("res://scripts/puzzle_catalog.gd")
var game
var tests

func check(condition:bool,label:String) -> void:
	tests.check(condition,label)

func run(g,t) -> void:
	game=g
	tests=t
	game.begin_game(true)
	var state=game.profile.state
	game.show_cipher()
	game.submit_cipher("")
	game.submit_cipher("1")
	game.submit_cipher(Puzzles.code(state))
	check(state.danger==0,"Incomplete cipher entry and missing observations are not counted as wrong answers")
	game.resume_game()
	await tests.relocate(1,Vector3(9,0.03,-7.8),0,-15)
	state.puzzle_pool[0]=7
	game.station_ui.open(game,1)
	game.station_ui.submit()
	game.station_ui.change(0)
	game.station_ui.reset()
	game.station_ui.next_hint()
	check(state.danger==0,"Incomplete sequences, selections, resets and hints do not increase danger")
	state.puzzle_pool[0]=0
	state.station_controls={}
	game.station_ui.open(game,1)
	game.station_ui.submit()
	check(state.danger==1 and game.mode=="hazard" and not game.player.enabled,"A confirmed wrong station answer starts danger stage one and blocks movement")
	game.station_ui.submit()
	game.submit_cipher("000")
	check(state.danger==1,"Repeated callbacks during one warning cannot stack extra mistakes")
	game.apply_danger(2)
	check(game.world_environment.environment.tonemap_exposure<1.0,"The room's rendered exposure actually decreases after a wrong answer")
	var elapsed=game.failure_sequence.elapsed
	game.pause_failure()
	game.advance_failure(100)
	await tests.frames(3)
	check(game.mode=="failure_pause" and game.failure_sequence.elapsed==elapsed,"Pause freezes the hazard animation instead of returning to gameplay")
	game.resume_failure()
	game.advance_failure(10)
	check(game.mode=="station" and is_zero_approx(game.room.floor_root.position.y+0.25),"A warning returns to the same puzzle and restores the floor")
	game.station_ui.submit()
	check(state.danger==2 and is_instance_valid(game.failure_sequence.shade),"The second mistake produces a visible approaching shadow")
	game.failure_sequence.tick(1.5)
	check(game.failure_sequence.shade.position.z> -6,"The warning shadow physically approaches the first-person camera")
	game.advance_failure(10)
	var restored_y=game.player.position.y
	game.station_ui.submit()
	game.failure_sequence.tick(1.35)
	check(state.danger==3 and game.room.floor_root.position.y< -0.8 and game.player.position.y<restored_y-0.5,"The third mistake lowers both the actual floor slab and the first-person viewpoint")
	game.advance_failure(10)
	check(is_equal_approx(game.player.position.y,restored_y),"A nonlethal floor drop restores the original player position")
	game.station_ui.submit()
	game.failure_sequence.tick(1.5)
	check(state.danger==4 and game.failure_sequence.slabs.size()==2 and absf(game.failure_sequence.slabs[0].position.x)<2,"The fourth mistake brings two monuments close without killing the player")
	game.advance_failure(10)
	check("次の誤答で死亡" in game.station_ui.feedback.text,"The last warning explicitly says that the next error is fatal")
	game.save_game()
	var restored=game.Profile.new()
	restored.path=game.profile.path
	check(restored.load_profile() and restored.state.danger==4 and restored.state.mistakes==4,"Danger and mistakes persist across real save/reload")
	var p=game.station_ui.puzzle
	for index in preload("res://tests/run_variations.gd").new().solution_by_controls(p):game.station_ui.change(index)
	check(game.station_ui.submit() and state.danger==2,"Solving the threatened puzzle reduces danger by two")
	game.finish_station(1,p.answer)
	check(state.danger==2,"Replaying an already solved station cannot repeatedly lower danger")
	# Every death variant is exercised through the actual wrong-answer path.
	for cause in range(3):
		game.begin_game(true)
		state=game.profile.state
		state.anomaly_seed=3000+cause
		state.danger=4
		state.clues=[1,3,4]
		state.solved_stations=[1,2,3,4,5,6]
		var seed_value=int(state.anomaly_seed)
		var roster=state.visual_pool.duplicate()
		var puzzle_roster=state.puzzle_pool.duplicate()
		var code=Puzzles.code(state)
		await tests.relocate(0,Vector3(-2.1,0.03,-27.5),0,-8)
		game.show_cipher()
		game.submit_cipher("000")
		check(state.dead and state.danger==5 and state.death_cause==cause and state.deaths==1,"Fatal error selects and persists death variant %d"%cause)
		var reloaded=game.Profile.new()
		reloaded.path=game.profile.path
		check(reloaded.load_profile() and reloaded.state.dead and reloaded.state.death_cause==cause,"Quitting during fatal variant %d cannot restore a living save"%cause)
		game.resume_game()
		check(game.mode=="hazard" and not game.open_door(0),"Fatal variant %d cannot be escaped through resume or door input"%cause)
		game.failure_sequence.tick(3.9)
		if cause==0:check(game.failure_sequence.shade.position.z> -0.3,"The fatal shadow reaches the camera")
		if cause==1:
			check(game.player.position.y< -10 and game.room.floor_root.position.y< -10,"The fatal floor drop descends beyond normal rescue height")
			await tests.frames(3)
			check(game.player.position.y< -10,"The player's ordinary fall recovery cannot cancel a scripted fatal fall")
		if cause==2:check(absf(game.failure_sequence.slabs[0].position.x)<1.05,"The monuments close to a lethal gap around the viewpoint")
		game.advance_failure(10)
		check(game.mode=="death" and not game.player.enabled,"Death variant %d reaches the death screen without free movement"%cause)
		if cause==0:
			game.pause_failure()
			game.advance_failure(100)
			check(game.death_elapsed==0,"Pausing the death screen stops the automatic restart countdown")
			game.resume_failure()
		if cause==1:
			game.profile=reloaded
			game.begin_game(false)
			check(game.mode=="death" and game.profile.state.dead,"Loading a fatal save resumes at the death screen")
		game.advance_failure(8.1)
		state=game.profile.state
		check(game.mode=="game" and state.room==0 and state.danger==0 and not state.dead,"Death variant %d automatically restarts at the first room"%cause)
		check(state.clues.is_empty() and state.solved_stations.is_empty() and not state.key and not state.cipher and not state.powered and not state.escaped,"Death variant %d resets all escape progress"%cause)
		check(state.anomaly_seed==seed_value and state.visual_pool==roster and state.puzzle_pool==puzzle_roster and Puzzles.code(state)==code,"Death variant %d preserves the world and answers so learned clues remain useful"%cause)
		check(state.deaths==1 and state.mistakes==0 and game.player.position.y>=0,"Death history persists while the new attempt starts safely")
	# Circuit mistakes and success share the same risk budget.
	state.clues=[1,3,4]
	state.solved_stations=[1,2,3,4,5,6]
	state.key=true
	state.cipher=true
	await tests.relocate(2,Vector3(-2.3,0.03,-27.5))
	game.show_relay()
	game.relay_press(1)
	check(state.danger==1,"A wrong final-circuit switch also increases danger")
	game.advance_failure(10)
	game.relay_press(0)
	check(state.danger==1,"A correct partial circuit cannot be farmed for recovery")
	game.relay_press(2)
	game.relay_press(1)
	check(state.danger==0 and state.powered,"Completing the final circuit restores safety and still permits escape")
	game.complete_escape()
	check(state.escaped and game.mode=="end","The penalty system preserves a successful ending after recovery")
