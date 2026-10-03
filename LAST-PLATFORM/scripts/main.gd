extends Node3D

const Run = preload("res://scripts/run_state.gd")
const Station = preload("res://scripts/station.gd")
const Player = preload("res://scripts/player.gd")
const Sound = preload("res://scripts/sound.gd")
const SAVE = "user://after_last_train.json"
const GOLD = Color("e7bb6d")
const WHITE = Color("e3ece5")
const MUTED = Color("98afaa")

var run = Run.new()
var station
var player
var sound
var world: WorldEnvironment
var ui: Control
var modal: Control
var hud: Control
var fade: ColorRect
var prompt: Label
var counter: Label
var notice: Label
var notice_time = 0.0
var mode = "title"
var has_save = false
var automated = false
var theme: Theme
var settings = {"volume": 0.65, "sensitivity": 1.0, "brightness": 1.0}
var title_time = 0.0
var current_target = ""
var transition_busy = false
var quitting = false

func _ready() -> void:
	get_tree().auto_accept_quit = false
	var args = OS.get_cmdline_user_args()
	automated = "--self-test" in args or Array(args).any(func(a): return str(a).begins_with("--capture="))
	if "--self-test" in args:
		call_deferred("self_test")
		return
	load_settings()
	setup_world()
	setup_ui()
	load_save()
	rebuild(-1)
	show_title()
	if automated:
		sound.set_volume(0)
		call_deferred("capture", args)

func setup_world() -> void:
	world = WorldEnvironment.new()
	var env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("172630")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("8aa5ad")
	env.ambient_light_energy = 0.48
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color("253b43")
	env.fog_light_energy = 0.45
	env.fog_density = 0.011
	env.adjustment_enabled = true
	env.adjustment_brightness = settings.brightness
	world.environment = env
	add_child(world)
	var moonlight = DirectionalLight3D.new()
	moonlight.rotation_degrees = Vector3(-31, -24, 0)
	moonlight.light_color = Color("95b8cc")
	moonlight.light_energy = 0.28
	add_child(moonlight)
	player = Player.new()
	add_child(player)
	player.sensitivity = 0.0021 * settings.sensitivity
	sound = Sound.new()
	add_child(sound)
	sound.set_volume(settings.volume)
	player.step.connect(sound.footstep)

func full(node: Control) -> void:
	node.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

func tint(parent: Node, color: Color) -> ColorRect:
	var rect = ColorRect.new()
	rect.color = color
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(rect)
	full(rect)
	return rect

func setup_ui() -> void:
	var canvas = CanvasLayer.new()
	add_child(canvas)
	ui = Control.new()
	canvas.add_child(ui)
	full(ui)
	ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var font = SystemFont.new()
	font.font_names = PackedStringArray(["Hiragino Sans", "Noto Sans CJK JP", "Arial"])
	theme = Theme.new()
	theme.default_font = font
	theme.default_font_size = 20
	theme.set_color("font_color", "Label", WHITE)
	theme.set_color("font_color", "Button", WHITE)
	theme.set_color("font_hover_color", "Button", Color("fff5db"))
	theme.set_color("font_focus_color", "Button", Color("fff5db"))
	for state in ["normal", "hover", "pressed", "focus"]:
		var style = StyleBoxFlat.new()
		style.bg_color = Color("203b40") if state == "normal" else Color("345255")
		style.border_color = GOLD if state == "focus" else Color("59726c")
		style.set_border_width_all(2 if state == "focus" else 1)
		style.set_corner_radius_all(3)
		style.content_margin_left = 22
		style.content_margin_right = 22
		style.content_margin_top = 12
		style.content_margin_bottom = 12
		theme.set_stylebox(state, "Button", style)
	ui.theme = theme
	var film = tint(ui, Color.WHITE)
	var film_mat = ShaderMaterial.new()
	film_mat.shader = preload("res://shaders/film.gdshader")
	film.material = film_mat
	hud = Control.new()
	ui.add_child(hud)
	full(hud)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var top = VBoxContainer.new()
	hud.add_child(top)
	top.position = Vector2(42, 34)
	text(top, "YOINAGI STATION   /   夜間連絡線", 15, MUTED)
	counter = text(top, "00 / 07", 39, WHITE)
	var reticle = text(hud, "·", 30, Color(0.9, 0.96, 0.9, 0.7))
	reticle.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	reticle.position -= Vector2(4, 20)
	var bottom = VBoxContainer.new()
	hud.add_child(bottom)
	bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	bottom.position += Vector2(42, -96)
	text(bottom, "異変あり → 入口へ戻る　 /　 異変なし → 奥へ進む", 17, WHITE)
	text(bottom, "WASD 移動　 Shift 早歩き　 右クリック 拡大　 Tab 記録　 Esc 中断", 14, MUTED)
	prompt = text(hud, "", 22, GOLD)
	prompt.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	prompt.offset_left = -390
	prompt.offset_right = 390
	prompt.offset_top = -158
	prompt.offset_bottom = -105
	prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	notice = text(hud, "", 18, WHITE)
	notice.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	notice.offset_left = -470
	notice.offset_right = 470
	notice.offset_top = 36
	notice.offset_bottom = 110
	notice.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	notice.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	modal = Control.new()
	ui.add_child(modal)
	full(modal)
	fade = tint(ui, Color(0.015, 0.025, 0.03, 0))

