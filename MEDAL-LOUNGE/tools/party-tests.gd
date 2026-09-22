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
	main.switch_machine(2)
	main.start_play(false)
	var m = main.table
	var slot = m.bonus_show
	check(m.kind == 2 and m.roulette_root == null,"party uses dedicated slot, not hidden roulette")
	check(slot.materials.size() == 3,"three independently animated reels")
	check(slot.confetti.multimesh.instance_count == 120,"confetti has fixed 120-instance budget")
	for name in ["symbols","marquee","stage","inlay"]:
		check(load("res://assets/generated/party/"+name+".png") is Texture2D,"generated texture loads: "+name)
	for i in 5:
		m.insert(i%2)
		for frame in 30: await physics_frame
	for frame in 130: await physics_frame
	check(m.audit.rail_exits == 5,"five physical rail deliveries detected")
	check(slot.rounds == 1 and slot.medal_count == 0,"five delivered medals start exactly one draw")
	check(slot.mode == "spin","draw actually animates over time")
	var pending: Array = slot.result.duplicate()
	var pending_reward: int = slot.reward
	var snap: Dictionary = m.serialize()
	check(snap.party.mode == "spin" and snap.party.result == pending,"in-flight result is saved before payout")
	main.switch_machine(0)
	check(main.table.kind == 0 and is_instance_valid(main.table.roulette_root),"old Royal machine remains available")
	main.switch_machine(2)
	main.start_play(false)
	m = main.table
	slot = m.bonus_show
	check(slot.result == pending and slot.reward == pending_reward,"resume does not reroll a saved draw")
	check(slot.mode == "spin" and slot.rounds == 1,"resume does not consume another stock")
	var old_clock: float = slot.clock
	m.set_simulation(false)
	slot.advance(1.0)
	check(slot.clock == old_clock,"pause freezes reels and show")
	m.set_simulation(true)
	var payouts: int = m.payout_left
	slot.advance(4.2)
	check(m.payout_left == payouts+pending_reward,"saved draw pays once when animation completes")
	slot.finish_spin()
	check(m.payout_left == payouts+pending_reward,"repeated completion does not duplicate payout")
	var result_state: Dictionary = slot.snapshot()
	slot.restore(result_state)
	slot.advance(7)
	check(m.payout_left == payouts+pending_reward,"restoring an already-paid result never pays again")
	var counts := [0,0,0,0,0,0,0]
	for roll in 100:
		var symbol: int = slot.symbol_for_roll(roll)
		counts[6 if symbol < 0 else symbol] += 1
	check(counts == [4,8,12,15,20,16,25],"all 100 electronic draw outcomes match documented weights")
	for symbol in 6:
		slot.mode = "spin"
		slot.result = [symbol,symbol,symbol]
		slot.reward = slot.PAYOUTS[symbol]
		payouts = m.payout_left
		slot.finish_spin()
		check(m.payout_left-payouts == slot.PAYOUTS[symbol],"three matching symbols dispense correct medals: %d"%symbol)
	check(slot.fever_spins == int(result_state.fever)+3,"disco awards three future doubled draws")
	check(slot.queued >= 3,"disco also adds three free stocks")
	slot.mode = "idle"
	slot.fever_spins = 3
	slot.queued = 3
	slot.start_spin()
	check(slot.multiplier == 2 and slot.fever_spins == 2 and slot.queued == 2,"fever consumes exactly one doubled draw")
	if slot.reward > 0:
		check(slot.reward == slot.PAYOUTS[slot.result[0]]*2,"fever multiplies actual physical payout")
	else: check(true,"fever can miss; it does not guarantee a win")
	slot.mode = "idle"
	slot.queued = 0
	slot.fever_spins = 0
	m.pending_colors.clear()
	m.capture_ball(1)
	for i in 501: m.process_transit(1.0/90)
	check(slot.queued == 3,"ball returns through visible transport and adds three stocks")
	slot.mode = "idle"
	slot.queued = 0
	for i in 23: slot.medal_arrived()
	check(slot.queued == 4 and slot.medal_count == 3,"busy slot retains stocks and partial five-medal progress")
	var slot_state: Dictionary = slot.snapshot()
	slot.restore(slot_state)
	check(slot.queued == 4 and slot.medal_count == 3,"stock and partial progress survive restore")
	m.insert(0)
	m.insert(1)
	var in_flight: Dictionary = m.serialize()
	check(in_flight.party_guided.size() == 2 and in_flight.coins.size() == m.coins.size(),"running rail medals saved separately, not duplicated as field coins")
	main.switch_machine(0)
	main.switch_machine(2)
	main.start_play(false)
	m = main.table
	slot = m.bonus_show
	check(m.guided.size() == 2 and slot.medal_count == 3,"resume preserves in-flight medals and uncredited progress")
	# Freeze the slot so we can count exactly one additional stock on rail arrival.
	slot.mode = "result"
	slot.result_left = 20
	var stock_before: int = slot.queued
	for i in 100: await physics_frame
	check(slot.queued == stock_before+1 and slot.medal_count == 0,"resumed rail arrivals credit the next spin exactly once")
	slot.queued = 4
	var disk_path := "user://party_qa_%d.json"%Time.get_ticks_usec()
	var disk = load("res://scripts/profile.gd").new(false,disk_path)
	disk.machine = 2
	disk.tables = {"2":m.serialize()}
	check(disk.save(),"party save writes isolated QA file")
	var readback = load("res://scripts/profile.gd").new(false,disk_path)
	check(readback.machine == 2 and readback.tables.has("2"),"disk profile recognizes third machine")
	check(readback.tables["2"].party.queue == 4,"disk save retains party stocks")
	DirAccess.remove_absolute(disk_path)
	# Verify natural play, no outcomes injected during this segment.
	main.new_game(2)
	main.start_play(false)
	m = main.table
	slot = m.bonus_show
	slot.rng.seed = 887766
	for i in 1800:
		if i%20 == 0: main.insert((i/20)%2)
		await physics_frame
	check(m.audit.rail_exits > 50 and slot.rounds >= 2,"20 seconds of normal insertion naturally triggers repeated slots")
	check(slot.hits > 0,"natural seeded play reaches a genuine winning result")
	check(m.payout_left > 0 or m.coins.size() > 500,"won medals reach payout queue or physical field")
	var finite := true
	for medal in m.coins:
		if not medal.position.is_finite(): finite = false
	check(finite,"party effects and payout preserve finite physics")
	print("PARTY AUDIT: rails=",m.audit.rail_exits," rounds=",slot.rounds," hits=",slot.hits," stock=",slot.queued," medals=",m.coins.size())
	main.sound.shutdown()
	print("PARTY TEST RESULT: ",passes," passes, ",failures," failures")
	quit(0 if failures == 0 else 1)
