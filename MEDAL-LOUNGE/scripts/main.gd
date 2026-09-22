extends Node
const Machine = preload("res://scripts/machine.gd")
const Sound = preload("res://scripts/sound.gd")
const Profile = preload("res://scripts/profile.gd")
const GOLD := Color("d3b57c")
const INK := Color("0b1420")
const WHITE := Color("ecebe5")
var profile: RefCounted
var sound: Node
var table: Node3D
var canvas: CanvasLayer
var ui: Control
var hud: Control
var modal: Control
var balance_text: Label
var event_text: Label
var bonus_text: Label
var win_text: Label
var fps_text: Label
var rail_sliders: Array[HSlider] = []
var session_wins := 0
var save_clock := 0.0
var held_sides := [false,false]
var hold_clocks := [0.0,0.0]
var event_clock := 0.0
var active := false
var test_mode := false
var capture_path := ""
var startup_machine := -1
var auto_capture := false
var isolated_session := false
var capture_screen := "game"
var fatal_count := 0

func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg == "--test": test_mode = true
		if arg == "--sandbox": isolated_session = true
		if arg.begins_with("--capture="):
			capture_path = arg.trim_prefix("--capture=")
			auto_capture = true
		if arg == "--tower": startup_machine = 1
		if arg == "--royal": startup_machine = 0
		if arg.begins_with("--screen="): capture_screen = arg.trim_prefix("--screen=")
	profile = Profile.new(test_mode or auto_capture or isolated_session)
	sound = Sound.new()
	add_child(sound)
	sound.levels = profile.audio.duplicate()
	sound.apply_levels()
	canvas = CanvasLayer.new()
	add_child(canvas)
	ui = Control.new()
	ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(ui)
	if OS.get_name() == "iOS":
		var safe := DisplayServer.get_display_safe_area()
		var display := DisplayServer.window_get_size()
		var factor := display.x/540.0
		ui.offset_top = maxf(0,safe.position.y/factor-30)
		ui.offset_bottom = -maxf(0,(display.y-safe.end.y)/factor-20)
	var theme := Theme.new()
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Hiragino Sans","Noto Sans CJK JP","Arial"])
	theme.default_font = font
	theme.default_font_size = 18
	ui.theme = theme
	load_machine(profile.machine)
	build_hud()
	if startup_machine >= 0:
		if startup_machine != profile.machine: switch_machine(startup_machine)
		start_play(false)
	else: show_lobby()
	apply_quality()
	if test_mode: run_tests.call_deferred()
	elif auto_capture: capture_run.call_deferred()

func load_machine(which: int) -> void:
	table = Machine.new()
	add_child(table)
	table.setup(which,sound,profile.tables.get(str(which),{}))
	table.medal_won.connect(on_win)
	table.message.connect(notify_player)
	table.bonus_changed.connect(update_hud)
	table.jackpot.connect(on_jackpot)
	table.set_simulation(false)

func style(bg: Color = INK, border: Color = Color("394350"), radius: int = 14) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(1)
	s.set_corner_radius_all(radius)
	s.content_margin_left = 15
	s.content_margin_right = 15
	s.content_margin_top = 12
	s.content_margin_bottom = 12
	return s

func label(parent: Node, text: String, size: int = 20, color: Color = WHITE) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size",size)
	l.add_theme_color_override("font_color",color)
	parent.add_child(l)
	return l

func button(parent: Node, text: String, action: Callable, height: float = 52, accent: bool = false) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size.y = height
	b.add_theme_stylebox_override("normal",style(Color("562333") if accent else Color("142330"),GOLD if accent else Color("405362")))
	b.add_theme_stylebox_override("hover",style(Color("283745"),GOLD))
	b.add_theme_stylebox_override("pressed",style(Color("765937"),Color("f4d395")))
	b.add_theme_color_override("font_color",WHITE)
	b.add_theme_font_size_override("font_size",18)
	b.pressed.connect(action)
	parent.add_child(b)
	return b

