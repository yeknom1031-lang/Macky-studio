extends Node3D

const Routes=preload("res://scripts/route_rules.gd")
var active_route_choice=""
var active_route_destination=0
var route_presenting=false
const Failure=preload("res://scripts/failure_rules.gd")
var failure_sequence=preload("res://scripts/failure_sequence.gd").new()
var failure_return_mode="game"
var failure_pause_mode="hazard"
var failure_saved_modal:Control
var danger_label:Label
var danger_shade:ColorRect
var death_countdown:Label
var death_elapsed=0.0
const Room=preload("res://scripts/room.gd")
const Player=preload("res://scripts/player.gd")
const Profile=preload("res://scripts/profile.gd")
const Sound=preload("res://scripts/sound.gd")
const Puzzles=preload("res://scripts/puzzle_catalog.gd")
const Runs=preload("res://scripts/run_catalog.gd")
var station_ui=preload("res://scripts/station_ui.gd").new()
const Catalog=preload("res://scripts/anomaly_catalog.gd")
const DIRECTIONS=[Vector3(0,0,-1),Vector3(1,0,0),Vector3(0,0,1),Vector3(-1,0,0)]
const INK=Color(0.16,0.24,0.29)
const MUTED=Color(0.37,0.46,0.51)
var profile=Profile.new()
var player
var room
var next_room
var next_offset=Vector3.ZERO
var active_door
var door_elapsed=0.0
var crossed=false
var exit_crossing=false
var world_environment:WorldEnvironment
var sound
var mode="title"
var has_save=false
var ui:Control
var hud:Control
var modal:Control
var theme:Theme
var font:Font
var mono:Font
var prompt:Label
var objective:Label
var sector:Label
var compass:Label
var inventory:Label
var toast_label:Label
var toast_time=0.0
var fade:ColorRect
var fade_amount=0.0
var last_target
var save_clock=0.0
var time=0.0
var number_input=""
var code_label:Label
var puzzle_feedback:Label
var relay_input=[]
var hint_level=0
var return_mode="title"
var automated=false
var test_mode=false
var quitting=false

func _ready() -> void:
	var args=OS.get_cmdline_user_args()
	automated=Array(args).any(func(a):return str(a).begins_with("--capture")) or "--self-test" in args
	test_mode="--self-test" in args
	if automated:
		profile.path="user://white_room_automation.json"
	install_input()
	has_save=profile.load_profile()
	setup_environment()
	player=Player.new()
	add_child(player)
	sound=Sound.new()
	add_child(sound)
	player.footstep.connect(sound.footstep)
	player.footstep.connect(func(_speed):
		if mode=="game" and is_instance_valid(room):room.phenomenon.footstep_echo()
	)
	setup_ui()
	add_child(failure_sequence)
	apply_settings()
	build_room(0)
	player.position=Vector3(-25,0.06,17)
	player.rotation.y=-0.75
	player.pitch=10.0
	player.camera.rotation.x=deg_to_rad(10)
	show_title()
	get_tree().auto_accept_quit=false
	if test_mode:
		var tests=load("res://tests/playthrough.gd").new()
		add_child(tests)
		tests.call_deferred("run",self)
	elif automated:
		call_deferred("capture_run",args)

func install_input() -> void:
	var bindings={"forward":[KEY_W,KEY_UP],"back":[KEY_S,KEY_DOWN],"left":[KEY_A],"right":[KEY_D],"look_left":[KEY_LEFT],"look_right":[KEY_RIGHT],"sprint":[KEY_SHIFT],"interact":[KEY_E],"journal":[KEY_TAB,KEY_J],"pause":[KEY_ESCAPE],"hint":[KEY_H],"fullscreen":[KEY_F11]}
	for action in bindings:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for key in bindings[action]:
			var event=InputEventKey.new()
			event.physical_keycode=key
			InputMap.action_add_event(action,event)

func setup_environment() -> void:
	world_environment=WorldEnvironment.new()
	var env=Environment.new()
	env.background_mode=Environment.BG_COLOR
	env.background_color=Color(0.025,0.03,0.035)
	env.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color=Color(0.80,0.88,1.0)
	env.ambient_light_energy=0.055
	env.tonemap_mode=Environment.TONE_MAPPER_ACES
	env.tonemap_exposure=1.12
	env.fog_enabled=false
	if RenderingServer.get_current_rendering_method()!="gl_compatibility":
		env.sdfgi_enabled=bool(profile.settings.get("gi",true))
		env.sdfgi_cascades=2
		env.sdfgi_min_cell_size=0.65
		env.sdfgi_read_sky_light=false
		env.sdfgi_use_occlusion=true
		env.sdfgi_bounce_feedback=0.35
		env.sdfgi_energy=1.0
		env.ssao_enabled=true
		env.ssao_radius=1.4
		env.ssao_intensity=2.7
		env.ssao_light_affect=0.55
		env.ssao_detail=0.8
		env.glow_enabled=true
		env.glow_intensity=0.22
		env.glow_hdr_threshold=1.7
		env.ssr_enabled=true
		env.ssr_max_steps=64
		env.volumetric_fog_enabled=true
		env.volumetric_fog_density=0.003
		env.volumetric_fog_length=75
		env.volumetric_fog_albedo=Color(0.88,0.91,0.96)
		env.volumetric_fog_ambient_inject=0.08
		env.volumetric_fog_anisotropy=0.25
	world_environment.environment=env
	add_child(world_environment)

func build_room(id:int) -> void:
	close_door(true)
	if is_instance_valid(room):
		remove_child(room)
		room.queue_free()
	room=Room.new()
	add_child(room)
	room.make(id,profile.state)
	if is_instance_valid(sound):sound.set_space(id)

func begin_game(fresh:bool=false) -> void:
	if failure_sequence.active:failure_sequence.reset()
	mode="starting"
	death_elapsed=0
	if fresh:
		if FileAccess.file_exists(profile.path) and not automated:
			DirAccess.copy_absolute(profile.path,profile.path+".archive-"+str(int(Time.get_unix_time_from_system())))
		profile.fresh()
		hint_level=0
	var pending_route=bool(profile.state.route_pending_wrong)
	profile.state.route_pending_wrong=false
	build_room(int(profile.state.room))
	var p=profile.state.position
	player.position=Vector3(clampf(float(p[0]),-28.8,28.8),0.08,clampf(float(p[2]),-28.8,28.8))
	player.rotation.y=float(profile.state.yaw)
	player.pitch=float(profile.state.pitch)
	player.camera.rotation.x=deg_to_rad(player.pitch)
	player.velocity=Vector3.ZERO
	resume_game()
	sound.enter_space(int(profile.state.current_audio) if profile.state.danger>0 else -1,player)
	if profile.state.dead:
		show_death()
	elif pending_route:
		present_failure()
	elif profile.state.escaped:
		show_ending()
	else:
		toast("扉の左に進路の記録。刻印で選ぶ。誤った扉は同じ部屋へ戻り、異変を強める。",9.0)
	update_hud()
	save_game()

