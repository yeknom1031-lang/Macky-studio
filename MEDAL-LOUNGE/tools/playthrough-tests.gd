extends SceneTree
var failures := 0
func _initialize() -> void: run.call_deferred()
func check(ok: bool, title: String) -> void:
	print("PASS: " if ok else "FAIL: ",title)
	if not ok: failures += 1
func run() -> void:
	var main = load("res://scripts/main.gd").new()
	main.isolated_session = true
	root.add_child(main)
	for kind in 2:
		main.new_game(kind)
		main.start_play(false)
		var m = main.table
		for frame in 8100:
			if frame%20 == 0: main.insert((frame/20)%2)
			if frame%180 == 0: m.set_angle((frame/180)%2,sin(frame*0.031))
			await physics_frame
			if frame%900 == 899:
				print("PLAY: machine=",kind," seconds=",(frame+1)/90," medals=",m.coins.size()," audit=",m.audit)
				var zones := [0,0,0,0]
				var highest := 0.0
				for medal in m.coins:
					zones[clampi(int(medal.position.z+2),0,3)] += 1
					highest = maxf(highest,medal.position.y)
				print("ZONES: ",zones," highest=",highest," pusher=",m.pusher.position)
		check(m.audit.wins > 0,"90 seconds of rail-only play produces collected medals %d"%kind)
		check(m.audit.balls > 0,"90 seconds of rail-only play collects a ball %d"%kind)
		check(m.audit.losses < m.audit.rail_exits,"side losses do not consume all insertions %d"%kind)
		if kind == 1: check(m.audit.tower_collapses > 0,"natural play topples a tower")
	print("PLAYTHROUGH RESULT: ",failures," failures")
	main.sound.shutdown()
	quit(0 if failures == 0 else 1)
