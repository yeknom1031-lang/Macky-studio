extends RefCounted

const Rules=preload("res://scripts/failure_rules.gd")
const Routes=preload("res://scripts/route_rules.gd")
const Puzzles=preload("res://scripts/puzzle_catalog.gd")
var game
var tests

func check(condition:bool,label:String) -> void:
	tests.check(condition,label)

func wrong_side() -> int:
	for side in range(4):
		if Routes.choice(game.profile.state,side)=="wrong":return side
	return -1

func run(g,t) -> void:
	game=g
	tests=t
	var finite=true
	var marks_valid=true
	var returns_valid=true
	var plans={}
	for seed_value in range(1,301):
		var state={"anomaly_seed":seed_value,"room":0}
		Routes.ensure(state)
		plans[str(state.route_rooms)+str(state.route_forward)]=true
		finite=finite and state.route_rooms.size()==11 and state.route_rooms[0]==0 and state.route_rooms[4]==0 and state.route_rooms[9]==2 and state.route_rooms[10]==0
		for id in range(1,9):finite=finite and state.route_rooms.count(id)==1
		for id in [1,3,4]:finite=finite and state.route_rooms.find(id)<4
		for index in range(11):
			state.route_index=index
			var forward_count=0
			for side in range(4):
				var choice=Routes.choice(state,side)
				var next=Routes.destination_index(state,side)
				finite=finite and next>=0 and next<11
				if choice=="forward":
					forward_count+=1
					marks_valid=marks_valid and Routes.mark(state,side)==Routes.GLYPHS[Routes.CLUES[state.route_clues[index]][0]]
					state.route_index=next
					returns_valid=returns_valid and Routes.choice(state,(side+2)%4)=="back" and Routes.destination_index(state,(side+2)%4)==index
					state.route_index=index
				elif choice=="wrong":finite=finite and next==index
				elif choice=="back":returns_valid=returns_valid and next==index-1 and Routes.mark(state,side)=="↶"
			marks_valid=marks_valid and forward_count==(1 if index<10 else 0)
	check(finite,"300 seeded routes are finite, visit every required room and keep every wrong door in the same checkpoint")
	check(marks_valid,"300 routes have exactly one clue-matching forward door until the final hidden exit")
	check(returns_valid,"Every forward transition has a matching safe return door at its physical entrance")
	check(plans.size()>250,"New seeds vary both room order and correct door directions")
	game.begin_game(true)
	var state=game.profile.state
	check(game.room.event_id==-1 and not game.sound.acoustic_active,"A fresh route starts without random visual or acoustic anomalies")
	game.player.position=Vector3(-3.25,0.03,-28.0)
	game.player.rotation.y=0
	game.player.camera.rotation.x=0
	await tests.frames(3)
	var hit=game.player.aim_query()
	check(hit.has("collider") and hit.collider.get_meta("action","")=="route_record","A real first-person ray can read the route plaque beside a door")
	game.interact()
	check(game.mode=="record","The route plaque opens the clue through normal interaction")
	game.resume_game()
	var index=int(state.route_index)
	var anomaly_index=int(state.anomaly_index)
	var wrong=wrong_side()
	await tests.face_door(wrong)
	check(game.open_door(wrong) and state.danger==1 and state.route_pending_wrong,"Opening a wrong door immediately charges one error before crossing")
	check(not game.open_door(wrong) and state.danger==1,"Repeated input during one door opening cannot stack mistakes")
	await tests.press_key(KEY_TAB)
	check(game.mode=="game","Journal input cannot interrupt an unresolved wrong-door opening")
	await tests.frames(70)
	check(game.mode=="hazard" and state.route_index==index,"Peeking without crossing still triggers the warning after the door closes")
	game.apply_danger(2)
	check(game.world_environment.environment.tonemap_exposure<1,"A wrong route visibly darkens the rendered room")
	var elapsed=game.failure_sequence.elapsed
	game.pause_failure()
	game.advance_failure(100)
	await tests.frames(3)
	check(game.mode=="failure_pause" and game.failure_sequence.elapsed==elapsed,"Pause freezes a route warning")
	game.resume_failure()
	game.advance_failure(10)
	check(game.mode=="game" and game.room.event_id>=0 and game.sound.acoustic_active,"The first wrong door activates spatial and acoustic anomalies in the same room")
	check(await tests.walk_door(wrong_side()),"The wrong door can be physically crossed")
	check(state.route_index==index and state.room==0 and state.route_furthest==0 and state.anomaly_index==anomaly_index,"Crossing a wrong door loops to the same checkpoint without advancing exploration")
	check(state.danger==2 and game.mode=="hazard","A second wrong route escalates the warning")
	game.failure_sequence.tick(1.5)
	check(is_instance_valid(game.failure_sequence.shade) and game.failure_sequence.shade.position.z> -6,"The second route error sends a black shadow toward the camera")
	game.advance_failure(10)
	await tests.face_door(wrong_side())
	var original_y=game.player.position.y
	game.open_door(wrong_side())
	game.close_door()
	game.failure_sequence.tick(1.35)
	check(state.danger==3 and game.room.floor_root.position.y< -0.8 and game.player.position.y<original_y-0.5,"The third wrong door lowers the real floor and first-person viewpoint")
	game.advance_failure(10)
	check(is_equal_approx(game.player.position.y,original_y),"A nonfatal sinking floor returns the player to the original height")
	game.open_door(wrong_side())
	game.close_door()
	game.failure_sequence.tick(1.5)
	check(state.danger==4 and game.failure_sequence.slabs.size()==2 and absf(game.failure_sequence.slabs[0].position.x)<2,"The fourth wrong door brings monuments close to the player")
	check("誤った扉" in Rules.status(state) and "死亡" in Rules.status(state),"The last safe stage explicitly warns that another wrong door is fatal")
	game.advance_failure(10)
	game.save_game()
	var reloaded=game.Profile.new()
	reloaded.path=game.profile.path
	check(reloaded.load_profile() and reloaded.state.route_rooms==state.route_rooms and reloaded.state.route_marks==state.route_marks and reloaded.state.danger==4,"The finite route, marks and accumulated danger survive a real save/reload")
	var forward=int(state.route_forward[0])
	game.open_door(forward)
	game.close_door()
	check(state.danger==4 and state.route_furthest==0,"Peeking through the correct door cannot farm recovery")
	await tests.walk_door(forward)
	check(state.route_index==1 and state.danger==2 and state.route_furthest==1,"Crossing a new correct route checkpoint lowers danger by two")
	check(not game.open_door(int(state.route_forward[1])) and state.danger==2,"An unfinished local observation blocks forward travel without counting an error")
	await tests.walk_door(Routes.back_side(state))
	check(state.route_index==0 and state.danger==2,"Safe backtracking does not add danger")
	await tests.walk_door(forward)
	check(state.route_index==1 and state.danger==2,"Returning to an already reached checkpoint cannot repeatedly heal danger")
	# Device trial-and-error does not contribute to route danger.
	var room_id=int(state.room)
	state.puzzle_pool[room_id-1]=0
	game.station_ui.open(game,room_id)
	game.station_ui.submit()
	check(state.danger==2 and game.mode=="station","A confirmed wrong device answer leaves route danger unchanged")
	var puzzle=game.station_ui.puzzle
	for action in preload("res://tests/run_variations.gd").new().solution_by_controls(puzzle):game.station_ui.change(action)
	check(game.station_ui.submit() and state.danger==2,"Solving a device does not replace the need to choose the right route")
	game.resume_game()
	# Quit during the one-second door window, then resume exactly one warning.
	game.begin_game(true)
	state=game.profile.state
	game.open_door(wrong_side())
	var saved=game.Profile.new()
	saved.path=game.profile.path
	check(saved.load_profile() and saved.state.route_pending_wrong and saved.state.danger==1,"An unclosed wrong door saves its pending warning immediately")
	game.profile=saved
	game.begin_game(false)
	check(game.mode=="hazard" and game.profile.state.danger==1 and not game.profile.state.route_pending_wrong,"Reloading a pending wrong door resumes one warning without another penalty")
	game.advance_failure(10)
	# Exercise each fatal animation via actual door selection, not device callbacks.
	for cause in range(3):
		game.begin_game(true)
		state=game.profile.state
		state.anomaly_seed=3000+cause
		state.danger=4
		state.clues=[1,3,4]
		state.solved_stations=[1,2,3,4,5,6]
		state.key=true
		var original=state.duplicate(true)
		game.open_door(wrong_side())
		check(state.dead and state.danger==5 and state.death_cause==cause and state.deaths==1,"Wrong door persists fatal variant %d as soon as the knob is turned"%cause)
		var fatal_save=game.Profile.new()
		fatal_save.path=game.profile.path
		check(fatal_save.load_profile() and fatal_save.state.dead,"Quitting in the fatal door window cannot restore a living save for variant %d"%cause)
		game.close_door()
		game.resume_game()
		check(game.mode=="hazard" and not game.open_door(0),"Fatal variant %d cannot be bypassed with resume or another door"%cause)
		game.failure_sequence.tick(3.9)
		if cause==0:check(game.failure_sequence.shade.position.z> -0.3,"The fatal shadow reaches the camera")
		if cause==1:
			check(game.player.position.y< -10 and game.room.floor_root.position.y< -10,"The fatal floor drops beyond normal rescue height")
			await tests.frames(3)
			check(game.player.position.y< -10,"Ordinary fall recovery cannot cancel a scripted fatal fall")
		if cause==2:check(absf(game.failure_sequence.slabs[0].position.x)<1.05,"The monuments close around the viewpoint")
		game.advance_failure(10)
		check(game.mode=="death" and not game.player.enabled,"Fatal variant %d reaches the death screen"%cause)
		if cause==0:
			game.pause_failure()
			game.advance_failure(100)
			check(game.death_elapsed==0,"Pausing the death screen stops automatic restart")
			game.resume_failure()
		if cause==1:
			game.profile=fatal_save
			game.begin_game(false)
			check(game.mode=="death" and game.profile.state.dead,"Loading the fatal door save resumes the death screen")
		game.advance_failure(8.1)
		state=game.profile.state
		check(game.mode=="game" and state.route_index==0 and state.route_furthest==0 and state.room==0 and state.danger==0 and not state.dead,"Fatal variant %d restarts safely at the first checkpoint"%cause)
		check(state.clues.is_empty() and state.solved_stations.is_empty() and not state.key and not state.powered and not state.escaped,"Fatal variant %d clears all escape progress"%cause)
		check(state.route_rooms==original.route_rooms and state.route_forward==original.route_forward and state.route_marks==original.route_marks and Puzzles.code(state)==Puzzles.code(original) and state.visual_pool==original.visual_pool,"Fatal variant %d preserves routes, door marks and answers for learning"%cause)
		check(state.deaths==1 and state.route_errors==0 and state.mistakes==0,"Death history persists while the new attempt resets route errors")
	await full_route()