func text(parent: Node, value: String, font_size: int = 20, color: Color = WHITE) -> Label:
	var label = Label.new()
	label.text = value
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(label)
	return label

func paragraph(parent: Node, value: String, font_size: int = 20, color: Color = WHITE) -> Label:
	var label = text(parent, value, font_size, color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label

func space(parent: Node, height: float) -> void:
	var control = Control.new()
	control.custom_minimum_size.y = height
	parent.add_child(control)

func button(parent: Node, caption: String, action: Callable, primary: bool = false) -> Button:
	var btn = Button.new()
	btn.text = caption
	btn.custom_minimum_size.y = 53
	btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
	btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	if primary:
		var style = theme.get_stylebox("normal", "Button").duplicate()
		style.bg_color = GOLD
		style.border_color = GOLD
		btn.add_theme_stylebox_override("normal", style)
		btn.add_theme_color_override("font_color", Color("183033"))
	btn.pressed.connect(action)
	parent.add_child(btn)
	return btn

func clear_modal(next_mode: String) -> void:
	mode = next_mode
	for child in modal.get_children():
		modal.remove_child(child)
		child.queue_free()
	modal.visible = mode != "game"
	hud.visible = mode == "game"
	player.enabled = mode == "game" and not automated
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if mode == "game" and not automated else Input.MOUSE_MODE_VISIBLE

func panel(next_mode: String, eyebrow: String, heading: String, copy: String = "") -> VBoxContainer:
	clear_modal(next_mode)
	tint(modal, Color(0.015, 0.032, 0.037, 0.86))
	var center = CenterContainer.new()
	modal.add_child(center)
	full(center)
	var box = VBoxContainer.new()
	box.custom_minimum_size.x = 660
	box.add_theme_constant_override("separation", 10)
	center.add_child(box)
	text(box, eyebrow, 15, GOLD)
	text(box, heading, 41)
	if copy != "":
		paragraph(box, copy, 19, MUTED)
	space(box, 16)
	return box

func show_title() -> void:
	clear_modal("title")
	player.position = Vector3(-1.15, 0.07, 14.5)
	player.rotation.y = -0.07
	player.camera.rotation.x = -0.025
	var shade = tint(modal, Color(0.025, 0.048, 0.051, 0.90))
	shade.anchor_right = 0
	shade.offset_right = 650
	var box = VBoxContainer.new()
	modal.add_child(box)
	box.position = Vector2(64, 125)
	box.size.x = 504
	box.add_theme_constant_override("separation", 10)
	text(box, "MACKY STUDIO     /     ANOMALY ARCHIVE 01", 14, GOLD)
	space(box, 30)
	text(box, "終電のあと", 70, WHITE)
	text(box, "AFTER THE LAST TRAIN", 18, MUTED)
	space(box, 25)
	paragraph(box, "出口を抜けた先に、\nまだ、ホームがあった。", 27, WHITE)
	space(box, 10)
	paragraph(box, "深夜の宵凪駅。いつもの風景を覚え、\n繰り返すホームの異変を見抜く。", 18, MUTED)
	space(box, 29)
	if has_save and run.progress < Run.GOAL:
		button(box, "続きから     →     %d / 7" % run.progress, resume_run, true)
	button(box, "ホームに入る" if not has_save else "新しくはじめる", new_run, not has_save)
	button(box, "設定", func(): show_settings("title"))
	button(box, "終了", quit_game)
	var footer = text(modal, "一人称・異変探し  /  12の異変  /  プレイ目安 10〜20分\n『3番線』に着想を得た自主制作ゲーム", 13, MUTED)
	footer.position = Vector2(64, 808)

func new_run() -> void:
	var found = run.found.duplicate()
	run = Run.new()
	run.found = found
	has_save = true
	resume_run()
	save_run()

func resume_run() -> void:
	rebuild(run.current)
	player.spawn()
	clear_modal("game")
	update_hud()
	toast("まずは正常なホームです。奥の出口まで歩いて、風景を覚えてください。" if run.tutorial else "保存したホームから再開しました。", 7)

func rebuild(id: int) -> void:
	if is_instance_valid(station):
		remove_child(station)
		station.queue_free()
	station = Station.new()
	add_child(station)
	station.player = player
	station.build(id)

func update_hud() -> void:
	counter.text = "観 察 中" if run.tutorial else "%02d / 07" % run.progress
	current_target = ""
	prompt.text = ""

func toast(value: String, seconds: float = 5) -> void:
	notice.text = value
	notice_time = seconds

func _process(delta: float) -> void:
	if not is_instance_valid(player):
		return
	if mode in ["game", "title"] and is_instance_valid(station):
		station.animate(delta)
	if mode == "game":
		run.seconds += delta
		notice_time = maxf(0, notice_time - delta)
		notice.modulate.a = minf(notice_time, 1)
		current_target = gate_target()
		prompt.text = "[ E ]  入口へ戻る — 異変があった" if current_target == "return" else "[ E ]  奥へ進む — 異変はなかった" if current_target == "exit" else ""

func gate_target() -> String:
	if absf(player.position.x) > 1.4:
		return ""
	var forward = -player.camera.global_basis.z
	if player.position.z < -15.7 and forward.z < -0.25:
		return "exit"
	if player.position.z > 15.7 and forward.z > 0.25:
		return "return"
	return ""

func _unhandled_input(event: InputEvent) -> void:
	if not is_instance_valid(player) or transition_busy:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_F11:
			var fullscreen = DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if fullscreen else DisplayServer.WINDOW_MODE_FULLSCREEN)
		elif event.keycode == KEY_ESCAPE:
			if mode == "game":
				show_pause()
			elif mode in ["pause", "journal"]:
				clear_modal("game")
		elif event.keycode == KEY_TAB:
			if mode == "game":
				show_journal()
			elif mode == "journal":
				clear_modal("game")
		elif event.keycode == KEY_E and mode == "game":
			var target = gate_target()
			if target != "":
				decide(target == "return")

