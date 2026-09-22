extends SceneTree
var failures := 0
var passes := 0
func _initialize() -> void:
	run.call_deferred()
func check(value: bool, title: String) -> void:
	if value:
		passes += 1
		print("PASS: ",title)
	else:
		failures += 1
		push_error("FAIL: "+title)
func run() -> void:
	var main = load("res://scripts/main.gd").new()
	main.isolated_session = true
	root.add_child(main)
	for kind in 2:
		main.switch_machine(kind)
		var m = main.table
		m.set_simulation(false)
		await physics_frame
		var wheel = m.roulette_root
		check(wheel.pockets.size() == (5 if kind == 0 else 15),"correct number of physical pockets, machine %d"%kind)
		wheel.set_shutters(0.0)
		for frame in 3: await physics_frame
		var lid_center: Vector3 = m.ROULETTE_CENTER+Vector3(wheel.pockets[0].center.x,0,wheel.pockets[0].center.y)
		var lid_query := PhysicsRayQueryParameters3D.create(lid_center+Vector3(0,0.3,0),lid_center-Vector3(0,0.06,0),4)
		check(not m.get_world_3d().direct_space_state.intersect_ray(lid_query).is_empty(),"closed physical shutter blocks pocket %d"%kind)
		for pocket in wheel.pockets:
			var center: Vector3 = m.ROULETTE_CENTER+Vector3(pocket.center.x,0,pocket.center.y)
			wheel.set_shutters(1.0)
			await physics_frame
			var query := PhysicsRayQueryParameters3D.create(center+Vector3(0,0.3,0),center-Vector3(0,0.06,0),4)
			check(m.get_world_3d().direct_space_state.intersect_ray(query).is_empty(),"open collider: machine %d / track %d / hole %d"%[kind,pocket.stage,pocket.index])
			m.round_stage = pocket.stage
			m.pending_colors.clear()
			m.start_roulette()
			m.roulette_ball.position = center+Vector3(0,0.24,0)
			m.roulette_ball.linear_velocity = Vector3.ZERO
			m.roulette_ball.reset_physics_interpolation()
			var before: int = m.audit.pocket_hits
			for frame in 360:
				await physics_frame
				m.process_roulette(1.0/90)
				if m.audit.pocket_hits > before: break
			check(m.audit.pocket_hits == before+1,"gravity enters actual pocket: machine %d / track %d / hole %d"%[kind,pocket.stage,pocket.index])
			if is_instance_valid(m.roulette_ball):
				m.roulette_ball.queue_free()
				m.roulette_ball = null
			m.roulette_clock = -1
		for stage in wheel.stages:
			m.pending_colors.clear()
			m.round_stage = stage
			m.start_roulette()
			var before: int = m.audit.pocket_hits
			var seconds := 0.0
			for frame in 1800:
				await physics_frame
				m.process_roulette(1.0/90)
				seconds += 1.0/90
				if m.audit.pocket_hits > before: break
			print("NATURAL DRAW: machine=",kind," stage=",stage," seconds=",seconds)
			check(seconds >= 2.2,"closed shutters prevent premature result: machine %d / track %d"%[kind,stage])
			check(m.audit.pocket_hits > before,"unforced roulette reaches a physical pocket: machine %d / track %d"%[kind,stage])
			if is_instance_valid(m.roulette_ball):
				m.roulette_ball.queue_free()
				m.roulette_ball = null
			m.roulette_clock = -1
	# Color collection is a real rule, not an automatic jackpot override.
	main.switch_machine(0)
	var royal = main.table
	royal.set_simulation(false)
	royal.pending_colors.clear()
	royal.royal_colors = [false,false,false]
	var rounds: int = royal.audit.rounds
	for color in 3:
		royal.capture_ball(color)
		for frame in 500: royal.process_transit(1.0/90)
		check(royal.audit.rounds == rounds+(1 if color == 2 else 0),"Royal requires three colors: collected %d"%(color+1))
	var jackpot_before: int = main.profile.jackpots
	royal.resolve_roulette(0)
	check(main.profile.jackpots == jackpot_before,"three colors unlock draw, do not guarantee jackpot")
	check(not royal.royal_colors.has(true),"Royal starts a fresh collection after the draw")
	royal.resolve_roulette(2)
	check(royal.payout_multiplier == 2,"80 pocket grants next-draw multiplier")
	check(royal.serialize().multiplier == 2,"multiplier is saved across sessions")
	var payout_before: int = royal.payout_left
	royal.resolve_roulette(0)
	check(royal.payout_left == payout_before+40 and royal.payout_multiplier == 1,"next draw consumes multiplier exactly once")
	royal.resolve_roulette(2)
	payout_before = royal.payout_left
	royal.resolve_roulette(4)
	check(royal.payout_left == payout_before+360,"multiplier applies to physical jackpot payout")
	print("BONUS TEST RESULT: ",passes," passes, ",failures," failures")
	main.sound.shutdown()
	quit(0 if failures == 0 else 1)