func _input(event:InputEvent) -> void:
	# The keypad's keyboard shortcuts also work after clicking a focused digit button.
	if mode!="cipher" or not event is InputEventKey or not event.pressed or event.echo:
		return
	if event.keycode>=KEY_0 and event.keycode<=KEY_9:
		enter_digit(str(event.keycode-KEY_0))
	elif event.keycode==KEY_BACKSPACE:
		enter_digit("←")
	elif event.keycode==KEY_ENTER or event.keycode==KEY_KP_ENTER:
		submit_cipher(number_input)
	else:
		return
	get_viewport().set_input_as_handled()

func _unhandled_input(event:InputEvent) -> void:
	if event is InputEventKey and event.echo:
		return
	if event.is_action_pressed("fullscreen"):
		profile.settings.fullscreen=not profile.settings.fullscreen
		apply_settings()
	if profile.state.get("route_pending_wrong",false):
		if event.is_action_pressed("pause"):
			close_door()
			pause_failure()
		return
	if mode in ["hazard","death","failure_pause"]:
		if event.is_action_pressed("pause"):
			if mode=="failure_pause":resume_failure()
			else:pause_failure()
		return
	if mode=="game":
		if event.is_action_pressed("pause"):
			show_pause()
		elif event.is_action_pressed("journal"):
			show_journal()
		elif event.is_action_pressed("hint"):
			show_journal(true)
		elif event.is_action_pressed("interact"):
			interact()
	elif event.is_action_pressed("pause") or (mode=="journal" and event.is_action_pressed("journal")):
		if mode=="settings":
			settings_back()
		elif mode in ["title","new","credits"]:
			show_title()
		elif mode!="end":
			resume_game()

func _process(delta:float) -> void:
	time+=delta
	if mode=="title":
		player.rotation.y=-0.75+sin(time*0.055)*0.06
	if toast_time>0:
		toast_time-=delta
		toast_label.modulate.a=minf(1.0,toast_time)
	else:
		toast_label.modulate.a=0
	fade_amount=move_toward(fade_amount,0,delta*2)
	fade.color.a=fade_amount
	apply_danger(delta)
	if mode in ["hazard","death"]:
		advance_failure(delta)
		return
	if mode!="game":
		return
	var facing=posmod(roundi(-player.rotation.y/(PI/2)),4)
	compass.text=["N  北","E  東","S  南","W  西"][facing]
	room.tick(delta,player)
	sound.tick(delta,player)
	if sound.heard_variation and sound.acoustic_time>4 and not int(profile.state.current_audio) in profile.state.heard_audio:
		profile.state.heard_audio.append(int(profile.state.current_audio))
	if room.phenomenon.has_been_seen(player) and not room.event_id in profile.state.observed_anomalies:
		profile.state.observed_anomalies.append(room.event_id)
		save_game()
	profile.state.seconds+=delta
	save_clock+=delta
	if save_clock>15:
		save_game()
		save_clock=0
	var hit=player.aim_query()
	last_target=hit.get("collider")
	var text=""
	if is_instance_valid(last_target) and last_target.has_meta("action") and not is_instance_valid(active_door):
		match str(last_target.get_meta("action")):
			"door":text="E    ノブを回して開ける"
			"exit":text="E    境界の扉を開ける"
			"clue":text="E    観測記録を読む"
			"station":text="E    観測器を調べる"
			"cipher":text="E    暗号盤を調べる"
			"record":text="E    保全記録を読む"
			"route_record":text="E    進路の記録を読む"
			"relay":text="E    回路を調べる"
			"key":text="E    保全キーを取る"
			"sealed":text=""
	prompt.text=text

func _physics_process(delta:float) -> void:
	if not is_instance_valid(active_door):
		return
	door_elapsed+=delta
	var aperture=door_aperture(door_elapsed)
	active_door.set_open(aperture)
	var side=int(active_door.side)
	var beyond=DIRECTIONS[side].dot(player.position)>30.2
	if beyond and not crossed and aperture>0.55:
		if exit_crossing:
			complete_escape()
			return
		cross_threshold()
	if door_elapsed>=1.0:
		close_door()

static func door_aperture(seconds:float) -> float:
	if seconds<0.18:
		return smoothstep(0.0,0.18,seconds)
	if seconds<0.70:
		return 1.0
	return 1.0-smoothstep(0.70,1.0,seconds)

func open_door(side:int,is_exit:bool=false) -> bool:
	if failure_busy() or side<0 or side>3:return false
	if is_instance_valid(active_door):
		return false
	if is_exit and not profile.state.powered:
		return false
	active_route_choice="exit" if is_exit else Routes.choice(profile.state,side)
	if active_route_choice=="forward" and not Routes.task(profile.state).is_empty():
		toast(Routes.task(profile.state),6)
		return false
	if active_route_choice=="wrong":
		Failure.mistake(profile.state,"進路の記録と異なる「%s」の扉を開けた"%Routes.mark(profile.state,side))
		profile.state.route_errors=int(profile.state.route_errors)+1
		profile.state.route_pending_wrong=true
		save_game()
	active_route_destination=int(profile.state.route_index) if is_exit else Routes.destination_index(profile.state,side)
	active_door=room.exit_door if is_exit else room.doors[side]
	exit_crossing=is_exit
	door_elapsed=0
	crossed=false
	next_offset=DIRECTIONS[side]*60.6
	if is_exit:
		next_offset.z=-12.0
	next_room=Room.new()
	add_child(next_room)
	next_room.position=next_offset
	var preview_state=profile.state.duplicate(true) if is_exit else Routes.preview(profile.state,side)
	var destination=0 if is_exit else int(profile.state.route_rooms[active_route_destination])
	next_room.make(destination,preview_state,true)
	next_room.doors[(side+2)%4].preview_entrance()
	sound.play("handle",-12)
	return true

func cross_threshold() -> void:
	var side=int(active_door.side)
	var destination=int(profile.state.route_rooms[active_route_destination])
	var old=room
	room=next_room
	next_room=null
	room.position=Vector3.ZERO
	if active_route_choice=="forward":
		Catalog.enter(profile.state,destination)
		if active_route_destination>int(profile.state.route_furthest):
			Failure.success(profile.state)
			profile.state.route_furthest=active_route_destination
	profile.state.route_index=active_route_destination
	room.saved_state=profile.state
	room.activate()
	sound.set_space(destination)
	player.position-=next_offset
	sound.enter_space(int(profile.state.current_audio) if profile.state.danger>0 else -1,player)
	old.visible=false
	remove_child(old)
	old.queue_free()
	active_door=room.doors[(side+2)%4]
	active_door.hinge.visible=true
	active_door.set_open(door_aperture(door_elapsed))
	crossed=true
	profile.state.room=destination
	profile.state.crossings+=1
	if not destination in profile.state.visits:
		profile.state.visits.append(destination)
	update_hud()
	save_game()

func close_door(silent:bool=false) -> void:
	var show_route_failure=bool(profile.state.get("route_pending_wrong",false)) and not route_presenting and mode!="starting"
	if is_instance_valid(active_door):
		# A closing leaf never traps or hurts the player at the threshold.
		var outward=DIRECTIONS[int(active_door.side)]
		var depth=outward.dot(player.position)
		if depth>29.5:
			player.position-=outward*(depth-29.35)
		active_door.set_open(0)
		if not silent and is_instance_valid(sound):
			sound.play("close",-17)
	active_door=null
	if is_instance_valid(next_room):
		remove_child(next_room)
		next_room.queue_free()
	next_room=null
	exit_crossing=false
	if show_route_failure:
		profile.state.route_pending_wrong=false
		present_failure()