func decide(returned: bool) -> void:
	if transition_busy:
		return
	var result = run.decide(returned)
	if not result.accepted:
		toast(result.message)
		return
	transition_busy = true
	player.enabled = false
	mode = "transition"
	save_run()
	sound.chime(result.correct)
	var tween = create_tween()
	tween.tween_property(fade, "color:a", 1.0, 0.40)
	await tween.finished
	if result.won:
		show_ending()
	else:
		rebuild(run.current)
		player.spawn()
		var box = panel("result", "OBSERVATION RECORDED" if result.correct else "THE PLATFORM REPEATS", "判断は正しい。" if result.correct else "また、同じホームだ。", result.message)
		text(box, "%02d  /  07" % run.progress, 59, GOLD)
		paragraph(box, "7回連続の正解で、この駅を出られる。" if result.correct else "連続正解は0に戻りました。覚えた風景を頼りに、もう一度。", 18, MUTED)
		space(box, 12)
		button(box, "次のホームへ", func():
			clear_modal("game")
			update_hud()
		, true).grab_focus()
		button(box, "記録してタイトルへ", title_from_game)
	tween = create_tween()
	tween.tween_property(fade, "color:a", 0.0, 0.45)
	await tween.finished
	transition_busy = false

func show_pause() -> void:
	save_run()
	var box = panel("pause", "PAUSED  /  記録済み", "ひと休み。", "判断を終えるたびに自動保存します。再開時は、そのホームの入口から始まります。")
	button(box, "探索に戻る", func(): clear_modal("game"), true).grab_focus()
	button(box, "見抜いた異変の記録", show_journal)
	button(box, "設定", func(): show_settings("pause"))
	button(box, "記録してタイトルへ", title_from_game)
	button(box, "記録して終了", quit_game)

func show_settings(back: String) -> void:
	var box = panel("settings", "SETTINGS", "探索しやすく。", "視点の揺れはありません。F11で全画面を切り替えられます。")
	for entry in [["volume", "音量", 0.0, 1.0], ["sensitivity", "視点の速さ", 0.3, 2.0], ["brightness", "明るさ", 0.75, 1.6]]:
		text(box, entry[1], 18, MUTED)
		var slider = HSlider.new()
		slider.min_value = entry[2]
		slider.max_value = entry[3]
		slider.step = 0.05
		slider.value = settings[entry[0]]
		slider.custom_minimum_size.y = 30
		box.add_child(slider)
		slider.value_changed.connect(func(v):
			settings[entry[0]] = v
			apply_settings()
		)
	space(box, 16)
	button(box, "戻る", func():
		save_settings()
		if back == "title": show_title()
		else: show_pause()
	, true)