func panel(parent: Node, anchor: int, offsets: Rect2) -> PanelContainer:
	var p := PanelContainer.new()
	parent.add_child(p)
	p.set_anchors_and_offsets_preset(anchor)
	p.offset_left = offsets.position.x
	p.offset_top = offsets.position.y
	p.offset_right = offsets.end.x
	p.offset_bottom = offsets.end.y
	p.add_theme_stylebox_override("panel",style(Color(0.025,0.045,0.067,0.94),Color("776348")))
	return p

func build_hud() -> void:
	if is_instance_valid(hud): hud.queue_free()
	rail_sliders.clear()
	hud = Control.new()
	ui.add_child(hud)
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var top := panel(hud,Control.PRESET_TOP_WIDE,Rect2(14,44,-28,73))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",10)
	top.add_child(row)
	button(row,"‹",show_lobby,45)
	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(box)
	label(box,"MEDAL LOUNGE",12,GOLD)
	balance_text = label(box,"◉  %s" % profile.balance,28)
	button(row,"設定",show_settings,44)
	var bonus := panel(hud,Control.PRESET_TOP_WIDE,Rect2(14,127,-28,49))
	var br := HBoxContainer.new()
	bonus.add_child(br)
	bonus_text = label(br,"",14,GOLD)
	bonus_text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	win_text = label(br,"WIN  0",16,Color("9fdfc5"))
	event_text = label(hud,"",18,Color("fff1c5"))
	event_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	event_text.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	event_text.offset_left = 20
	event_text.offset_right = -20
	event_text.offset_top = -280
	event_text.offset_bottom = -235
	event_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var lower := panel(hud,Control.PRESET_BOTTOM_WIDE,Rect2(14,-230,-28,198))
	var stack := VBoxContainer.new()
	lower.add_child(stack)
	var controls := HBoxContainer.new()
	controls.add_theme_constant_override("separation",22)
	stack.add_child(controls)
	for side in 2:
		var col := VBoxContainer.new()
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		col.add_theme_constant_override("separation",9)
		controls.add_child(col)
		var title := label(col,"LEFT RAIL" if side == 0 else "RIGHT RAIL",13,GOLD)
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		var slider := HSlider.new()
		slider.min_value = -1
		slider.max_value = 1
		slider.step = 0.015
		slider.value = table.angles[side]
		slider.custom_minimum_size = Vector2(170,40)
		slider.add_theme_stylebox_override("slider",style(Color("32414b"),Color("53626a"),4))
		slider.value_changed.connect(func(v):
			table.set_angle(side,v)
			table.select_rail(side)
			if active: sound.play("lever",0.18))
		col.add_child(slider)
		rail_sliders.append(slider)
		var b := button(col,"◉  1枚投入",func(): pass,62,true)
		b.button_down.connect(func():
			held_sides[side] = true
			hold_clocks[side] = 0.40
			insert(side))
		b.button_up.connect(func(): held_sides[side] = false)
	var help_row := HBoxContainer.new()
	stack.add_child(help_row)
	var note := label(help_row,"レバーを動かして狙う  •  長押しで連続投入",12,Color("a4afba"))
	note.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button(help_row,"?",show_help,30)
	fps_text = label(hud,"",10,Color("78848e"))
	fps_text.visible = OS.is_debug_build()
	fps_text.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	fps_text.offset_left = 20
	fps_text.offset_top = -26
	fps_text.offset_bottom = -10
	update_hud()

func update_hud() -> void:
	if not is_instance_valid(balance_text): return
	balance_text.text = "◉  %s" % profile.balance
	win_text.text = "WIN  %d" % session_wins
	if table.kind == 0:
		var n := 0
		for found in table.royal_colors:
			if found: n += 1
		bonus_text.text = "ROYAL  •  3色ボーナス  %d / 3" % n
	else:
		bonus_text.text = "IMPERIAL  •  ROUND %d / 3" % (table.round_stage+1)
	if table.payout_left > 0: bonus_text.text += "  /  払出 %d" % table.payout_left