func interact() -> void:
	if mode!="game" or is_instance_valid(active_door):
		return
	var hit=player.aim_query()
	var target=hit.get("collider")
	if not is_instance_valid(target) or not target.has_meta("action"):
		return
	interact_target(target)

func interact_target(target:Node) -> void:
	var action=str(target.get_meta("action"))
	match action:
		"door":open_door(int(target.get_meta("side")))
		"exit":open_door(3,true)
		"record":show_record()
		"route_record":show_route_record()
		"clue":read_clue(int(target.get_meta("id")))
		"station":station_ui.open(self,int(target.get_meta("id")))
		"cipher":show_cipher()
		"key":take_key()
		"relay":show_relay()

func read_clue(id:int) -> void:
	if profile.state.campaign and not id in profile.state.solved_stations:
		station_ui.open(self,id)
		return
	if not id in profile.state.clues:
		profile.state.clues.append(id)
		sound.play("confirm",-20)
		save_game()
	update_hud()
	var box=dialog("OBSERVATION / 記録",Room.SYMBOLS[id]+"  =  "+str(Puzzles.digit(profile.state,id)),"壁の記号と、観測器の数字が対応している。\n記録は Tab でいつでも読み返せる。","record")
	button(box,"記録して戻る",resume_game,true)

func show_record() -> void:
	if not "origin" in profile.state.notes:
		profile.state.notes.append("origin")
		save_game()
	var box=dialog("MAINTENANCE / 保全記録","境界は、初めからここにある。","部屋の形は同じでも、扉の脇の記号は異なる。\n各区画の観測器を校正し、○・△・□ の数字を集めよ。\n8台中6台の校正で、境界回路が安定する。\n\n暗号盤の順番は   ○ → △ → □\n\n手に入れた保全キーは、◇ の回路盤に適合する。\n回路を復旧すると、始まりの部屋の西壁に継ぎ目が現れる。","record")
	if not profile.state.campaign:
		for child in box.get_children():
			if child is Label and "8台中6台" in child.text:child.text=child.text.replace("各区画の観測器を校正し、○・△・□ の数字を集めよ。\n8台中6台の校正で、境界回路が安定する。","○・△・□ の部屋に残された観測器の数字を集めよ。")
	button(box,"記録して戻る",resume_game,true)

func show_cipher() -> void:
	if profile.state.cipher:
		toast("暗号箱は解錠済み。"+("下の保全キーを取れる。" if not profile.state.key else "保全キーは所持している。"))
		return
	number_input=""
	var box=dialog("BOUNDARY / 00","観測値を入力","○    →    △    →    □","cipher")
	code_label=text_label("—   —   —",46,INK)
	code_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(code_label)
	var grid=GridContainer.new()
	grid.columns=3
	grid.add_theme_constant_override("h_separation",10)
	grid.add_theme_constant_override("v_separation",8)
	box.add_child(grid)
	for value in ["1","2","3","4","5","6","7","8","9","←","0","確認"]:
		var digit=value
		button(grid,value,func():
			if digit=="確認":submit_cipher(number_input)
			else:enter_digit(digit)
		,false,Vector2(180,48))
	puzzle_feedback=text_label("装置の誤答では危険度は増えません。数字キーでも入力できます。",15,MUTED)
	box.add_child(puzzle_feedback)
	button(box,"戻る",resume_game)

func enter_digit(value:String) -> void:
	if value=="←":
		number_input=number_input.left(maxi(0,number_input.length()-1))
	elif number_input.length()<3:
		number_input+=value
	var display=[]
	for i in range(3):
		display.append(number_input[i] if i<number_input.length() else "—")
	if is_instance_valid(code_label):
		code_label.text="   ".join(display)

func submit_cipher(code:String) -> bool:
	if failure_busy() or profile.state.cipher:return false
	if code.length()!=3 or (profile.state.campaign and profile.state.clues.size()<3):
		if is_instance_valid(puzzle_feedback):puzzle_feedback.text="3つの観測値を記録してから、3桁すべてを入力しよう。"
		return false
	if code!=Puzzles.code(profile.state):
		if is_instance_valid(puzzle_feedback):
			puzzle_feedback.text="一致しない。○・△・□ の記録を確認。"
		return false
	profile.state.cipher=true
	if room.room_id==0:
		room.key_visual.visible=not profile.state.key
		room.key_target.collision_layer=2 if not profile.state.key else 0
	sound.play("confirm",-16)
	save_game()
	resume_game()
	toast("箱が開いた。暗号盤の下に、保全キーがある。",5)
	return true

func take_key() -> bool:
	if failure_busy():return false
	if not profile.state.cipher or profile.state.key:
		return false
	profile.state.key=true
	room.key_visual.visible=false
	room.key_target.collision_layer=0
	sound.play("key",-15)
	save_game()
	update_hud()
	toast("保全キーを入手。◇ の区画で境界回路を復旧しよう。",6)
	return true

func show_relay() -> void:
	if profile.state.powered:
		toast("境界回路は復旧している。進路の記録に従い、始まりの ∅ の区画へ。")
		return
	if not profile.state.key:
		var locked=dialog("CIRCUIT / ◇","保全キーが必要","∅ の区画にある暗号箱を解くと、この回路を操作できる。","relay")
		button(locked,"戻る",resume_game,true)
		return
	if profile.state.campaign and profile.state.solved_stations.size()<6:
		var pending=dialog("CIRCUIT / ◇","観測器の校正が足りない","安定した給電には6台の校正が必要。現在 %d / 6。\n記録の案内図から、未校正の区画を探そう。"%profile.state.solved_stations.size(),"relay")
		button(pending,"記録・案内図",show_journal,true)
		button(pending,"戻る",resume_game)
		return
	profile.state.relay_unlocked=true
	relay_input=[]
	save_game()
	var box=dialog("CIRCUIT / ◇","境界回路を復旧","保全キーを挿入した。刻印の順に接点を接続する。\n\n○ の次は □。最後は △。◇ は接続しない。","relay")
	var row=HBoxContainer.new()
	row.add_theme_constant_override("separation",12)
	box.add_child(row)
	for i in range(4):
		var index=i
		button(row,["○","△","□","◇"][i],func():relay_press(index),false,Vector2(132,72))
	puzzle_feedback=text_label("接続： —  —  —　何度でも再調整できます",17,INK)
	box.add_child(puzzle_feedback)
	button(box,"戻る",resume_game)