func full_route() -> void:
	game.begin_game(true)
	var state=game.profile.state
	for index in range(11):
		check(state.route_index==index and state.room==state.route_rooms[index],"Physical route reaches checkpoint %02d"%(index+1))
		var id=int(state.room)
		if id in [1,2,3,4]:
			game.station_ui.open(game,id)
			for action in preload("res://tests/run_variations.gd").new().solution_by_controls(game.station_ui.puzzle):game.station_ui.change(action)
			check(game.station_ui.submit(),"Checkpoint %02d device remains solvable"%(index+1))
			game.resume_game()
		if index==4:
			game.show_cipher()
			game.submit_cipher("000")
			check(state.danger==0,"Wrong cipher input does not affect route danger")
			check(game.submit_cipher(Puzzles.code(state)) and game.take_key(),"The middle origin checkpoint yields the key")
		if id==2:
			check(state.solved_stations.size()==4 and not game.open_door(int(state.route_forward[index])) and state.danger==0,"Insufficient calibrations block the last forward door without punishment")
			# The player may skip optional devices, then recover them via safe returns.
			for step in range(2):
				check(await tests.walk_door(Routes.back_side(state)),"Safe return reaches a previously skipped calibration")
				game.station_ui.open(game,int(state.room))
				for action in preload("res://tests/run_variations.gd").new().solution_by_controls(game.station_ui.puzzle):game.station_ui.change(action)
				check(game.station_ui.submit(),"A skipped observation remains solvable after backtracking")
				game.resume_game()
			for step in range(2):await tests.walk_door(int(state.route_forward[int(state.route_index)]))
			check(state.route_index==9 and state.solved_stations.size()==6 and state.danger==0,"Six calibrations are sufficient after a safe return to the circuit")
			game.show_relay()
			game.relay_press(1)
			check(state.danger==0,"Wrong circuit input does not affect route danger")
			game.relay_press(0)
			game.relay_press(2)
			check(game.relay_press(1),"The penultimate checkpoint restores power")
		if index<10:
			check(await tests.walk_door(int(state.route_forward[index])),"The marked forward door is usable at checkpoint %02d"%(index+1))
			check(state.danger==0 and game.room.event_id==-1,"Following the correct route avoids random anomalies at checkpoint %02d"%(index+1))
	check(state.powered and state.key and state.solved_stations.size()==6,"The finite route reaches the exit with exactly six of eight calibrations")
	check("西壁" in Routes.clue(state),"The last route clue directs the player to the hidden exit")
	game.player.position=Vector3(-28.5,0.03,-12)
	game.player.rotation.y=PI/2
	game.player.camera.rotation.x=0
	await tests.frames(3)
	game.interact()
	game.player.test_input=Vector2(0,-1)
	await tests.frames(45)
	game.player.test_input=Vector2.ZERO
	check(state.escaped and game.mode=="end","An entire generated finite route ends by physically walking through the hidden door")
