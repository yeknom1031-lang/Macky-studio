extends SceneTree
var samples: Array[float] = []
var physics_samples: Array[float] = []
func _initialize() -> void:
	run.call_deferred()
func run() -> void:
	var main = load("res://scripts/main.gd").new()
	main.isolated_session = true
	root.add_child(main)
	main.switch_machine(1)
	main.start_play(false)
	main.table.payout_left = 180
	Engine.max_fps = 0
	for i in 150: await process_frame
	var start := Time.get_ticks_usec()
	for i in 600:
		if i%12 == 0: main.insert(i%2)
		await process_frame
		samples.append(Performance.get_monitor(Performance.TIME_PROCESS)*1000)
		physics_samples.append(Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS)*1000)
	var elapsed_ms := (Time.get_ticks_usec()-start)/1000.0
	samples.sort()
	physics_samples.sort()
	print("BENCH ",JSON.stringify({"frames":600,"wall_ms":elapsed_ms,"process_p50_ms":samples[300],"process_p95_ms":samples[570],"physics_p50_ms":physics_samples[300],"physics_p95_ms":physics_samples[570],"draw_calls":Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),"objects":Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME),"primitives":Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME),"coins":main.table.coins.size(),"nodes":Performance.get_monitor(Performance.OBJECT_NODE_COUNT)}))
	main.sound.shutdown()
	await create_timer(0.2).timeout
	quit()