func relay_press(index:int) -> bool:
	if failure_busy() or index<0 or index>3:return false
	if not profile.state.key or not profile.state.relay_unlocked or profile.state.powered or (profile.state.campaign and profile.state.solved_stations.size()<6):
		return false
	var expected=[0,2,1]
	if index!=expected[relay_input.size()]:
		relay_input.clear()
		if is_instance_valid(puzzle_feedback):
			puzzle_feedback.text="接続が戻った。刻印の順番を確かめよう。"
		return false
	relay_input.append(index)
	if relay_input.size()==3:
		profile.state.powered=true
		sound.play("confirm",-17)
		save_game()
		resume_game()
		update_hud()
		toast("境界回路が復旧した。始まりの区画、西壁の継ぎ目を探そう。",7)
		return true
	if is_instance_valid(puzzle_feedback):
		var names=[]
		for v in relay_input:names.append(["○","△","□","◇"][v])
		puzzle_feedback.text="接続： "+" → ".join(names)
	return false

func complete_escape() -> void:
	if failure_busy():return
	if not profile.state.powered or not profile.state.key:
		return
	profile.state.escaped=true
	if is_instance_valid(next_room):
		var old=room
		room=next_room
		next_room=null
		room.position=Vector3.ZERO
		player.position-=next_offset
		remove_child(old)
		old.queue_free()
	active_door=null
	profile.state.room=0
	save_game()
	sound.play("confirm",-21)
	show_ending()

func save_game() -> void:
	if mode=="title" or mode=="new":
		return
	if not mode in ["hazard","death","failure_pause"]:
		profile.state.position=[player.position.x,0.05,player.position.z]
		profile.state.yaw=player.rotation.y
		profile.state.pitch=player.pitch
	if not profile.save():
		toast(profile.error_message,6)
	else:
		has_save=true

func _notification(what:int) -> void:
	if what==NOTIFICATION_WM_CLOSE_REQUEST:
		if is_instance_valid(player) and mode!="title":save_game()
		quit_game()
	if what==NOTIFICATION_APPLICATION_FOCUS_OUT and not automated:
		if profile.state.get("route_pending_wrong",false):
			close_door()
			pause_failure()
		elif mode=="game":show_pause()
		elif mode in ["hazard","death"]:pause_failure()

func quit_game(exit_code:int=0) -> void:
	if quitting:return
	quitting=true
	mode="quitting"
	player.enabled=false
	sound.stop_all()
	if is_instance_valid(room):room.phenomenon.stop_audio()
	if is_instance_valid(next_room):next_room.phenomenon.stop_audio()
	world_environment.environment.sdfgi_enabled=false
	world_environment.environment.volumetric_fog_enabled=false
	if is_instance_valid(room):
		remove_child(room)
		room.queue_free()
	if is_instance_valid(next_room):
		remove_child(next_room)
		next_room.queue_free()
	await get_tree().process_frame
	RenderingServer.force_draw(false)
	# Let the audio mixer release active playbacks before destroying the tree.
	await get_tree().create_timer(0.3).timeout
	get_tree().quit(exit_code)

func setup_ui() -> void:
	font=SystemFont.new()
	font.font_names=PackedStringArray(["Hiragino Sans","Arial"])
	mono=SystemFont.new()
	mono.font_names=PackedStringArray(["Menlo","Hiragino Sans"])
	theme=Theme.new()
	theme.default_font=font
	theme.default_font_size=18
	var layer=CanvasLayer.new()
	add_child(layer)
	ui=Control.new()
	ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.mouse_filter=Control.MOUSE_FILTER_IGNORE
	ui.theme=theme
	layer.add_child(ui)
	hud=Control.new()
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter=Control.MOUSE_FILTER_IGNORE
	ui.add_child(hud)
	sector=text_label("",14,MUTED)
	sector.position=Vector2(34,30)
	hud.add_child(sector)
	compass=text_label("N  北",13,MUTED)
	compass.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	compass.position=Vector2(-50,30)
	compass.size=Vector2(100,24)
	compass.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	hud.add_child(compass)
	inventory=text_label("",17,INK)
	inventory.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	inventory.position=Vector2(-370,30)
	inventory.size=Vector2(335,40)
	inventory.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT
	hud.add_child(inventory)
	var cross=text_label("·",30,Color(0.3,0.38,0.41,0.7))
	cross.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	cross.position=Vector2(-6,-19)
	hud.add_child(cross)
	prompt=text_label("",19,INK)
	prompt.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	prompt.position=Vector2(-320,-123)
	prompt.size=Vector2(640,32)
	prompt.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	hud.add_child(prompt)
	objective=text_label("",14,MUTED)
	objective.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	objective.position=Vector2(34,-54)
	hud.add_child(objective)
	var controls=text_label("WASD 移動   Shift 早歩き   E 調べる   Tab 記録   Esc 中断",13,MUTED)
	controls.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	controls.position=Vector2(-605,-50)
	hud.add_child(controls)
	toast_label=text_label("",18,INK)
	toast_label.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	toast_label.position=Vector2(-520,75)
	toast_label.size=Vector2(1040,40)
	toast_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	ui.add_child(toast_label)
	fade=ColorRect.new()
	fade.color=Color(0.95,0.98,1,0)
	fade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fade.mouse_filter=Control.MOUSE_FILTER_IGNORE
	ui.add_child(fade)
	danger_shade=ColorRect.new()
	danger_shade.color=Color(0.005,0.008,0.014,0)
	danger_shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	danger_shade.mouse_filter=Control.MOUSE_FILTER_IGNORE
	ui.add_child(danger_shade)
	danger_label=text_label("",16,Color(0.94,0.77,0.65))
	danger_label.position=Vector2(34,62)
	hud.add_child(danger_label)
	for label in hud.get_children():
		if label is Label:
			label.add_theme_color_override("font_color",Color(0.9,0.95,0.98))
			label.add_theme_color_override("font_shadow_color",Color(0.025,0.04,0.05,0.85))
			label.add_theme_constant_override("shadow_offset_x",1)
			label.add_theme_constant_override("shadow_offset_y",1)

func text_label(text:String,size:int=18,color:Color=INK) -> Label:
	var label=Label.new()
	label.text=text
	label.add_theme_color_override("font_color",color)
	label.add_theme_font_size_override("font_size",size)
	label.mouse_filter=Control.MOUSE_FILTER_IGNORE
	return label

func paragraph(box:Control,text:String,size:int=18) -> Label:
	var label=text_label(text,size,MUTED)
	label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	label.custom_minimum_size.x=560
	box.add_child(label)
	return label

func button(parent:Control,text:String,callback:Callable,primary:bool=false,min_size:Vector2=Vector2(0,48)) -> Button:
	var b=Button.new()
	b.text=text
	b.custom_minimum_size=min_size
	b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	b.add_theme_font_size_override("font_size",18)
	b.add_theme_color_override("font_color",Color(0.97,0.99,1) if primary else INK)
	b.add_theme_color_override("font_hover_color",Color.WHITE if primary else INK)
	var style=StyleBoxFlat.new()
	style.bg_color=Color(0.19,0.28,0.33) if primary else Color(0.94,0.96,0.97,0.84)
	style.border_color=Color(0.72,0.79,0.83)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.content_margin_left=18
	style.content_margin_right=18
	b.add_theme_stylebox_override("normal",style)
	var hover=style.duplicate()
	hover.bg_color=Color(0.29,0.39,0.44) if primary else Color(0.85,0.91,0.94)
	b.add_theme_stylebox_override("hover",hover)
	b.add_theme_stylebox_override("pressed",hover)
	var focus=style.duplicate()
	focus.border_color=Color(0.32,0.51,0.61)
	focus.set_border_width_all(2)
	b.add_theme_stylebox_override("focus",focus)
	b.pressed.connect(callback)
	parent.add_child(b)
	return b

