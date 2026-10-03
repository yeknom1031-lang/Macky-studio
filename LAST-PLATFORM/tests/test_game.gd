extends Node

const Run = preload("res://scripts/run_state.gd")
const Station = preload("res://scripts/station.gd")
var failures: Array = []
var checks = 0

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures.append(message)
		push_error(message)

func run_all(game: Node3D) -> void:
	var r = Run.new()
	check(r.tutorial and r.current == -1, "First platform must be normal.")
	var bag_before = r.bag.duplicate()
	var result = r.decide(true)
	check(not result.accepted and r.tutorial and r.bag == bag_before, "Tutorial return must not change state or consume an anomaly.")
	result = r.decide(false)
	check(result.accepted and not r.tutorial and r.progress == 0 and r.current >= 0, "Tutorial exit must start the first observation without counting it as a win.")
	for id in range(Run.CATALOG.size()):
		for returned in [true, false]:
			r = Run.new()
			r.tutorial = false
			r.progress = 3
			r.current = id
			result = r.decide(returned)
			check(result.correct == returned, "Anomaly %d must require returning." % id)
			check(r.progress == (4 if returned else 0), "Correct streak / reset for anomaly %d." % id)
			check((id in r.found) == returned, "Journal only records correctly identified anomalies.")
			check(not result.won, "A partial streak cannot win.")
	for returned in [true, false]:
		r = Run.new()
		r.tutorial = false
		r.current = -1
		r.progress = 4
		result = r.decide(returned)
		check(result.correct == not returned, "Normal platform requires moving forward.")
		check(r.progress == (0 if returned else 5), "Normal platform streak behavior.")
	r = Run.new()
	r.tutorial = false
	for i in range(7):
		result = r.decide(r.current >= 0)
		check(result.won == (i == 6), "Exactly seven consecutive decisions must win.")
	r = Run.new()
	var ids: Array = []
	for i in range(12):
		r.rounds = 0
		ids.append(r.draw())
	var unique = {}
	for id in ids:
		unique[id] = true
	check(ids.size() == 12 and unique.size() == 12, "The anomaly bag must not repeat until exhausted.")
	r.rounds = 3
	check(r.draw() == -1, "Every fourth observation is normal.")
	r.current = 5
	r.progress = 4
	r.found = [1, 3, 5]
	r.seconds = 62.5
	var restored = Run.new()
	var parsed = JSON.parse_string(JSON.stringify(r.serialize()))
	check(restored.restore(parsed), "JSON roundtrip must load.")
	check(restored.current == 5 and restored.progress == 4 and restored.found == r.found and restored.bag == r.bag, "Resume must preserve exact observation and remaining bag.")
	check(not restored.restore({"version": 1}), "Malformed save must be rejected.")
	parsed.current = 99
	check(not restored.restore(parsed), "Out-of-range anomaly must be rejected.")
	# Exercise scene construction for every anomaly, not just the catalog.
	game.setup_world()
	game.setup_ui()
	for id in range(-1, 12):
		game.rebuild(id)
		game.station.animate(0.1)
		check(game.station.name_sign.text == ("帰 れ" if id == 0 else "宵 凪"), "Station name must reset between anomalies.")
		check(is_instance_valid(game.station.clock_hand) and is_instance_valid(game.station.passenger), "Every platform must contain its normal reference objects.")
		if id == 2:
			check(game.station.bench.position.y > 0.8, "Floating bench must visibly leave the floor.")
		if id == 7:
			check(game.station.watchers.size() == 4, "Watcher anomaly must have four passengers.")
		await get_tree().process_frame
	game.rebuild(-1)
	game.player.spawn()
	game.player.enabled = true
	for i in range(15):
		await get_tree().physics_frame
	check(game.player.is_on_floor() and absf(game.player.position.y) < 0.05, "Player must stand on the platform floor.")
	game.player.position = Vector3(0, 0.01, -16.5)
	game.player.rotation.y = 0
	check(game.gate_target() == "exit", "Far gate must offer moving forward.")
	game.player.rotation.y = PI
	check(game.gate_target() == "", "Gate behind the player must not activate.")
	game.player.position.z = 16.5
	check(game.gate_target() == "return", "Near gate must offer returning.")
	game.player.position.x = 3.2
	check(game.gate_target() == "", "Player must be close to the gate.")
	game.player.enabled = false
	game.show_pause()
	check(game.mode == "pause" and not game.player.enabled, "Pause must stop movement.")
	game.show_settings("pause")
	game.show_journal()
	game.run.progress = 7
	game.show_ending()
	game.show_title()
	game.sound.stop_all()
	await get_tree().create_timer(0.1).timeout
	print("TEST_RESULT checks=", checks, " failures=", failures.size())
	get_tree().quit(0 if failures.is_empty() else 1)
