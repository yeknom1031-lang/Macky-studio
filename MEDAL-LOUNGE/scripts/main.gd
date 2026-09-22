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
var event_text: Label
var fps_text: Label
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
var pointers: Dictionary = {}
var hud_clock := 0.0

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
	var backdrop_layer := CanvasLayer.new()
	backdrop_layer.layer = -2
	add_child(backdrop_layer)
	var backdrop := TextureRect.new()
	backdrop.texture = load("res://assets/generated/arcade-background.png")
	backdrop.modulate = Color(0.58,0.62,0.68,1.0)
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	backdrop_layer.add_child(backdrop)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
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
	hud = Control.new()
	ui.add_child(hud)
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var top := HBoxContainer.new()
	hud.add_child(top)
	top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	top.offset_left = 16
	top.offset_right = -16
	top.offset_top = 8
	top.offset_bottom = 44
	button(top,"台選択",show_lobby,36).add_theme_font_size_override("font_size",14)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(spacer)
	button(top,"遊び方",show_help,36).add_theme_font_size_override("font_size",14)
	button(top,"設定",show_settings,36).add_theme_font_size_override("font_size",14)
	event_text = label(hud,"",15,Color("e4eceb"))
	event_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	event_text.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	event_text.offset_left = 20
	event_text.offset_right = -20
	event_text.offset_top = -75
	event_text.offset_bottom = -25
	event_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	event_text.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fps_text = label(hud,"",10,Color("879398"))
	fps_text.visible = "--diagnostics" in OS.get_cmdline_user_args()
	fps_text.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	fps_text.offset_left = 20
	fps_text.offset_top = -20
	update_hud()

func update_hud() -> void:
	if not is_instance_valid(table) or not is_instance_valid(table.counter_label): return
	table.counter_label.text = "FREE PLAY\nOUT  %05d" % session_wins

	if is_instance_valid(table.status_label):
		var colors := 0
		for collected in table.royal_colors:
			if collected: colors += 1
		table.status_label.text = "COLORS  %d / 3"%colors if table.kind == 0 else "STAGE  %d / 3"%(table.round_stage+1)
		if table.kind == 0 and table.payout_multiplier == 2: table.status_label.text += "  ×2"

func new_modal(title: String, subtitle: String) -> VBoxContainer:
	reset_inputs()
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
	var v := new_modal("台を選んでください","FREE PLAY ・ メダルの消費、補充待ちはありません。")
	for i in 2:
		label(v,"ROYAL PUSHER" if i == 0 else "IMPERIAL TOWER",22,GOLD)
		label(v,"二段プッシャー・3色ボール" if i == 0 else "銀メダルタワー・連続抽選",14,Color("a4b4bc"))
		var actions := HBoxContainer.new()
		actions.add_theme_constant_override("separation",12)
		v.add_child(actions)
		button(actions,"新規でプレイ",func(): new_game(i),56,true).size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button(actions,"続きから",func():
			if profile.machine != i: switch_machine(i)
			start_play(not profile.tutorial_seen),56).size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",12)
	v.add_child(row)
	button(row,"遊び方",show_help,44).size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button(row,"保存したプレイ",show_archives,44).size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label(v,"新規プレイ時、これまでのデータは別に保管します。",13,Color("91a0aa"))

func new_game(which: int) -> void:
	persist()
	if not profile.new_game(which):
		notify_player(profile.last_error)
		return
	table.free()
	session_wins = 0
	load_machine(which)
	build_hud()
	start_play(not profile.tutorial_seen)

func show_archives() -> void:
	var v := new_modal("保存したプレイ","以前の盤面を読み込めます。現在のプレイも保管されます。")
	var folder := "user://medal_lounge_archives"
	var files := DirAccess.get_files_at(folder) if DirAccess.dir_exists_absolute(folder) else PackedStringArray()
	files.sort()
	files.reverse()
	var displayed := 0
	for filename in files:
		if not filename.begins_with("run_") or not filename.ends_with(".json"): continue
		var timestamp := int(filename.split("_")[1])
		var date := Time.get_datetime_string_from_unix_time(timestamp+9*3600).replace("T"," ")
		button(v,date,func(): restore_archive(folder+"/"+filename),44)
		displayed += 1
		if displayed >= 6: break
	if displayed == 0: label(v,"保管されたプレイはまだありません。",16)
	button(v,"台選択へ",show_lobby,48)