func clear_modal(new_mode:String) -> void:
	if is_instance_valid(sound):sound.suspend(true)
	if is_instance_valid(room):room.suspend(true)
	if is_instance_valid(modal):
		ui.remove_child(modal)
		modal.queue_free()
	modal=Control.new()
	modal.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.add_child(modal)
	mode=new_mode
	player.enabled=false
	Input.mouse_mode=Input.MOUSE_MODE_VISIBLE
	hud.visible=false

func dialog(kicker:String,title:String,description:String,new_mode:String) -> VBoxContainer:
	clear_modal(new_mode)
	var shade=ColorRect.new()
	shade.color=Color(0.82,0.88,0.91,0.69)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal.add_child(shade)
	var center=CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal.add_child(center)
	var panel=PanelContainer.new()
	var style=StyleBoxFlat.new()
	style.bg_color=Color(0.96,0.976,0.983,0.98)
	style.border_color=Color(0.76,0.83,0.86)
	style.set_border_width_all(1)
	style.content_margin_left=36
	style.content_margin_right=36
	style.content_margin_top=30
	style.content_margin_bottom=30
	panel.add_theme_stylebox_override("panel",style)
	center.add_child(panel)
	var box=VBoxContainer.new()
	box.custom_minimum_size.x=580
	box.add_theme_constant_override("separation",16)
	panel.add_child(box)
	box.add_child(text_label(kicker,12,MUTED))
	box.add_child(text_label(title,30,INK))
	if not description.is_empty():paragraph(box,description)
	return box

func show_title() -> void:
	close_door(true)
	clear_modal("title")
	var veil=ColorRect.new()
	veil.color=Color(0.94,0.965,0.98,0.9)
	veil.anchor_right=0.39
	veil.anchor_bottom=1
	modal.add_child(veil)
	var margin=MarginContainer.new()
	margin.anchor_left=0.045
	margin.anchor_top=0.14
	margin.anchor_right=0.35
	margin.anchor_bottom=0.91
	modal.add_child(margin)
	var box=VBoxContainer.new()
	box.add_theme_constant_override("separation",16)
	margin.add_child(box)
	box.add_child(text_label("M A C K Y   S T U D I O",12,MUTED))
	box.add_child(text_label("WHITE\nROOM",76,INK))
	box.add_child(text_label("白の境界",20,MUTED))
	box.add_child(text_label("どこまで歩いても、白。\n出口は、初めからここにある。",16,MUTED))
	var spacer=Control.new()
	spacer.custom_minimum_size.y=22
	box.add_child(spacer)
	if has_save and not profile.state.escaped:
		button(box,"続きから",func():begin_game(false),true)
	button(box,"はじめから",request_new_game,not has_save)
	button(box,"設定",func():return_mode="title";show_settings())
	button(box,"終了",quit_game)
	box.add_child(text_label("扉の選択が世界を変える / 自動保存",12,MUTED))
	var credits=LinkButton.new()
	credits.text="クレジット・ライセンス"
	credits.add_theme_font_size_override("font_size",12)
	credits.add_theme_color_override("font_color",MUTED)
	credits.pressed.connect(show_credits)
	box.add_child(credits)

func show_credits() -> void:
	var box=dialog("CREDITS","WHITE ROOM / 白の境界","制作：Macky Studio\nプログラム・3D 形状・シェーダー・音：本プロジェクトで制作\n日本語フォント：macOS システムフォント\nゲームエンジン：Godot（MIT License）","credits")
	var scroll=ScrollContainer.new()
	scroll.custom_minimum_size=Vector2(580,220)
	box.add_child(scroll)
	var license_label=Label.new()
	license_label.text=Engine.get_license_text()
	license_label.add_theme_color_override("font_color",INK)
	license_label.add_theme_font_size_override("font_size",13)
	license_label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	license_label.custom_minimum_size.x=550
	scroll.add_child(license_label)
	button(box,"タイトルへ戻る",show_title,true)

func request_new_game() -> void:
	if has_save:
		var box=dialog("NEW JOURNEY","新しく探索を始める","これまでの記録はバックアップに残します。\n新しい探索では50種類のうち20種類が入れ替わります。","new")
		button(box,"新しく始める",func():begin_game(true),true)
		button(box,"戻る",show_title)
	else:
		begin_game(true)

func resume_game() -> void:
	if failure_busy():return
	if is_instance_valid(modal):
		ui.remove_child(modal)
		modal.queue_free()
	modal=null
	mode="game"
	if is_instance_valid(sound):sound.suspend(false)
	if is_instance_valid(room):room.suspend(false)
	player.enabled=true
	if not automated:Input.mouse_mode=Input.MOUSE_MODE_CAPTURED
	hud.visible=true
	update_hud()

func show_pause() -> void:
	close_door(true)
	save_game()
	var box=dialog("PAUSED / 自動保存済み","ひと息、つく。","時間制限はありません。自分のペースで探索できます。","pause")
	button(box,"探索を続ける",resume_game,true)
	button(box,"観測記録・ヒント",show_journal)
	button(box,"設定",func():return_mode="pause";show_settings())
	button(box,"保存してタイトルへ",func():save_game();show_title())
	button(box,"保存して終了",func():save_game();quit_game())

func update_hud() -> void:
	if not is_instance_valid(sector):return
	danger_label.text=Failure.status(profile.state)
	danger_label.add_theme_color_override("font_color",Color(1,0.59,0.4) if profile.state.danger>=4 else Color(0.9,0.95,0.98))
	sector.text="ROUTE %02d / %02d   ·   SECTOR %02d"%[int(profile.state.route_index)+1,profile.state.route_rooms.size(),int(profile.state.room)]
	var marks=[]
	for id in [1,3,4]:
		marks.append(Room.SYMBOLS[id]+" "+(str(Puzzles.digit(profile.state,id)) if id in profile.state.clues else "—"))
	inventory.text="   ".join(marks)+("    KEY" if profile.state.key else "")
	if profile.state.powered:
		objective.text="始まりの区画で、隠された扉を探す"
	elif profile.state.key and profile.state.campaign and profile.state.solved_stations.size()<6:
		objective.text="観測器を校正する  %d / 6"%profile.state.solved_stations.size()
	elif profile.state.key:
		objective.text="◇ の区画で境界回路を復旧する"
	elif profile.state.cipher:
		objective.text="暗号盤の下にある保全キーを取る"
	elif profile.state.clues.size()==3:
		objective.text="∅ の区画へ戻り、観測値を入力する"
	else:
		objective.text="観測器を校正し、○・△・□ の数字を集める" if profile.state.campaign else "○・△・□ の観測記録を探す"