func new_modal(title: String, subtitle: String) -> VBoxContainer:
	held_sides = [false,false]
	active = false
	table.set_simulation(false)
	if is_instance_valid(modal): modal.free()
	modal = Control.new()
	ui.add_child(modal)
	modal.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var shade := ColorRect.new()
	shade.color = Color(0.006,0.013,0.023,0.86)
	modal.add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var center := CenterContainer.new()
	modal.add_child(center)
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var p := PanelContainer.new()
	p.custom_minimum_size.x = 478
	p.add_theme_stylebox_override("panel",style(Color("0b1420"),Color("826b44"),20))
	center.add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation",16)
	p.add_child(v)
	label(v,"M E D A L   L O U N G E",14,GOLD)
	label(v,title,32)
	var sub := label(v,subtitle,15,Color("adb9c1"))
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	sub.custom_minimum_size.x = 420
	return v

func show_lobby() -> void:
	persist()
	var v := new_modal("銀の音が、夜を満たす。","2台のメダルマシン。レールを狙い、山を崩す。")
	label(v,"◉  %d MEDALS" % profile.balance,25,GOLD)
	for i in 2:
		var name_text := "01  ROYAL PUSHER" if i == 0 else "02  IMPERIAL TOWER"
		var description := "二段プッシャー × カラーボール抽選" if i == 0 else "積層タワー × 連続ルーレット"
		var card := button(v,name_text+"\n"+description,func():
			if profile.machine != i: switch_machine(i)
			start_play(not profile.tutorial_seen),104,i == profile.machine)
		card.add_theme_font_size_override("font_size",20)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",12)
	v.add_child(row)
	button(row,"遊び方",show_help).size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button(row,"設定",show_settings).size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button(v,"無料メダル補充 ＋300",refill,50)
	label(v,"累計獲得 %d  /  投入 %d  /  JP %d" % [profile.earned,profile.shots,profile.jackpots],13,Color("8797a4"))
	label(v,"ゲーム内メダルのみ・購入不要・自動保存",13,Color("8797a4"))

func switch_machine(which: int) -> void:
	held_sides = [false,false]
	profile.tables[str(profile.machine)] = table.serialize()
	table.free()
	profile.machine = which
	session_wins = 0
	load_machine(which)
	build_hud()

func start_play(tutorial: bool = false) -> void:
	if is_instance_valid(modal):
		modal.queue_free()
		modal = null
	active = true
	table.set_simulation(true)
	if tutorial: show_help()
	else: notify_player("レールを左右に振って、奥の上段を狙おう")

func show_help() -> void:
	var v := new_modal("レールを狙う。山を崩す。","メダルは縦向きでレールを転がり、奥の上段へ落ちます。")
	for item in [
		"01  左右のレバーをスライドして、投入方向を調整。",
		"02  「1枚投入」をタップ。長押しで連続投入。",
		"03  手前に落ちたメダルを獲得。横の溝は回収外。",
		"04  ボールを手前へ落とすと、リフトから物理抽選へ。",
		"05  ROYALは3色でJP。IMPERIALはJP枠を3回突破。",
		"06  払い出されたメダルとタワーも、手前へ落として獲得。"]:
		var l := label(v,item,17)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	button(v,"プレイを始める",func():
		profile.tutorial_seen = true
		start_play(),58,true)
	label(v,"Mac: A / Dで投入、← / →で選択レールを調整",12,Color("8797a4"))