func restore_archive(path: String) -> void:
	persist()
	if not profile.archive_current():
		notify_player(profile.last_error)
		return
	var restored = Profile.new(false,path)
	restored.path = "user://medal_lounge_v3.json"
	profile = restored
	sound.levels = profile.audio.duplicate()
	sound.apply_levels()
	apply_quality()
	table.free()
	session_wins = 0
	load_machine(profile.machine)
	build_hud()
	start_play()
	persist()

func switch_machine(which: int) -> void:
	reset_inputs()
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
	else: notify_player("黒いレバーをドラッグして狙う・赤い実機ボタンで投入")

func show_help() -> void:
	var v := new_modal("レールを狙う。山を崩す。","メダルは縦向きでレールを転がり、奥の上段へ落ちます。")
	for item in [
		"01  筐体の黒いレバーを左右にドラッグして狙う。",
		"02  赤いMEDALボタンを押す。長押しで連続投入。",
		"03  手前に落ちたメダルを獲得。横の溝は回収外。",
		"04  ボールを手前へ落とすと、回収レーン・リフトへ。",
		"05  ROYALは3色で抽選。IMPERIALはJP枠を3回突破。",
		"06  メダルは無制限。補充や購入は不要です。"]:
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
	if table.insert(side):
		profile.spend()
		table.select_rail(side)
		if profile.haptics: Input.vibrate_handheld(12,0.2)
		update_hud()

func on_win(count: int) -> void:
	profile.award(count)
	session_wins += count
	if profile.haptics and session_wins%5 == 0: Input.vibrate_handheld(22,0.35)
	update_hud()

func on_jackpot() -> void:
	profile.jackpots += 1
	if profile.haptics: Input.vibrate_handheld(240,0.8)
	# Celebration belongs to the physical cabinet; keep the medal field unobscured.
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
		var dir := float(Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_LEFT))
		if dir != 0:
			var s: int = table.selected_side
			table.set_angle(s,table.angles[s]+dir*delta*0.7)
		for side in 2:
			table.press_caps[side].position.y = lerpf(table.press_caps[side].position.y,0.555 if held_sides[side] else 0.59,minf(1,delta*24))
		hud_clock += delta
		if hud_clock > 0.2:
			hud_clock = 0.0
			update_hud()
			if event_clock <= 0: event_text.text = table.bonus_show.player_hint()
			if is_instance_valid(fps_text) and fps_text.visible:
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
		reset_inputs()
		persist()
		if active: show_settings()
	if what == NOTIFICATION_WM_WINDOW_FOCUS_OUT:
		reset_inputs()

func reset_inputs() -> void:
	held_sides = [false,false]
	hold_clocks = [0.0,0.0]
	pointers.clear()
	if not is_instance_valid(table): return
	for cap in table.press_caps: cap.position.y = 0.59

func _input(event: InputEvent) -> void:
	# GUI controls may consume releases before _unhandled_input sees them.
	# Release ownership here, including OS-cancelled touches, without consuming UI input.
	if event is InputEventScreenTouch and (not event.pressed or event.canceled):
		pointer_up(event.index)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		pointer_up(-100)
	elif event is InputEventScreenDrag:
		pointer_move(event.index,event.position)
	elif event is InputEventMouseMotion:
		pointer_move(-100,event.position)

func _unhandled_input(event: InputEvent) -> void:
	if not active: return
	if event is InputEventScreenTouch:
		if event.pressed and not event.canceled: pointer_down(event.index,event.position)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed: pointer_down(-100,event.position)

func pointer_down(id: int, pos: Vector2) -> void:
	if not active or pointers.has(id): return
	var radius := get_viewport().get_visible_rect().size.x*0.066
	for side in 2:
		var cap: Vector2 = table.camera.unproject_position(table.press_caps[side].global_position)
		if pos.distance_to(cap) <= radius:
			pointers[id] = {"side":side,"mode":"button"}
			held_sides[side] = true
			hold_clocks[side] = 0.40
			insert(side)
			return
	for side in 2:
		var knob: Vector2 = table.camera.unproject_position(table.rails[side].handle.global_position)
		if pos.distance_to(knob) <= radius:
			# One owner per lever avoids jumps when a second finger touches it.
			for action in pointers.values():
				if action.mode == "rail" and action.side == side: return
			pointers[id] = {"side":side,"mode":"rail","x":pos.x,"angle":table.angles[side]}
			table.select_rail(side)
			return