func show_journal(show_hint:bool=false) -> void:
	if show_hint:hint_level=mini(3,hint_level+1)
	var found=[]
	for id in [1,3,4]:
		found.append(Room.SYMBOLS[id]+"  =  "+(str(Puzzles.digit(profile.state,id)) if id in profile.state.clues else "未記録"))
	var description="     ".join(found)+"\n\n"+objective.text+"。\n扉の上の刻印で進路を選ぶ。↶ は安全に戻る扉。"
	if "origin" in profile.state.notes:
		description+="\n保全記録：入力順は ○ → △ → □。鍵は ◇ の回路盤へ。"
	if not profile.state.observed_anomalies.is_empty():
		description+="\n\n空間の観測  %d / 30"%profile.state.observed_anomalies.size()
		var latest=int(profile.state.observed_anomalies[-1])
		description+="\n"+Catalog.title(latest)+"："+Catalog.description(latest)
	description+="\n"+Failure.status(profile.state)+"。誤った扉で＋1、新しい順路へ進むと−2。5で死亡。"
	if profile.state.campaign:description+="\n校正済 %d / 8（6台で復旧）　音の記録 %d / 12"%[profile.state.solved_stations.size(),profile.state.heard_audio.size()]
	if hint_level>0:description+="\n\nヒント "+str(hint_level)+" / 3\n"+hint_text()
	var box=dialog("FIELD NOTES / 観測記録","白の中で、覚えておく。","","journal")
	var scroll=ScrollContainer.new()
	scroll.custom_minimum_size=Vector2(580,260)
	box.add_child(scroll)
	var notes=paragraph(scroll,description,17)
	notes.custom_minimum_size.x=550
	button(box,"区画の案内図・次の目的地",show_map)
	button(box,"次のヒントを見る",func():hint_level=mini(3,hint_level+1);show_journal())
	if not profile.state.observed_anomalies.is_empty() or not profile.state.heard_audio.is_empty() or not profile.state.solved_stations.is_empty():button(box,"異常観測の一覧",show_anomaly_log)
	button(box,"探索へ戻る",resume_game,true)

func show_anomaly_log() -> void:
	var box=dialog("ANOMALY ARCHIVE / 異常観測","白い世界が、変わった。","今回の50種類：空間30・音12・謎8。すべての観測は脱出の必須条件ではありません。","journal")
	var scroll=ScrollContainer.new()
	scroll.custom_minimum_size=Vector2(580,360)
	box.add_child(scroll)
	var list=VBoxContainer.new()
	list.add_theme_constant_override("separation",15)
	scroll.add_child(list)
	for id in profile.state.observed_anomalies:
		paragraph(list,"%02d  %s\n%s"%[int(id)+1,Catalog.title(int(id)),Catalog.description(int(id))],16)
	for id in profile.state.heard_audio:paragraph(list,"音 / "+Runs.AUDIO_NAMES[int(id)],16)
	for id in profile.state.solved_stations:paragraph(list,"校正 / %02d  %s"%[int(id),Puzzles.make(profile.state,int(id)).title],16)
	button(box,"観測記録へ戻る",show_journal,true)

func hint_text() -> String:
	var state=profile.state
	var text=Routes.clue(state)
	if hint_level>=2:
		text+="\n"+next_objective()
		if not Routes.task(state).is_empty():text+="\n"+Routes.task(state)
	if hint_level>=3:
		if int(state.route_index)<state.route_rooms.size()-1:
			var side=int(state.route_forward[int(state.route_index)])
			text+="\n進む扉は "+Routes.DIRECTIONS[side]+" / "+Routes.mark(state,side)+"。"
		if int(state.room)>0 and not int(state.room) in state.solved_stations:
			text+="\n観測器は北東寄り、床の小さな台。装置内のヒントを2回押すと答えを確認できる。"
		if int(state.room)==0 and state.clues.size()==3 and not state.key:
			text+="\n北壁の暗号は "+Puzzles.code(state)+"。解錠後、下のキーを E で取る。"
		if int(state.room)==2 and state.key:
			text+="\n回路は ○ → □ → △。校正が足りなければ ↶ から戻れる。"
	return text

func show_settings() -> void:
	var box=dialog("SETTINGS","自分に合う感覚に。","","settings")
	slider(box,"音量",float(profile.settings.volume),0,1,0.02,func(v):profile.settings.volume=v;apply_settings())
	slider(box,"マウス感度",float(profile.settings.sensitivity),0.04,0.3,0.01,func(v):profile.settings.sensitivity=v;apply_settings())
	slider(box,"視野角",float(profile.settings.fov),65,100,1,func(v):profile.settings.fov=v;apply_settings())
	slider(box,"明るさ",float(profile.settings.brightness),0.8,1.25,0.025,func(v):profile.settings.brightness=v;apply_settings())
	var gi=CheckButton.new()
	gi.text="高品質な間接光（動作が重い場合は OFF）"
	gi.button_pressed=bool(profile.settings.get("gi",true))
	gi.add_theme_color_override("font_color",INK)
	gi.toggled.connect(func(v):profile.settings.gi=v;apply_settings())
	box.add_child(gi)
	var bob=CheckButton.new()
	bob.text="歩行時の視点の揺れ"
	bob.button_pressed=bool(profile.settings.bob)
	bob.add_theme_color_override("font_color",INK)
	bob.toggled.connect(func(v):profile.settings.bob=v;apply_settings())
	box.add_child(bob)
	var full=CheckButton.new()
	full.text="フルスクリーン  /  F11"
	full.button_pressed=bool(profile.settings.fullscreen)
	full.add_theme_color_override("font_color",INK)
	full.toggled.connect(func(v):profile.settings.fullscreen=v;apply_settings())
	box.add_child(full)
	button(box,"設定を保存して戻る",settings_back,true)

func slider(box:Control,title:String,value:float,low:float,high:float,step:float,change:Callable) -> void:
	var row=HBoxContainer.new()
	var label=text_label(title,17,INK)
	label.custom_minimum_size.x=165
	row.add_child(label)
	var slide=HSlider.new()
	slide.custom_minimum_size=Vector2(300,32)
	slide.min_value=low
	slide.max_value=high
	slide.step=step
	slide.value=value
	row.add_child(slide)
	var amount=text_label("%.2f"%value,16,MUTED)
	amount.custom_minimum_size.x=65
	row.add_child(amount)
	slide.value_changed.connect(func(v):amount.text="%.2f"%v;change.call(v))
	box.add_child(row)

func apply_settings() -> void:
	if not is_instance_valid(player):return
	player.sensitivity=float(profile.settings.sensitivity)
	player.head_bob=bool(profile.settings.bob)
	player.camera.fov=float(profile.settings.fov)
	world_environment.environment.sdfgi_enabled=bool(profile.settings.get("gi",true))
	world_environment.environment.ambient_light_energy=0.055 if bool(profile.settings.get("gi",true)) else 0.19
	world_environment.environment.adjustment_enabled=true
	world_environment.environment.adjustment_brightness=float(profile.settings.brightness)
	if is_instance_valid(sound):sound.volume(0.0 if automated else float(profile.settings.volume))
	if not automated:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if profile.settings.fullscreen else DisplayServer.WINDOW_MODE_WINDOWED)