func show_settings() -> void:
	var v := new_modal("音と画質","音楽・店内の環境音・機械音を個別に調整できます。")
	for pair in [["music","BGM"],["room","ゲームセンター環境音"],["effects","メダル・機械・電子音"]]:
		label(v,pair[1],16,GOLD)
		var slider := HSlider.new()
		slider.min_value = 0
		slider.max_value = 1
		slider.step = 0.02
		slider.value = sound.levels[pair[0]]
		slider.custom_minimum_size.y = 36
		slider.value_changed.connect(func(value):
			sound.levels[pair[0]] = value
			profile.audio = sound.levels.duplicate()
			sound.apply_levels())
		v.add_child(slider)
	var quality := OptionButton.new()
	quality.add_item("高画質 / 60 fps 目標")
	quality.add_item("最高画質 / 30 fps 目標")
	quality.select(profile.quality)
	quality.custom_minimum_size.y = 48
	quality.item_selected.connect(func(index):
		profile.quality = index
		apply_quality())
	v.add_child(quality)
	var vibration := CheckButton.new()
	vibration.text = "触覚フィードバック"
	vibration.button_pressed = profile.haptics
	vibration.toggled.connect(func(value): profile.haptics = value)
	v.add_child(vibration)
	button(v,"ゲームに戻る",func():
		persist()
		start_play(),56,true)
	button(v,"台選択へ",show_lobby)

func apply_quality() -> void:
	Engine.max_fps = 60 if profile.quality == 0 else 30
	get_viewport().msaa_3d = Viewport.MSAA_4X if profile.quality == 0 else Viewport.MSAA_8X
	get_viewport().scaling_3d_scale = 1.0

func insert(side: int) -> void:
	if not active: return
	if profile.balance <= 0:
		held_sides = [false,false]
		show_empty()
		return
	if table.insert(side):
		profile.spend()
		table.select_rail(side)
		if profile.haptics: Input.vibrate_handheld(12,0.2)
		update_hud()

func show_empty() -> void:
	var v := new_modal("メダルを補充しましょう","盤面はそのまま保存されています。無料で続けて遊べます。")
	button(v,"＋300 メダルを補充",refill,58,true)
	button(v,"台選択へ",show_lobby)

func refill() -> void:
	if profile.refill():
		persist()
		update_hud()
		start_play()
		notify_player("300枚を補充しました")
	else:
		var remaining := maxi(0,profile.refill_at-int(Time.get_unix_time_from_system()))
		var v := new_modal("無料メダル補充",("あと %d 秒で再補充できます。" % remaining) if remaining > 0 else "メダルが100枚未満になると300枚補充できます。")
		button(v,"ゲームへ戻る",func(): start_play(),54,true)

func on_win(count: int) -> void:
	profile.award(count)
	session_wins += count
	if profile.haptics and session_wins%5 == 0: Input.vibrate_handheld(22,0.35)
	update_hud()

func on_jackpot() -> void:
	profile.jackpots += 1
	if profile.haptics: Input.vibrate_handheld(240,0.8)
	var flash := ColorRect.new()
	flash.color = Color(0.9,0.68,0.28,0.22)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.add_child(flash)
	flash.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var tween := create_tween()
	tween.tween_property(flash,"color:a",0.0,1.4)
	tween.tween_callback(flash.queue_free)
	persist()

func notify_player(text: String) -> void:
	if is_instance_valid(event_text):
		event_text.text = text
		event_clock = 5.0

func persist() -> void:
	if not is_instance_valid(table): return
	profile.tables[str(profile.machine)] = table.serialize()
	if not profile.save(): notify_player(profile.last_error)

func _process(delta: float) -> void:
	if not is_instance_valid(table): return
	if active:
		for side in 2:
			if held_sides[side]:
				hold_clocks[side] -= delta
				if hold_clocks[side] <= 0:
					insert(side)
					hold_clocks[side] = 0.14
		save_clock += delta
		if save_clock > 12:
			save_clock = 0
			persist()
		if event_clock > 0:
			event_clock -= delta
			if event_clock <= 0: event_text.text = ""
		var dir := float(Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_LEFT))
		if dir != 0:
			var s: int = table.selected_side
			rail_sliders[s].value += dir*delta*0.7
		update_hud()
	if is_instance_valid(fps_text):
		fps_text.text = "%d FPS  •  %s  •  %d MEDALS ON FIELD" % [Engine.get_frames_per_second(),"METAL" if OS.get_name() in ["macOS","iOS"] else "3D",table.coins.size()]

