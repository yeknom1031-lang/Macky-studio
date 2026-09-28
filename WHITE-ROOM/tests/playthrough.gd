extends Node

var checks=[]
var failed=0
var game

func check(condition:bool,message:String) -> void:
	checks.append({"passed":condition,"check":message})
	if not condition:failed+=1
	print("PASS " if condition else "FAIL ",message)

func frames(count:int) -> void:
	for i in range(count):await get_tree().physics_frame

func press_key(code:Key) -> void:
	var event=InputEventKey.new()
	event.keycode=code
	event.physical_keycode=code
	event.pressed=true
	Input.parse_input_event(event)
	await get_tree().process_frame
	event=event.duplicate()
	event.pressed=false
	Input.parse_input_event(event)
	await get_tree().process_frame

func relocate(id:int,at:Vector3,yaw:float=0.0,pitch:float=0.0) -> void:
	game.profile.state.room=id
	game.build_room(id)
	game.player.position=at
	game.player.rotation.y=yaw
	game.player.pitch=pitch
	game.player.camera.rotation.x=deg_to_rad(pitch)
	game.player.velocity=Vector3.ZERO
	game.player.test_input=Vector2.ZERO
	game.resume_game()
	await frames(3)

func run(g) -> void:
	game=g
	game.profile.path="user://white_room_test_"+str(Time.get_ticks_usec())+".json"
	game.begin_game(true)
	await frames(4)
	check(game.room.doors.size()==4,"Each room has four human-scale hinged doors")
	check(game.room.exit_door.concealed,"Exit starts concealed")
	check(not game.open_door(3,true),"Exit cannot open before the circuit is restored")
	check(not game.take_key(),"A key cannot be taken before solving the cipher")
	check(not game.relay_press(0),"The circuit cannot be solved without the key")
	var reached={0:true}
	var pending=[0]
	while not pending.is_empty():
		var id=int(pending.pop_front())
		for side in range(4):
			var other=game.neighbor(id,side)
			check(game.neighbor(other,(side+2)%4)==id,"Door graph is reversible: %d/%d"%[id,side])
			if not reached.has(other):
				reached[other]=true
				pending.append(other)
	check(reached.size()==9,"All nine rooms and all puzzle locations are reachable")
	await relocate(0,Vector3(0,0.03,-28.5))
	var hit=game.player.aim_query()
	check(hit.has("collider") and hit.collider.get_meta("action","")=="door","The real first-person ray detects the closed door")
	game.player.test_input=Vector2(0,-1)
	await frames(35)
	check(game.player.position.z> -29.8 and game.profile.state.room==0,"A closed door blocks actual player motion")
	game.player.test_input=Vector2.ZERO
	game.player.position=Vector3(0,0.03,-28.5)
	check(game.open_door(0),"The first door opens")
	check(not game.open_door(1),"A second door cannot open simultaneously")
	game.player.test_input=Vector2(0,-1)
	await frames(37)
	game.player.test_input=Vector2.ZERO
	check(game.profile.state.room==6,"Walking through the north door reaches the connected room")
	check(game.player.position.z>20 and game.player.position.z<30.4,"Portal traversal keeps the player inside the next room")
	await frames(34)
	check(not is_instance_valid(game.active_door),"The opened door is closed after one second")
	check(game.room.doors.all(func(d):return is_zero_approx(d.openness)),"Every visible door is closed after its timer")
	await relocate(6,Vector3(0,0.03,28.5),PI)
	game.open_door(2)
	game.player.test_input=Vector2(0,-1)
	await frames(37)
	game.player.test_input=Vector2.ZERO
	check(game.profile.state.room==0,"Physically returning through a door reaches the original room")
	await frames(35)
	# Pause at an open threshold: closing must resolve penetration on the safe side.
	await relocate(0,Vector3(0,0.03,-28.5))
	game.open_door(0)
	await frames(16)
	game.player.position=Vector3(0,0.03,-30.1)
	game.show_pause()
	check(game.player.position.z> -29.5,"Closing while paused at a threshold cannot trap the player")
	check(game.mode=="pause" and not game.player.enabled,"Pause releases gameplay input")
	game.resume_game()
	for id in [1,3,4]:
		await relocate(id,Vector3(9,0.03,-7.8),0,-15)
		hit=game.player.aim_query()
		check(hit.has("collider") and hit.collider.get_meta("action","")=="clue","Observation %d can be read through the real interaction ray"%id)
		game.interact()
		check(id in game.profile.state.clues,"Observation %d is saved in the journal"%id)
		game.resume_game()
	check(game.profile.state.clues.size()==3,"All three clues collected")
	await relocate(0,Vector3(-2.1,0.03,-27.5),0,-8)
	game.show_cipher()
	check(not game.submit_cipher("123") and not game.profile.state.cipher,"Wrong cipher leaves the puzzle retryable")
	# A focused button must not swallow Enter after keyboard entry.
	var keypad_buttons=game.modal.find_children("*","Button",true,false)
	keypad_buttons[0].grab_focus()
	await press_key(KEY_4)
	await press_key(KEY_7)
	await press_key(KEY_1)
	await press_key(KEY_BACKSPACE)
	await press_key(KEY_2)
	check(game.number_input=="472","Keyboard digits and Backspace work with a focused keypad button")
	await press_key(KEY_ENTER)
	check(game.profile.state.cipher and game.mode=="game","Enter submits the correct code through normal input dispatch")
	check(game.room.key_visual.visible,"The key appears in the 3D scene after unlocking")
	game.player.pitch=-20
	game.player.camera.rotation.x=deg_to_rad(-20)
	await frames(3)
	hit=game.player.aim_query()
	check(hit.has("collider") and hit.collider.get_meta("action","")=="key","The revealed physical key can be targeted separately from the cipher panel")
	game.interact()
	check(game.profile.state.key,"The key is picked up through normal interaction")
	await relocate(2,Vector3(-2.3,0.03,-27.5),0,-10)
	game.show_relay()
	check(game.profile.state.relay_unlocked,"The collected key unlocks the circuit")
	game.relay_press(1)
	check(game.relay_input.is_empty() and not game.profile.state.powered,"Wrong circuit order resets safely")
	game.relay_press(0)
	game.relay_press(2)
	check(game.relay_press(1) and game.profile.state.powered,"The correct switch order restores boundary power")
	game.save_game()
	var reloaded=game.Profile.new()
	reloaded.path=game.profile.path
	check(reloaded.load_profile(),"Progress reloads from a real save file")
	check(reloaded.state.powered and reloaded.state.key and reloaded.state.clues.size()==3,"Reload preserves the full puzzle state")
	game.profile.save()
	var corrupt=FileAccess.open(game.profile.path,FileAccess.WRITE)
	corrupt.store_string("{broken")
	corrupt.close()
	var recovered=game.Profile.new()
	recovered.path=game.profile.path
	check(recovered.load_profile() and recovered.state.powered,"A corrupted primary save recovers from its backup")
	await relocate(0,Vector3(-28.5,0.03,-12),PI/2)
	check(not game.room.exit_door.concealed,"Returning to the origin reveals the hidden wooden door")
	hit=game.player.aim_query()
	check(hit.has("collider") and hit.collider.get_meta("action","")=="exit","The revealed exit is reachable by the normal interaction ray")
	game.interact()
	game.player.test_input=Vector2(0,-1)
	await frames(45)
	game.player.test_input=Vector2.ZERO
	check(game.profile.state.escaped and game.mode=="end","Walking through the unlocked hidden door completes the game")
	for suffix in ["",".bak",".tmp"]:
		DirAccess.remove_absolute(game.profile.path+suffix)
	var report={"engine":Engine.get_version_info().string,"checks":checks,"failed":failed,"passed":checks.size()-failed,"coverage":"Actual player collision and door traversal, interaction rays, all puzzle stages, save reload and backup recovery, ending"}
	var file=FileAccess.open("res://docs/test-results.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(report,"\t"))
	file.close()
	print("TEST RESULT: ",checks.size()-failed," passed; ",failed," failed")
	await game.quit_game(0 if failed==0 else 1)