func pointer_move(id: int, pos: Vector2) -> void:
	if not pointers.has(id): return
	var action: Dictionary = pointers[id]
	if action.mode == "button":
		var cap: Vector2 = table.camera.unproject_position(table.press_caps[action.side].global_position)
		# Hysteresis keeps small finger movement comfortable; a deliberate slide cancels.
		if pos.distance_to(cap) > get_viewport().get_visible_rect().size.x*0.10:
			pointer_up(id)
	if action.mode == "rail":
		var width := get_viewport().get_visible_rect().size.x
		table.set_angle(action.side,action.angle+(pos.x-action.x)/width*4.5)

func pointer_up(id: int) -> void:
	if not pointers.has(id): return
	var side: int = pointers[id].side
	pointers.erase(id)
	held_sides[side] = false
	for action in pointers.values():
		if action.side == side and action.mode == "button": held_sides[side] = true

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
	check(profile.balance == before and profile.shots == 1,"free play records insert without wallet consumption")
	for i in 130: await get_tree().physics_frame
	check(table.audit.rail_exits > 0,"upright guided medal released into physics")
	check(is_equal_approx(table.pusher.position.y,0.32),"pusher retains correct tier elevation")
	check(table.audit.losses < 5,"initial field does not explode or lose medals")
	insert(1)
	table.set_angle(1,-0.7)
	check(table.guided.back().end.is_equal_approx(table.rail_ends[1]+Vector3(0,0.147,0)),"rolling medal follows adjusted rail")
	for i in 100: await get_tree().physics_frame
	var collected_before: int = table.audit.wins
	table.spawn_coin(Vector3(0,-0.3,table.FRONT_EDGE+0.4))
	await get_tree().physics_frame
	await get_tree().physics_frame
	check(table.audit.wins == collected_before+1,"front collection awards one medal")
	var balance_before: int = profile.balance
	table.spawn_coin(Vector3(2.15,-0.3,0))
	await get_tree().physics_frame
	await get_tree().physics_frame
	check(profile.balance == balance_before,"side gutter does not award")
	table.spawn_ball(Vector3(1.5,-0.3,table.FRONT_EDGE+0.4),0)
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
	for i in 270: await get_tree().physics_frame
	var stacked := 0
	for medal in table.coins:
		if medal.position.y > 0.65 and absf(medal.position.x) < 0.5: stacked += 1
	check(stacked > 20,"central tower remains stacked during initial three second pusher cycle")
	table.resolve_roulette(4)
	check(table.round_stage == 1,"first tower jackpot gate advances")
	table.resolve_roulette(4)
	table.resolve_roulette(4)
	check(profile.jackpots == 1 and table.payout_left >= 260,"third tower gate awards jackpot")
	table.pending_colors.clear()
	check(table.tower_left >= 98,"jackpot queues tower builder")
	table.tower_left = 7
	for i in 630: await get_tree().physics_frame
	check(table.audit.towers > 0,"builder transfers physical tower into field")
	var snapshot: Dictionary = table.serialize()
	switch_machine(0)
	start_play(false)
	check(table.coins.size() > 0 and table.pending_colors.size() > 0,"switch restores table and pending bonus")
	profile.balance = 0
	profile.refill_at = 0
	var shots_before: int = profile.shots
	insert(0)
	check(profile.balance == 0 and profile.shots == shots_before+1,"zero balance never blocks insert")
	profile.refill_at = int(Time.get_unix_time_from_system())+99999
	check(profile.spend(),"old refill cooldown does not limit free play")
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
	disk.archive_dir = "user://qa_archives_%d" % Time.get_ticks_usec()
	disk.shots = 123
	disk.audio.music = 0.24
	check(disk.new_game(1),"new game archives previous play on disk")
	var archived := Profile.new(false,disk.last_archive)
	check(archived.shots == 123 and archived.tables.has("0"),"archived play preserves previous table and counters")
	var fresh_disk := Profile.new(false,test_path)
	check(fresh_disk.shots == 0 and fresh_disk.tables.is_empty() and fresh_disk.machine == 1,"new disk save contains a fresh game")
	check(is_equal_approx(fresh_disk.audio.music,0.24),"new game preserves sound settings")
	if FileAccess.file_exists(disk.last_archive): DirAccess.remove_absolute(disk.last_archive)
	if DirAccess.dir_exists_absolute(disk.archive_dir): DirAccess.remove_absolute(disk.archive_dir)
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
	check(table.coin_batch.multimesh.instance_count >= table.coins.size(),"shared renderer grows to fit all medals")
	check(table.audit.rail_exits > 50,"continuous play releases over 50 medals")
	check(table.audit.wins > 0,"natural pusher motion produces collectable medals")
	var stable := true
	for b in table.coins:
		if not b.position.is_finite() or not b.linear_velocity.is_finite(): stable = false
	check(stable,"all rigid bodies remain finite under load")
	print("LOAD AUDIT: ",table.audit," active=",table.coins.size()," pool=",table.spare_coins.size())
	print("LOSS SAMPLES: ",table.loss_samples)
	while table.coins.size() < 860:
		var extra = table.spawn_coin(Vector3(0,4,0),false)
		extra.freeze = true
	check(table.insert(0),"manual insertion continues beyond the former 850 medal ceiling")
	var ui_nodes_before: int = table.rails[0].get_child_count()
	for i in 60: table.set_angle(0,sin(i))
	check(table.rails[0].get_child_count() == ui_nodes_before,"rail aiming reuses geometry without rebuilding nodes")
	new_game(0)
	check(table.kind == 0 and table.phase == 0 and profile.shots == 0,"new game starts a clean machine and counters")
	check(profile.tables.size() == 0,"new game clears active tables after archiving")
	start_play(false)
	var pressed_before: int = profile.shots
	var cap: Vector2 = table.camera.unproject_position(table.press_caps[0].global_position)
	pointer_down(10,cap)
	check(held_sides[0] and profile.shots == pressed_before+1,"physical cabinet button accepts touch")
	pointer_up(10)
	check(not held_sides[0],"physical button releases without stuck auto insert")
	var knob: Vector2 = table.camera.unproject_position(table.rails[1].handle.global_position)
	pointer_down(11,knob)
	pointer_move(11,knob+Vector2(70,0))
	check(table.angles[1] > 0.2,"dragging physical handle changes rail angle")
	pointer_up(11)
	run_interaction_checks()
	print("TEST RESULT: %d failures" % fatal_count)
	finish_run(0 if fatal_count == 0 else 1)