func settings_back() -> void:
	profile.save()
	if return_mode=="title":show_title()
	else:show_pause()

func show_ending() -> void:
	var minutes=int(profile.state.seconds/60)
	var box=dialog("BOUNDARY CROSSED","境界を、越えた。","白い世界の規則を見つけ、隠された扉を開いた。\n\n探索時間  %d 分    /    通過した扉  %d\n\nその先にも白は続く。けれど、もう閉じ込められてはいない。"%[minutes,int(profile.state.crossings)],"end")
	button(box,"20種類を入れ替えて新しい探索へ",func():begin_game(true),true)
	button(box,"タイトルへ",show_title)
	button(box,"終了",quit_game)

func toast(message:String,duration:float=4.0) -> void:
	if not is_instance_valid(toast_label):return
	toast_label.text=message
	toast_time=duration
	toast_label.modulate.a=1

func capture_run(args:PackedStringArray) -> void:
	print("CAPTURE START ",args)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	var path="res://screenshots/game.png"
	var shot="explore"
	for arg in args:
		if arg.begins_with("--capture="):path=arg.trim_prefix("--capture=")
		if arg.begins_with("--shot="):shot=arg.trim_prefix("--shot=")
	if shot!="title":
		begin_game(true)
		player.enabled=false
		toast_time=0
		if shot=="columns":
			profile.state.room=1
			profile.state.route_index=profile.state.route_rooms.find(1)
			build_room(1)
			player.position=Vector3(-23,0.05,24)
			player.rotation.y=-0.2
			player.camera.rotation.x=deg_to_rad(12)
		elif shot=="cipher":
			player.position=Vector3(-4.1,0.05,-27.0)
			player.rotation.y=-0.45
			player.camera.rotation.x=deg_to_rad(-3)
		elif shot=="journal":
			profile.state.clues=[1,3]
			show_journal()
		elif shot=="keypad":
			show_cipher()
		elif shot=="settings":
			show_settings()
		elif shot=="credits":
			show_credits()
		else:
			player.position=Vector3(-22,0.05,22)
			player.rotation.y=-0.27
			player.camera.rotation.x=deg_to_rad(14)
	var forced_room=-1
	var forced_event=-1
	var moment=8.0
	for arg in args:
		if arg.begins_with("--room="):forced_room=int(arg.trim_prefix("--room="))
		if arg.begins_with("--anomaly="):forced_event=int(arg.trim_prefix("--anomaly="))
		if arg.begins_with("--moment="):moment=float(arg.trim_prefix("--moment="))
	if forced_event>=0:
		profile.state.current_event=forced_event
		profile.state.danger=1
	if forced_room>=0:
		profile.state.room=forced_room
		profile.state.route_index=profile.state.route_rooms.find(forced_room)
		profile.state.route_furthest=profile.state.route_index
		build_room(forced_room)
		player.position=Vector3(-25,0.05,17)
		player.rotation.y=-0.55
		player.camera.rotation.x=deg_to_rad(10)
		update_hud()
	if shot=="station":
		for arg in args:
			if arg.begins_with("--puzzle="):profile.state.puzzle_pool[maxi(1,forced_room)-1]=int(arg.trim_prefix("--puzzle="))
		station_ui.open(self,maxi(1,forced_room))
	if shot=="journal-rich":
		profile.state.clues=[1,3,4]
		profile.state.observed_anomalies=[39]
		profile.state.notes=["origin"]
		hint_level=3
		show_journal()
	if shot in ["route","route-door"]:
		player.position=Vector3(-1.2,0.03,-24.2)
		player.rotation.y=0
		player.camera.rotation.x=deg_to_rad(3)
		if shot=="route":show_route_record()
	if shot=="map":
		profile.state.visits=[0,1,2,3,4,6]
		show_map()
	if shot in ["threat","death"]:
		var stage=4
		var cause=0
		for arg in args:
			if arg.begins_with("--stage="):stage=int(arg.trim_prefix("--stage="))
			if arg.begins_with("--cause="):cause=int(arg.trim_prefix("--cause="))
		player.position=Vector3(0,0.03,18)
		player.rotation.y=0
		player.pitch=0
		player.camera.rotation.x=0
		profile.state.danger=stage-1
		profile.state.deaths=0
		profile.state.anomaly_seed=cause+3000
		var wrong=range(4).filter(func(side):return Routes.choice(profile.state,side)=="wrong")[0]
		open_door(wrong)
		close_door(true)
		failure_sequence.tick(moment)
		apply_danger(10)
		if shot=="death":show_death()
		set_process(false)
	if "--no-hud" in args:hud.visible=false
	room.elapsed=moment
	room.phenomenon.elapsed=moment
	var frames=[]
	for i in range(180):
		await get_tree().process_frame
		RenderingServer.force_draw(false)
		if i>30:frames.append(get_process_delta_time()*1000)
	RenderingServer.force_draw(false)
	var image=get_viewport().get_texture().get_image()
	var err=image.save_png(path)
	frames.sort()
	var sum=0.0
	for ms in frames:sum+=ms
	print("CAPTURE ",shot," path=",path," status=",err," mean_ms=",sum/maxi(frames.size(),1)," p95_ms=",frames[int(frames.size()*0.95)]," renderer=",RenderingServer.get_current_rendering_method())
	await quit_game(0 if err==OK else 1)

func finish_station(id:int,controls:Array) -> bool:
	if failure_busy() or id in profile.state.solved_stations:return false
	if not profile.state.campaign or id<1 or id>8:return false
	var puzzle=Puzzles.make(profile.state,id)
	if not Puzzles.correct(puzzle,controls):return false
	if not id in profile.state.solved_stations:profile.state.solved_stations.append(id)
	profile.state.station_controls[str(id)]=controls.duplicate()
	if room.room_id==id and is_instance_valid(room.observation_display):room.observation_display.text=room.observation_text(id)
	sound.play("confirm",-16)
	save_game()
	if id in [1,3,4]:read_clue(id)
	else:
		resume_game()
		toast("観測器 %02d を校正。給電の安定まで %d / 6。"%[id,mini(6,profile.state.solved_stations.size())],5)
	update_hud()
	return true

func next_objective() -> String:
	var state=profile.state
	if state.powered:return "進路の記録に従い、00の西壁の隠された扉を探す。"
	if int(state.room)==0 and int(state.route_index)==4:
		return "北壁で ○ → △ → □ の暗号を解き、箱の下のキーを取る。" if not state.key else "進路の刻印に従い、次の区画へ進む。"
	if int(state.room)>0 and not int(state.room) in state.solved_stations and state.campaign:
		return "この部屋の観測器を校正する。現在 %d / 6台。"%state.solved_stations.size()
	if int(state.room)==2 and not state.powered:
		return "6台の校正とキーを確認し、北壁の回路を ○ → □ → △ につなぐ。"
	return "扉の左の進路の記録を読み、対応する刻印の扉へ進む。"