func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode == KEY_A: insert(0)
		if event.physical_keycode == KEY_D: insert(1)
		if event.physical_keycode == KEY_ESCAPE:
			if active: show_settings()
			else: start_play()

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		persist()
		get_tree().quit()
	if what == NOTIFICATION_APPLICATION_PAUSED:
		held_sides = [false,false]
		persist()
		if active: show_settings()

func check(ok: bool, title: String) -> void:
	if not ok:
		fatal_count += 1
		push_error("FAIL: "+title)
	else: print("PASS: "+title)

func run_tests() -> void:
	start_play(false)
	check(table.rails.size() == 2,"exactly two rails")
	for i in 2:
		check(table.rail_starts[i].z > table.rail_ends[i].z,"rail travels front to rear %d"%i)
		check(table.rail_starts[i].y > table.rail_ends[i].y,"rail slopes down in world space %d"%i)
		check(table.rail_ends[i].z < -1.0,"outlet over upper tier %d"%i)
	var original: Vector3 = table.rail_ends[0]
	table.set_angle(0,0.8)
	check(table.rail_ends[0].x > original.x,"angle changes landing position")
	var before: int = profile.balance
	insert(0)
	check(profile.balance == before-1,"one medal charged per insert")
	for i in 130: await get_tree().physics_frame
	check(table.audit.rail_exits > 0,"upright guided medal released into physics")
	check(is_equal_approx(table.pusher.position.y,0.32),"pusher retains correct tier elevation")
	check(table.audit.losses < 5,"initial field does not explode or lose medals")
	insert(1)
	table.set_angle(1,-0.7)
	check(table.guided.back().end.is_equal_approx(table.rail_ends[1]+Vector3(0,0.147,0)),"rolling medal follows adjusted rail")
	for i in 100: await get_tree().physics_frame
	var collected_before: int = table.audit.wins
	table.spawn_coin(Vector3(0,-0.3,2.1))
	await get_tree().physics_frame
	await get_tree().physics_frame
	check(table.audit.wins == collected_before+1,"front collection awards one medal")
	var balance_before: int = profile.balance
	table.spawn_coin(Vector3(2.15,-0.3,0))
	await get_tree().physics_frame
	await get_tree().physics_frame
	check(profile.balance == balance_before,"side gutter does not award")
	table.spawn_ball(Vector3(1.5,-0.3,2.05),0)
	await get_tree().physics_frame
	await get_tree().physics_frame
	check(table.audit.balls > 0,"front ball is detected")
	var saved: Dictionary = table.serialize()
	check(saved.coins.size() == table.coins.size(),"all table medals serialized")
	check(saved.pending.size() > 0,"in-flight bonus preserved for resume")
	profile.tables["0"] = saved
	switch_machine(1)
	start_play(false)
	check(table.coins.size() >= 350,"tower machine contains real stacked medals")
	table.resolve_roulette(4)
	check(table.round_stage == 1,"first tower jackpot gate advances")
	table.resolve_roulette(4)
	table.resolve_roulette(4)
	check(profile.jackpots == 1 and table.payout_left >= 260,"third tower gate awards jackpot")
	table.pending_colors.clear()
	check(table.tower_left >= 98,"jackpot queues tower builder")
	table.tower_left = 7
	for i in 270: await get_tree().physics_frame
	check(table.audit.towers > 0,"builder transfers physical tower into field")
	var snapshot: Dictionary = table.serialize()
	switch_machine(0)
	start_play(false)
	check(table.coins.size() > 0 and table.pending_colors.size() > 0,"switch restores table and pending bonus")
	profile.balance = 0
	profile.refill_at = 0
	check(profile.refill() and profile.balance == 300,"free refill recovers empty balance")
	check(not profile.refill(),"refill cannot repeat immediately")
	check(snapshot.coins.size() > 300,"tower snapshot captures bodies")
	table.pending_colors.clear()
	if is_instance_valid(table.transit): table.transit.queue_free()
	table.transit_t = -1
	table.start_roulette()
	for i in 720: await get_tree().physics_frame
	check(table.roulette_clock < 0,"physical roulette completes and resolves")
	# Exercise actual file I/O in an isolated file, never the player's save.
	var test_path := "user://qa_%d.json" % Time.get_ticks_usec()
	var disk := Profile.new(false,test_path)
	disk.balance = 417
	disk.tables["0"] = saved
	check(disk.save(),"atomic save writes to disk")
	var restored := Profile.new(false,test_path)
	check(restored.balance == 417 and restored.tables.has("0"),"disk roundtrip restores balance and table")
	disk.balance = 416
	disk.save()
	var corrupt := FileAccess.open(test_path,FileAccess.WRITE)
	corrupt.store_string("incomplete save")
	corrupt.close()
	var backup := Profile.new(false,test_path)
	check(backup.balance == 417,"corrupt primary recovers previous backup")
	for suffix in ["",".bak",".tmp"]:
		if FileAccess.file_exists(test_path+suffix): DirAccess.remove_absolute(test_path+suffix)
	# Continuous play, payouts, physics and switch/resume under load.
	switch_machine(1)
	start_play(false)
	profile.balance = 2000
	table.payout_left += 200
	for frame in 2700:
		if frame%18 == 0: insert((frame/18)%2)
		if frame%180 == 0: table.set_angle((frame/180)%2,sin(frame*0.03))
		await get_tree().physics_frame
	check(table.coins.size() <= table.COIN_LIMIT,"30 second load test respects body limit")
	check(table.audit.rail_exits > 50,"continuous play releases over 50 medals")
	check(table.audit.wins > 0,"natural pusher motion produces collectable medals")
	var stable := true
	for b in table.coins:
		if not b.position.is_finite() or not b.linear_velocity.is_finite(): stable = false
	check(stable,"all rigid bodies remain finite under load")
	print("LOAD AUDIT: ",table.audit," active=",table.coins.size()," pool=",table.spare_coins.size())
	print("LOSS SAMPLES: ",table.loss_samples)
	print("TEST RESULT: %d failures" % fatal_count)
	finish_run(0 if fatal_count == 0 else 1)

func capture_run() -> void:
	for i in 180: await get_tree().physics_frame
	if capture_screen == "stress":
		profile.balance = 1000
		table.payout_left = 100
		for i in 1800:
			if i%15 == 0: insert((i/15)%2)
			if i%180 == 0: table.set_angle((i/180)%2,sin(i*0.04))
			await get_tree().physics_frame
		print("LOSS SAMPLES: ",table.loss_samples)
	if capture_screen == "lobby": show_lobby()
	elif capture_screen == "settings": show_settings()
	elif capture_screen == "help": show_help()
	else: insert(0)
	for i in 36: await get_tree().physics_frame
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var err := img.save_png(capture_path)
	var flying := 0
	for b in table.coins:
		if b.position.y > 1.8: flying += 1
	print("DIAGNOSTIC: high coins=",flying," audit=",table.audit," FPS=",Engine.get_frames_per_second())
	print("CAPTURE: ",capture_path," ",error_string(err))
	finish_run(0 if err == OK else 1)

func finish_run(code: int) -> void:
	active = false
	table.set_simulation(false)
	sound.shutdown()
	await get_tree().create_timer(0.15).timeout
	get_tree().quit(code)
