extends SceneTree

func _initialize() -> void:
	call_deferred("run_probe")

func run_probe() -> void:
	var game=load("res://main.tscn").instantiate()
	root.add_child(game)
	game.automated=true
	game.profile.path="user://white_room_gpu_probe.json"
	game.profile.fresh()
	game.profile.state.room=3
	game.profile.state.current_event=7
	game.begin_game(false)
	game.apply_settings()
	game.player.enabled=false
	game.player.position=Vector3(-21,0.05,22)
	game.player.rotation.y=-0.32
	game.player.camera.rotation.x=deg_to_rad(10)
	game.hud.visible=false
	var rid=game.get_viewport().get_viewport_rid()
	RenderingServer.viewport_set_measure_render_time(rid,true)
	var report=[]
	var driver="vulkan" if "vulkan" in OS.get_cmdline_args() else "metal"
	for gi in [true,false]:
		game.profile.settings.gi=gi
		game.apply_settings()
		var gpu=[]
		var cpu=[]
		var deltas=[]
		for frame in range(65):
			await process_frame
			RenderingServer.force_draw(false)
			if frame>35:
				gpu.append(RenderingServer.viewport_get_measured_render_time_gpu(rid))
				cpu.append(RenderingServer.viewport_get_measured_render_time_cpu(rid)+RenderingServer.get_frame_setup_time_cpu())
				deltas.append(game.get_process_delta_time()*1000)
		var gpu_time=average(gpu)
		var sample={"gi":gi,"gpu_ms":gpu_time if gpu_time>0 else null,"gpu_timer_available":gpu_time>0,"render_cpu_ms":average(cpu),"frame_interval_ms":average(deltas)}
		report.append(sample)
		print("RENDER PROBE ",JSON.stringify(sample))
	var file=FileAccess.open("res://docs/render-probe-"+driver+".json",FileAccess.WRITE)
	file.store_string(JSON.stringify({"engine":Engine.get_version_info().string,"driver":driver,"samples":report},"\t"))
	file.close()
	for suffix in ["",".bak",".tmp"]:DirAccess.remove_absolute(game.profile.path+suffix)
	await game.quit_game()

func average(values:Array) -> float:
	var total=0.0
	for value in values:total+=value
	return total/maxi(values.size(),1)