func show_route_record() -> void:
	var task=Routes.task(profile.state)
	var description=Routes.clue(profile.state)+"\n\n↶ は戻る扉。戻っても危険度は増えない。\n違う刻印の扉を開けると、同じ区画に戻り異変が強まる。"
	if not task.is_empty():description+="\n\n"+task
	var box=dialog("ROUTE / %02d"%(int(profile.state.route_index)+1),"進路の記録",description,"record")
	button(box,"扉の位置を確認する",show_map)
	button(box,"探索に戻る",resume_game,true)

func show_map() -> void:
	var state=profile.state
	var description="進路 %02d / %02d\n"%[int(state.route_index)+1,state.route_rooms.size()]+Routes.clue(state)
	var back=Routes.back_side(state)
	if back>=0:description+="\n戻る扉："+Routes.DIRECTIONS[back]+" / ↶（安全）"
	if int(state.route_index)<state.route_rooms.size()-1:
		var side=int(state.route_forward[int(state.route_index)])
		description+="\n進む扉："+Routes.DIRECTIONS[side]+" / "+Routes.mark(state,side)
	description+="\n\n"+next_objective()
	if not Routes.task(state).is_empty():description+="\n"+Routes.task(state)
	var box=dialog("ROUTE NOTES / 進路の記録","先へ進むか、引き返すか。",description,"journal")
	var steps=[]
	for i in range(state.route_rooms.size()):
		steps.append("●" if i==int(state.route_index) else ("○" if i<=int(state.route_furthest) else "·"))
	paragraph(box," ― ".join(steps),16)
	paragraph(box,"誤った扉の先は同じ区画。遠くの別世界へ進んではいない。\n新しい順路へ進むと危険度 −2。装置の試行錯誤は自由。",16)
	button(box,"観測記録へ",show_journal)
	button(box,"探索に戻る",resume_game,true)

func failure_busy() -> bool:
	return bool(profile.state.get("dead",false)) or bool(profile.state.get("route_pending_wrong",false)) or mode in ["hazard","death","failure_pause"]

func present_failure() -> void:
	route_presenting=true
	profile.state.route_pending_wrong=false
	close_door(true)
	route_presenting=false
	# Persist the terminal state before showing the lethal animation.
	save_game()
	failure_return_mode=mode
	if is_instance_valid(modal):modal.visible=false
	mode="hazard"
	player.enabled=false
	player.velocity=Vector3.ZERO
	player.test_input=Vector2.ZERO
	room.suspend(true)
	sound.suspend(false)
	sound.play_threat(int(profile.state.danger),int(profile.state.death_cause))
	hud.visible=true
	prompt.text=""
	toast_label.add_theme_color_override("font_color",Color(1,0.83,0.67))
	toast_label.add_theme_color_override("font_shadow_color",Color(0.01,0.015,0.02))
	toast_label.add_theme_constant_override("shadow_offset_x",1)
	toast_label.add_theme_constant_override("shadow_offset_y",1)
	toast(Failure.WARNINGS[int(profile.state.danger)],6)
	failure_sequence.start(self,int(profile.state.danger),int(profile.state.death_cause))
	update_hud()

func apply_danger(delta:float) -> void:
	if not is_instance_valid(danger_shade):return
	var value=int(profile.state.get("danger",0))
	var factor=[1.0,0.78,0.55,0.36,0.2,0.11][value]
	if mode in ["title","new","credits","end"]:factor=1.0
	world_environment.environment.tonemap_exposure=lerpf(world_environment.environment.tonemap_exposure,1.12*factor,minf(1,delta*2.5))
	var blackout=0.0
	if mode=="hazard" and value==5:blackout=smoothstep(0.7,1.0,failure_sequence.elapsed/failure_sequence.duration)
	danger_shade.color.a=blackout

func advance_failure(delta:float) -> void:
	if mode=="hazard":
		if failure_sequence.tick(delta):
			if profile.state.dead:
				show_death()
			else:
				failure_sequence.reset()
				mode=failure_return_mode
				if mode=="game":
					build_room(int(profile.state.room))
					sound.enter_space(int(profile.state.current_audio) if profile.state.danger>0 else -1,player)
				if is_instance_valid(modal):modal.visible=true
				hud.visible=mode=="game"
				player.enabled=mode=="game"
				room.suspend(mode!="game")
				sound.suspend(mode!="game")
				if is_instance_valid(puzzle_feedback) and mode in ["cipher","relay"]:puzzle_feedback.text=Failure.status(profile.state)+"。記録を確かめよう。"
				if mode=="station" and is_instance_valid(station_ui.feedback):station_ui.feedback.text=Failure.status(profile.state)+"。確定前にヒントを。"
	elif mode=="death":
		death_elapsed+=delta
		if is_instance_valid(death_countdown):death_countdown.text="%d 秒後、始まりの部屋へ戻る。"%maxi(0,ceili(8-death_elapsed))
		if death_elapsed>=8:restart_after_death()

func show_death() -> void:
	if failure_sequence.active:failure_sequence.reset(false)
	death_elapsed=0
	danger_shade.color.a=0
	toast_time=0
	var cause=Failure.CAUSES[posmod(int(profile.state.death_cause),3)]
	var description=cause+"。\n\n"+str(profile.state.last_failure)+"。\n誤った扉を開け続け、危険度が5に達した。\n\n鍵・校正・探索の進行は失われる。\n同じ順路に戻る。次は、進路の記録と扉の刻印を確かめよう。"
	var box=dialog("BOUNDARY REJECTED / %d 回目の死"%int(profile.state.deaths),"死亡",description,"death")
	modal.get_child(0).color=Color(0.008,0.012,0.02,0.98)
	var panel=box.get_parent()
	var style=panel.get_theme_stylebox("panel").duplicate()
	style.bg_color=Color(0.035,0.05,0.065)
	style.border_color=Color(0.17,0.21,0.23)
	panel.add_theme_stylebox_override("panel",style)
	for child in box.get_children():
		if child is Label:child.add_theme_color_override("font_color",Color(0.79,0.84,0.87))
	death_countdown=text_label("8 秒後、始まりの部屋へ戻る。",17,Color(0.92,0.68,0.53))
	box.add_child(death_countdown)
	button(box,"今すぐ最初からやり直す",restart_after_death,true)
	button(box,"中断",pause_failure)
	save_game()

func restart_after_death() -> void:
	if mode!="death" or not profile.state.dead:return
	profile.retry_after_death()
	mode="restart"
	begin_game(false)
	toast("最初の部屋に戻った。同じ順路で、覚えた刻印を生かそう。",8)

func pause_failure() -> void:
	if not mode in ["hazard","death"]:return
	failure_pause_mode=mode
	failure_saved_modal=modal
	if is_instance_valid(failure_saved_modal):failure_saved_modal.visible=false
	modal=null
	var box=dialog("PAUSED","中断中","演出と再開までの時間は止まっています。","failure_pause")
	button(box,"続ける",resume_failure,true)
	button(box,"保存して終了",func():save_game();quit_game())
	save_game()

func resume_failure() -> void:
	if mode!="failure_pause":return
	ui.remove_child(modal)
	modal.queue_free()
	modal=failure_saved_modal
	failure_saved_modal=null
	mode=failure_pause_mode
	if is_instance_valid(modal):modal.visible=mode=="death"
	hud.visible=mode=="hazard"
	sound.suspend(mode!="hazard")
