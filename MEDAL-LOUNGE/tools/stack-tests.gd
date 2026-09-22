extends SceneTree
var failures := 0
var passes := 0
func _initialize() -> void: run.call_deferred()
func check(ok: bool, title: String) -> void:
	print("PASS: " if ok else "FAIL: ",title)
	if ok: passes += 1
	else: failures += 1
func run() -> void:
	var main = load("res://scripts/main.gd").new()
	main.isolated_session = true
	root.add_child(main)
	main.new_game(1)
	main.start_play(false)
	var m = main.table
	for i in 270: await physics_frame
	check(m.stacks.size() == 3,"three independent movable resting stacks")
	var groups := 0
	for medal in m.coins:
		if medal.get_meta("grouped",false): groups += 1
	check(groups == 296,"all 296 tower medals retain individual rendering")
	var saved: Dictionary = m.serialize()
	check(saved.stacks.size() == 3 and saved.layout == 3,"save contains aggregate poses and layout version")
	main.switch_machine(0)
	main.switch_machine(1)
	main.start_play(false)
	m = main.table
	check(m.stacks.size() == 3,"restore reconstructs all three resting stacks")
	for i in 270: await physics_frame
	check(m.audit.tower_collapses == 0,"restored towers remain stable during next pusher cycle")
	var stack = m.stacks[0]
	var original: Vector3 = stack.position
	stack.apply_central_impulse(Vector3(0,2,0))
	for i in 3: await physics_frame
	check(stack.position.distance_to(original) > 0.00001,"stack is movable, not fixed scenery")
	stack.rotation.x = 0.17
	for i in 3: await physics_frame
	check(m.audit.tower_collapses == 1,"physical tilt releases the central tower")
	var released := 0
	for medal in m.coins:
		if medal.get_meta("tower",false) and not medal.get_meta("grouped",false):
			if not medal.freeze and medal.collision_layer == 1: released += 1
	check(released == 252,"all 252 central medals become independent physical bodies")
	var released_body = null
	for medal in m.coins:
		if medal.get_meta("tower",false) and not medal.get_meta("grouped",false):
			released_body = medal
			break
	m.retire_coin(released_body)
	var reused = m.spawn_coin(Vector3(0,3,0),true)
	check(reused == released_body and reused.get_meta("stack_id") == -1 and not reused.get_meta("tower"),"pooled tower medal clears old membership on reuse")
	m.set_simulation(false)
	check(m.stacks[1].freeze,"pause freezes aggregate tower")
	m.set_simulation(true)
	check(not m.stacks[1].freeze,"resume unfreezes aggregate tower")
	check(m.restore_position([0,0.1,1.7],{}).is_equal_approx(Vector3(0,0.1,2.7)),"legacy lower bed maps to V3 depth")
	check(m.restore_position([0,0.5,-1.4],{}).is_equal_approx(Vector3(0,0.5,-1.4)),"legacy upper tier stays unchanged")
	print("STACK TEST RESULT: ",passes," passes, ",failures," failures")
	main.sound.shutdown()
	quit(0 if failures == 0 else 1)