func show_journal() -> void:
	var box = panel("journal", "ANOMALY ARCHIVE   %02d / 12" % run.found.size(), "見抜いた異変。", "正しく引き返した異変が記録されます。新しくはじめても記録は残ります。")
	var scroll = ScrollContainer.new()
	scroll.custom_minimum_size.y = 345
	box.add_child(scroll)
	var list = VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 13)
	scroll.add_child(list)
	for i in range(Run.CATALOG.size()):
		if i in run.found:
			text(list, "%02d   %s" % [i + 1, Run.CATALOG[i][0]], 19, GOLD)
			paragraph(list, Run.CATALOG[i][1], 16, MUTED)
		else:
			text(list, "%02d   ― 未観測 ―" % (i + 1), 19, MUTED)
	button(box, "探索に戻る", func(): clear_modal("game"), true)

func show_ending() -> void:
	world.environment.background_color = Color("718a86")
	world.environment.fog_light_color = Color("758c86")
	var box = panel("ending", "FIRST LIGHT   /   05:02", "始発の音がした。", "ホームの向こうから、朝の光が差し込んだ。\n今度の電車は、あなたを帰してくれる。")
	text(box, "7 / 7   脱出成功", 47, GOLD)
	paragraph(box, "探索時間  %d分%02d秒    /    間違い  %d回\n見抜いた異変  %d / 12" % [int(run.seconds) / 60, int(run.seconds) % 60, run.mistakes, run.found.size()], 21, MUTED)
	space(box, 12)
	button(box, "別の異変を探しに行く", func(): reset_sky(); new_run(), true)
	button(box, "タイトルへ", func(): reset_sky(); show_title())
	button(box, "終了", quit_game)

func reset_sky() -> void:
	world.environment.background_color = Color("172630")
	world.environment.fog_light_color = Color("253b43")

func title_from_game() -> void:
	save_run()
	rebuild(-1)
	show_title()

func load_save() -> void:
	if automated:
		return
	for path in [SAVE, SAVE + ".bak"]:
		if FileAccess.file_exists(path):
			var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
			if parsed is Dictionary and run.restore(parsed):
				has_save = true
				break

func save_run() -> void:
	if automated or not has_save:
		return
	var file = FileAccess.open(SAVE + ".tmp", FileAccess.WRITE)
	if file == null:
		push_error("セーブファイルを開けませんでした。")
		return
	file.store_string(JSON.stringify(run.serialize()))
	file.flush()
	file.close()
	if FileAccess.file_exists(SAVE):
		DirAccess.copy_absolute(SAVE, SAVE + ".bak")
	var error = DirAccess.rename_absolute(SAVE + ".tmp", SAVE)
	if error != OK:
		push_error("セーブファイルの保存に失敗しました: %s" % error)

func load_settings() -> void:
	if automated:
		return
	var config = ConfigFile.new()
	if config.load("user://settings.cfg") == OK:
		for key in settings:
			var value = config.get_value("game", key, settings[key])
			if value is float or value is int:
				settings[key] = clampf(value, 0.0 if key == "volume" else 0.3, 1.0 if key == "volume" else 2.0)

func save_settings() -> void:
	if automated:
		return
	var config = ConfigFile.new()
	for key in settings:
		config.set_value("game", key, settings[key])
	config.save("user://settings.cfg")

func apply_settings() -> void:
	player.sensitivity = 0.0021 * settings.sensitivity
	sound.set_volume(settings.volume)
	world.environment.adjustment_brightness = settings.brightness

func quit_game() -> void:
	if quitting:
		return
	quitting = true
	save_run()
	save_settings()
	if is_instance_valid(sound):
		sound.stop_all()
		await get_tree().create_timer(0.1).timeout
	get_tree().quit()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and mode == "game" and not automated:
		show_pause()
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		quit_game()

func capture(args: PackedStringArray) -> void:
	var path = "res://screenshots/platform.png"
	var shot = "platform"
	var id = -1
	for arg in args:
		if arg.begins_with("--capture="): path = arg.trim_prefix("--capture=")
		if arg.begins_with("--shot="): shot = arg.trim_prefix("--shot=")
		if arg.begins_with("--anomaly="): id = int(arg.trim_prefix("--anomaly="))
	if shot != "title":
		new_run()
		run.tutorial = false
		run.current = id
		rebuild(id)
		update_hud()
		notice_time = 0
		if shot == "detail":
			player.position = Vector3(-1, 0.04, 6.5)
			player.rotation.y = -0.65
		elif shot == "ending":
			run.progress = 7
			show_ending()
	for i in range(50):
		await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var output = ProjectSettings.globalize_path(path)
	DirAccess.make_dir_recursive_absolute(output.get_base_dir())
	get_viewport().get_texture().get_image().save_png(output)
	print("CAPTURE_OK ", output)
	quit_game()

func self_test() -> void:
	var tests = load("res://tests/test_game.gd").new()
	add_child(tests)
	await tests.run_all(self)