func run_interaction_checks() -> void:
	# Focused input/UX regressions, executed in the existing isolated QA session.
	reset_inputs()
	var left: Vector2 = table.camera.unproject_position(table.press_caps[0].global_position)
	var right: Vector2 = table.camera.unproject_position(table.press_caps[1].global_position)
	pointer_down(20,left)
	pointer_down(21,right)
	check(held_sides[0] and held_sides[1],"both physical buttons support simultaneous fingers")
	var cancel := InputEventScreenTouch.new()
	cancel.index = 20
	cancel.pressed = true
	cancel.canceled = true
	_input(cancel)
	check(not held_sides[0] and held_sides[1],"OS touch cancellation releases only the owning side")
	var release := InputEventScreenTouch.new()
	release.index = 21
	release.position = Vector2(520,20)
	release.pressed = false
	_input(release)
	check(not held_sides[1] and pointers.is_empty(),"release over GUI clears hold before GUI consumption")
	pointer_down(-100,left)
	var mouse_release := InputEventMouseButton.new()
	mouse_release.button_index = MOUSE_BUTTON_LEFT
	mouse_release.pressed = false
	_input(mouse_release)
	check(not held_sides[0],"mouse release follows the same global release path")
	pointer_down(22,left)
	pointer_down(23,left)
	pointer_up(22)
	check(held_sides[0],"releasing one of two fingers on a button keeps the other owner")
	pointer_move(23,left+Vector2(3,2))
	check(held_sides[0],"small finger movement retains the held button")
	pointer_move(23,left+Vector2(180,0))
	check(not held_sides[0] and pointers.is_empty(),"sliding away from a button cancels continuous insertion")
	var knob: Vector2 = table.camera.unproject_position(table.rails[0].handle.global_position)
	pointer_down(24,knob)
	pointer_down(25,knob)
	check(pointers.has(24) and not pointers.has(25),"lever has one drag owner")
	pointer_move(24,knob+Vector2(3000,0))
	check(table.angles[0] == 1.0,"lever dragging clamps at mechanical stop")
	pointer_move(24,knob-Vector2(3000,0))
	check(table.angles[0] == -1.0,"lever clamps at opposite stop")
	pointer_up(24)
	table.select_rail(1)
	check(table.rails[1].selected_ring.visible and not table.rails[0].selected_ring.visible,"physical collar identifies the selected rail")
	table.set_angle(1,0.7)
	check(is_equal_approx(table.rails[1].dial_pointer.rotation.y,0.595),"mechanical dial follows rail setting")
	pointer_down(26,left)
	table.press_caps[0].position.y = 0.555
	_notification(NOTIFICATION_WM_WINDOW_FOCUS_OUT)
	check(pointers.is_empty() and not held_sides.has(true),"focus loss clears all pointer ownership")
	check(is_equal_approx(table.press_caps[0].position.y,0.59),"focus loss releases visible physical button")
	pointer_down(27,left)
	show_settings()
	check(pointers.is_empty() and not held_sides.has(true),"opening modal cancels hold and lever gestures")
	var shots_before: int = profile.shots
	pointer_down(28,left)
	check(profile.shots == shots_before and pointers.is_empty(),"modal blocks physical input")
	start_play(false)
	var display = table.bonus_show
	table.pending_colors.clear()
	table.transit_t = -1
	table.payout_left = 0
	table.royal_colors = [true,false,true]
	table.payout_multiplier = 1
	display.mode = "idle"
	display.reset_display()
	check(display.sign_title.text == "COLOR  2 / 3" and display.sign_detail.text == "あと 青","cabinet identifies exactly the missing color")
	table.payout_multiplier = 2
	display.reset_display()
	check(display.sign_detail.text.contains("×2"),"stored next-draw multiplier remains visible")
	table.payout_left = 57
	display.reset_display()
	check(display.sign_title.text == "PAYOUT  057","cabinet shows actual remaining payout")
	table.payout_left = 56
	display.reset_display()
	check(display.sign_title.text == "PAYOUT  056","payout countdown follows simulation rather than a timer")
	table.payout_left = 0
	table.pending_colors.append(1)
	display.reset_display()
	check(display.sign_title.text == "BALL TRANSFER","queued ball transport is explained")
	table.pending_colors.clear()
	table.resolve_roulette(2)
	check(display.sign_detail.text.contains("×2"),"80 pocket announces next-draw benefit")
	table.resolve_roulette(3)
	check(display.sign_detail.text.contains("ボール追加"),"ball pocket describes the extra ball")
	var hud_children := hud.get_child_count()
	table.resolve_roulette(4)
	check(hud.get_child_count() == hud_children,"jackpot adds no full-screen flash overlay")
	check(display.sign_title.text == "JACKPOT!" and display.winner.visible,"jackpot retains cabinet lights and winning pocket")
	table.set_simulation(false)
	var result_time: float = display.result_left
	display._process(1.0)
	check(display.result_left == result_time,"pause preserves result display time")
	table.set_simulation(true)
	display._process(7.0)
	check(display.mode == "idle" and display.sign_title.text.begins_with("PAYOUT"),"result transitions back to live payout display")
	check(not display.player_hint().is_empty(),"persistent guidance remains after temporary messages expire")

func capture_run() -> void:
	for i in 270: await get_tree().physics_frame
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
	elif capture_screen == "roulette":
		table.start_roulette()
		for i in 70: await get_tree().physics_frame
	elif capture_screen == "jackpot":
		# Isolated presentation QA only: never invoked by normal play.
		if table.kind == 1: table.round_stage = 2
		table.resolve_roulette(4)
	elif capture_screen == "progress":
		table.royal_colors = [true,false,true]
		table.payout_multiplier = 2
		table.refresh_lights()
		event_clock = 0
	elif capture_screen == "payout":
		table.payout_left = 120
		event_clock = 0
	elif capture_screen == "builder":
		table.tower_left = 98
		for i in 790: await get_tree().physics_frame
	else: insert(0)
	for i in 36: await get_tree().physics_frame
	print("CAPTURE: preparing frame for ",capture_screen)
	# QA must not wait forever when macOS suppresses presentation for an occluded window.
	RenderingServer.force_draw.call_deferred(false,0.0)
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var err := img.save_png(capture_path)
	var flying := 0
	for b in table.coins:
		if b.position.y > 1.8: flying += 1
	print("DIAGNOSTIC: high coins=",flying," audit=",table.audit," elapsed=",table.elapsed," FPS=",Engine.get_frames_per_second())
	print("CAPTURE: ",capture_path," ",error_string(err))
	finish_run(0 if err == OK else 1)

func finish_run(code: int) -> void:
	active = false
	table.set_simulation(false)
	sound.shutdown()
	await get_tree().create_timer(0.15).timeout
	get_tree().quit(code)
