extends Node3D
const Art = preload("res://scripts/art.gd")
signal medal_won(count: int)
signal message(text: String)
signal bonus_changed
signal jackpot
var sound: Node
var kind := 0
var playing := false
var rng := RandomNumberGenerator.new()
var coins: Array[RigidBody3D] = []
var spare_coins: Array[RigidBody3D] = []
var balls: Array[RigidBody3D] = []
var guided: Array[Dictionary] = []
var rails: Array[Node3D] = []
var rail_ends: Array[Vector3] = []
var rail_starts: Array[Vector3] = []
var angles := [0.0,0.0]
var pusher: AnimatableBody3D
var hopper: Node3D
var camera: Camera3D
var world_environment: WorldEnvironment
var coin_batch: MultiMeshInstance3D
var press_caps: Array[Node3D] = []
var counter_label: Label3D
var status_label: Label3D
var transport_points: Array = []
var transit_path: Array = []
var return_start := Vector3(0,2.35,-1.80)
var draw_outlets: Array[Vector3] = []
var stacks: Array = []
var next_stack_id := 0
var audio_tick := 0
var phase := 0.0
var elapsed := 0.0
var payout_left := 0
var payout_clock := 0.0
var ball_count := 0
var royal_colors := [false,false,false]
var payout_multiplier := 1
var round_stage := 0
var roulette_root: Node3D
var bonus_show: Node3D
var roulette_ball: RigidBody3D
var roulette_clock := -1.0
var roulette_color := 0
var roulette_turn := 0.0
var transit: MeshInstance3D
var transit_t := -1.0
var pending_colors: Array[int] = []
var tower_left := 0
var tower_index := 0
var tower_clock := 0.0
var tower_layer: Node3D
var tower_visuals: Array[Node3D] = []
var tower_transfer := -1.0
var rail_lights: Array[Node3D] = []
var progress_lights: Array[MeshInstance3D] = []
var collection_balls: Array[MeshInstance3D] = []
var selected_side := 0
var last_lever_sound := 0.0
var audit := {"rail_exits":0,"wins":0,"losses":0,"balls":0,"rounds":0,"towers":0,"pocket_hits":0,"roulette_recoveries":0,"routes":0,"tower_collapses":0}
var loss_samples: Array = []
const BALL_COLORS := [Color("bf2948"),Color("198fbf"),Color("29a887")]
const PAYOUT_SOFT_DENSITY := 1200
const FRONT_EDGE := 2.67
const ROULETTE_CENTER := Vector3(0,2.65,-1.80)

func setup(machine_kind: int, audio: Node, snapshot: Dictionary = {}) -> void:
	kind = machine_kind
	sound = audio
	rng.seed = 82231 + kind*972
	build_environment()
	build_cabinet()
	if kind != 2: build_roulette()
	bonus_show = preload("res://scripts/party_slot.gd").new() if kind == 2 else preload("res://scripts/bonus_show.gd").new()
	add_child(bonus_show)
	bonus_show.setup(self)
	Art.batch_static(self,[pusher,hopper,tower_layer]+progress_lights+press_caps)
	coin_batch = preload("res://scripts/coin_batch.gd").new()
	add_child(coin_batch)
	for i in 2:
		var root := preload("res://scripts/rail.gd").new()
		add_child(root)
		rails.append(root)
		rail_starts.append(Vector3(-1.72 if i == 0 else 1.72,1.24,3.08))
		rail_ends.append(Vector3.ZERO)
		set_angle(i,0.0)
	if snapshot.is_empty(): seed_field()
	else: restore(snapshot)
	select_rail(0)
	refresh_lights()
	coin_batch.sync_all()

func build_environment() -> void:
	world_environment = WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_CANVAS
	e.background_canvas_max_layer = -1
	e.background_color = Color("070c13")
	var sky := Sky.new()
	var sm := ShaderMaterial.new()
	sm.shader = load("res://shaders/arcade_sky.gdshader")
	sm.set_shader_parameter("panorama",load("res://assets/generated/arcade-reflection-v3.png"))
	sky.sky_material = sm
	sky.radiance_size = Sky.RADIANCE_SIZE_512
	e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	e.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	e.ambient_light_energy = 0.45
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	e.glow_enabled = true
	e.glow_intensity = 0.42
	e.glow_bloom = 0.08
	world_environment.environment = e
	add_child(world_environment)
	camera = Camera3D.new()
	add_child(camera)
	camera.position = Vector3(0,12.8,8.8)
	camera.look_at(Vector3(0,0.85,0.35))
	camera.fov = 40
	camera.current = true
	camera.near = 0.05
	for i in 4:
		var l := SpotLight3D.new()
		add_child(l)
		l.position = [Vector3(-2,4,1),Vector3(2,4,-1),Vector3(0,4,-3),Vector3(0,5,4)][i]
		l.look_at(Vector3(0,0,2.0 if i == 3 else -0.3))
		l.light_color = [Color("fff4e6"),Color("e5edff"),Color("ffd8a1"),Color("ecf2ff")][i]
		l.light_energy = [0.90,0.75,0.85,0.7][i]
		if kind == 2 and i >= 2:
			l.light_color = Color("ff62cf") if i == 2 else Color("5ccfff")
			l.light_energy = 0.65 if i == 2 else 0.45
		l.spot_range = 12
		l.spot_angle = 62
		l.shadow_enabled = i < 2
		l.shadow_bias = 0.04

func build_cabinet() -> void:
	preload("res://scripts/cabinet.gd").build(self)

func build_roulette() -> void:
	roulette_root = preload("res://scripts/roulette.gd").new()
	add_child(roulette_root)
	roulette_root.position = ROULETTE_CENTER
	roulette_root.build(kind == 1)

func seed_field() -> void:
	for row in 15:
		for column in 12:
			var p := Vector3(-1.68+column*0.303+(row%2)*0.08,0.031,-1.85+row*0.304)
			if p.z < -0.48: continue
			if kind == 1 and under_tower(p): continue
			spawn_coin(p,false)
	for row in 4:
		for column in 12:
			spawn_coin(Vector3(-1.66+column*0.3,0.48,-1.895+row*0.295+(column%2)*0.05),false)
	for row in 5:
		for column in 11:
			spawn_coin(Vector3(-1.52+column*0.3,0.525,-1.87+row*0.28),false)
	# A real pusher is loaded to its front lip, not an empty setback from the drop.
	for column in 12:
		spawn_coin(Vector3(-1.66+column*0.30,0.03,2.64),false)
	for row in 11:
		for column in 11:
			var p := Vector3(-1.53+column*0.30+(row%2)*0.055,0.068,-0.31+row*0.298)
			if kind == 1 and under_tower(p): continue
			var medal := spawn_coin(p,false)
			medal.rotation.x = rng.randf_range(-0.08,0.08)
			medal.rotation.z = rng.randf_range(-0.08,0.08)
	for row in 10:
		for column in 10:
			var pos := Vector3(-1.46+column*0.305,0.111,-0.10+row*0.296)
			if kind == 1 and under_tower(pos): continue
			spawn_coin(pos,false)
	if kind == 1:
		make_tower(Vector3(0,0.001,0.55),36,true)
		make_tower(Vector3(-1.22,0.001,0.83),22,false)
		make_tower(Vector3(1.22,0.001,0.83),22,false)
	for i in 3:
		var p := Vector3(-1.18+i*1.18,0.4,2.34)
		if kind == 1: p = [Vector3(-1.55,0.4,2.60),Vector3(0,0.4,2.60),Vector3(1.55,0.4,2.60)][i]
		spawn_ball(p,i)

func under_tower(p: Vector3) -> bool:
	if Vector2(p.x,p.z-0.55).length() < 0.62: return true
	return Vector2(absf(p.x)-1.22,p.z-0.83).length() < 0.39

func spawn_coin(pos: Vector3, sound_contact: bool = true) -> RigidBody3D:
	var b: RigidBody3D
	var fresh := spare_coins.is_empty()
	if not spare_coins.is_empty():
		b = spare_coins.pop_back()
		b.visible = true
		b.freeze = false
		b.collision_layer = 1
		b.collision_mask = 1
	else:
		b = RigidBody3D.new()
		b.mass = 0.032
		b.linear_damp = 0.26
		b.angular_damp = 0.35
		b.continuous_cd = sound_contact
		var pm := PhysicsMaterial.new()
		pm.friction = 0.43
		pm.bounce = 0.06
		b.physics_material_override = pm
		var c := CollisionShape3D.new()
		c.shape = Art.coin_collision()
		b.add_child(c)
		b.contact_monitor = false
		b.max_contacts_reported = 0
		add_child(b)
	b.set_meta("audible",sound_contact)
	b.set_meta("grouped",false)
	b.set_meta("stack_id",-1)
	b.set_meta("tower",false)
	b.set_meta("stack_motion",false)
	b.angular_damp = 0.35
	b.physics_material_override.friction = 0.43
	b.physics_material_override.bounce = 0.06
	b.continuous_cd = sound_contact
	b.position = pos
	b.rotation = Vector3(0,rng.randf_range(0,TAU),0)
	b.linear_velocity = Vector3.ZERO
	b.angular_velocity = Vector3.ZERO
	b.sleeping = false
	coins.append(b)
	if fresh: coin_batch.register(b)
	b.reset_physics_interpolation()
	return b

func retire_coin(b: RigidBody3D) -> void:
	coins.erase(b)
	b.freeze = true
	b.visible = false
	b.collision_layer = 0
	b.collision_mask = 0
	b.position = Vector3(0,-30,0)
	spare_coins.append(b)

func spawn_ball(pos: Vector3, color_id: int) -> RigidBody3D:
	if balls.size() >= 7: return null
	var b := RigidBody3D.new()
	b.mass = 0.075
	b.linear_damp = 0.7
	b.angular_damp = 0.35
	var shape := SphereShape3D.new()
	shape.radius = 0.21
	var c := CollisionShape3D.new()
	c.shape = shape
	b.add_child(c)
	Art.ball_visual(b,0.21,BALL_COLORS[color_id%3])
	b.set_meta("color",color_id%3)
	var pm := PhysicsMaterial.new()
	pm.friction = 0.55
	pm.bounce = 0.15
	b.physics_material_override = pm
	add_child(b)
	b.position = pos
	balls.append(b)
	return b

func make_tower(base: Vector3, layers: int, wide: bool) -> void:
	var members: Array = []
	for y in layers:
		var count := 7 if wide else 1
		for i in count:
			var offset := Vector3.ZERO
			if i > 0:
				# Alternate half a cell: each outer medal bridges two below it.
				var a := TAU*(i-1)/6.0 + (y%2)*PI/6.0
				offset = Vector3(sin(a)*0.30,0,cos(a)*0.30)
			var medal := spawn_coin(base+offset+Vector3(0,0.019+y*0.037,0),false)
			# Individual rendering, aggregate resting collision; released on impact/tilt.
			medal.sleeping = true
			medal.set_meta("tower",true)
			medal.angular_damp = 1.2
			medal.physics_material_override.bounce = 0.0
			medal.physics_material_override.friction = 0.55
			members.append(medal)
	var height := (layers-1)*0.037+0.036
	var stack := preload("res://scripts/tower_stack.gd").new()
	add_child(stack)
	stack.configure(self,members,base+Vector3(0,height/2,0),0.445 if wide else 0.145,height,next_stack_id)
	next_stack_id += 1
	stacks.append(stack)

func set_angle(side: int, value: float) -> void:
	if playing and absf(value-angles[side]) > 0.008 and elapsed-last_lever_sound > 0.09:
		sound.play("lever",0.55)
		last_lever_sound = elapsed
	angles[side] = clampf(value,-1,1)
	var start := rail_starts[side]
	var target_x: float = (-0.78 if side == 0 else 0.78)+angles[side]*0.85
	var end := Vector3(clampf(target_x,-1.7,1.7),0.62,-1.73)
	rail_ends[side] = end
	for g in guided:
		if g.side == side:
			g.start = start+Vector3(0,0.147,0)
			g.end = end+Vector3(0,0.147,0)
	rails[side].configure(start,end,angles[side])

func select_rail(side: int) -> void:
	selected_side = side
	for i in rails.size(): rails[i].set_selected(i == side)

func insert(side: int) -> bool:
	if not playing or guided.size() >= 14: return false
	add_guided(side,0.0)
	sound.play("button",0.4,-0.5 if side == 0 else 0.5)
	sound.play("insert",0.8,-0.5 if side == 0 else 0.5)
	sound.play("launch",0.45,-0.5 if side == 0 else 0.5)
	return true

func add_guided(side: int, travel_time: float) -> void:
	var visual := Art.coin_visual(self)
	var start := rail_starts[side]+Vector3(0,0.147,0)
	var end := rail_ends[side]+Vector3(0,0.147,0)
	var t := clampf(pow(travel_time/0.90,1.5),0,1)
	var d := (end-start).normalized()
	visual.position = start.lerp(end,t)
	visual.basis = Basis(Vector3.UP,atan2(-d.x,-d.z))*Basis(Vector3.FORWARD,PI/2)*Basis(Vector3.UP,t*start.distance_to(end)/0.145)
	guided.append({"node":visual,"t":travel_time,"start":start,"end":end,"side":side})

func _physics_process(delta: float) -> void:
	if not playing: return
	elapsed += delta
	phase += delta
	var z := -1.65 + 0.36*sin(phase*TAU/3.2)
	pusher.position.z = z
	for g in guided.duplicate():
		g.t += delta
		var t := clampf(pow(g.t/0.90,1.5),0,1)
		var d: Vector3 = (g.end-g.start).normalized()
		g.node.position = g.start.lerp(g.end,t)
		g.node.basis = Basis(Vector3.UP,atan2(-d.x,-d.z))*Basis(Vector3.FORWARD,PI/2)*Basis(Vector3.UP,t*g.start.distance_to(g.end)/0.145)
		if t >= 1:
			var b := spawn_coin(g.end)
			if b:
				b.basis = g.node.basis
				b.linear_velocity = d*2.0
				b.angular_velocity = Vector3.UP.cross(d)*2.0/0.145
			g.node.queue_free()
			guided.erase(g)
			audit.rail_exits += 1
			if kind == 2: bonus_show.medal_arrived()
	audio_tick += 1
	for i in range(coins.size()-1,-1,-1):
		var b := coins[i]
		if b.get_meta("grouped",false): continue
		if not b.sleeping and i%12 == audio_tick%12:
			var speed := b.linear_velocity.length()
			if speed > 0.35 and b.position.y < 0.60: sound.contact(speed)
		if b.position.y < -0.20:
			if b.position.z > FRONT_EDGE and absf(b.position.x) < 1.94:
				medal_won.emit(1)
				audit.wins += 1
				sound.play("coin",0.6)
			else:
				audit.losses += 1
				if loss_samples.size() < 12: loss_samples.append(b.position)
			retire_coin(b)
		elif b.position.length_squared() > 100: retire_coin(b)
	for b in balls.duplicate():
		if b.position.y < -0.2:
			if b.position.z > FRONT_EDGE-0.05 and absf(b.position.x) < 2.1: capture_ball(int(b.get_meta("color")))
			balls.erase(b)
			b.queue_free()
	if elapsed > 20 and balls.is_empty() and transit_t < 0 and roulette_clock < 0:
		spawn_ball(Vector3(rng.randf_range(-1.3,1.3),0.9,-1.8),rng.randi_range(0,2))
	if payout_left > 0:
		hopper.position.x = sin(elapsed*1.9)*1.30
		payout_clock -= delta
		# Reserve room for the player's rails while a large prize is dispensed.
		if payout_clock <= 0 and coins.size()+guided.size()+tower_visuals.size() < PAYOUT_SOFT_DENSITY:
			payout_clock = 0.065
			var b := spawn_coin(hopper.position+Vector3(rng.randf_range(-0.08,0.08),-0.22,0.43))
			if b:
				b.linear_velocity = Vector3(0,-0.2,0.6)
				b.angular_velocity = Vector3(rng.randf_range(-2,2),0,rng.randf_range(-2,2))
				payout_left -= 1
				if payout_left%4 == 0: sound.play("tower",0.27,hopper.position.x*0.4)
	process_transit(delta)
	process_roulette(delta)
	process_builder(delta)
	if kind == 2: bonus_show.advance(delta)

func capture_ball(color_id: int) -> void:
	audit.balls += 1
	ball_count += 1
	pending_colors.append(color_id)
	sound.play("ball")
	message.emit("ボール獲得！ 抽選レーンへ")
	bonus_changed.emit()
	if kind == 0:
		payout_left += 10
	refresh_lights()

func process_transit(delta: float) -> void:
	if transit_t < 0 and roulette_clock < 0 and not pending_colors.is_empty():
		roulette_color = pending_colors.pop_front()
		transit = Art.ball_visual(self,0.085 if kind == 1 else 0.105,BALL_COLORS[roulette_color])
		transit_path = transport_points.duplicate()
		if kind == 1 and round_stage > 0:
			# A won inner-ring attempt returns below the wheel to the same lift.
			transit_path = [return_start,Vector3(2.28,2.36,-2.64),Vector3(2.28,3.12,-2.64),draw_outlets[round_stage]]
		elif kind == 0:
			var collected := royal_colors.duplicate()
			collected[roulette_color] = true
			if not (collected[0] and collected[1] and collected[2]):
				transit_path[4] = Vector3(1.72+roulette_color*0.20,3.17,-2.93)
		transit_t = 0
	if transit_t < 0: return
	transit_t += delta*0.8
	var points := transit_path
	var seg := mini(int(transit_t),points.size()-2)
	transit.position = points[seg].lerp(points[seg+1],minf(1,transit_t-seg))
	if transit_t >= points.size()-1:
		transit.queue_free()
		transit = null
		transit_t = -1
		audit.routes += 1
		if kind == 0: royal_colors[roulette_color] = true
		refresh_lights()
		bonus_changed.emit()
		if kind == 2:
			bonus_show.add_spins(3)
			message.emit("PARTY BALL  •  スロット3回追加！")
		elif kind == 1 or (royal_colors[0] and royal_colors[1] and royal_colors[2]):
			start_roulette()
		else:
			message.emit("カラー獲得  •  3色をそろえるとポケット抽選！")

func start_roulette() -> void:
	if kind == 2: return
	if is_instance_valid(roulette_ball): return
	roulette_clock = 0
	sound.roulette_start(round_stage if kind == 1 else 0)
	bonus_show.begin(round_stage if kind == 1 else 0)
	audit.rounds += 1
	roulette_root.set_stage(round_stage if kind == 1 else 0)
	roulette_root.set_shutters(0.0)
	roulette_ball = RigidBody3D.new()
	roulette_ball.mass = 0.15
	roulette_ball.linear_damp = 0.08
	roulette_ball.angular_damp = 0.12
	roulette_ball.continuous_cd = true
	roulette_ball.collision_layer = 4
	roulette_ball.collision_mask = 4
	var col := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = roulette_root.ball_radius()
	col.shape = shape
	roulette_ball.add_child(col)
	Art.ball_visual(roulette_ball,shape.radius,BALL_COLORS[roulette_color])
	add_child(roulette_ball)
	var launch: Vector3 = roulette_root.launch_position()
	roulette_ball.position = ROULETTE_CENTER+launch
	roulette_ball.linear_velocity = Vector3(launch.z,0,-launch.x).normalized()*rng.randf_range(1.7,2.6)
	message.emit("ポケットに入れば当選  •  ボールの行方に注目")
	bonus_changed.emit()

func process_roulette(delta: float) -> void:
	if roulette_clock < 0 or not is_instance_valid(roulette_ball): return
	roulette_clock += delta
	roulette_root.set_shutters(clampf((roulette_clock-2.2)/0.35,0,1))
	var offset := roulette_ball.position-ROULETTE_CENTER
	sound.roulette_update(delta,roulette_clock,roulette_ball.linear_velocity.length(),atan2(offset.x,offset.z))
	var hit: int = roulette_root.hit_index(offset)
	if hit >= 0:
		return_start = roulette_ball.position-Vector3(0,0.15,0)
		roulette_ball.queue_free()
		roulette_ball = null
		roulette_clock = -1
		audit.pocket_hits += 1
		resolve_roulette(hit)
		return
	if offset.y < -0.6 or Vector2(offset.x,offset.z).length() > 1.65:
		# Mechanical escape recovery restarts the same draw; it never assigns a prize.
		roulette_ball.position = ROULETTE_CENTER+roulette_root.launch_position()
		roulette_ball.linear_velocity = Vector3(1.7,0,0)
		roulette_ball.reset_physics_interpolation()
		audit.roulette_recoveries += 1
	roulette_ball.apply_central_force(roulette_root.guide_force(offset,roulette_clock))

func resolve_roulette(sector: int) -> void:
	if kind == 2: return
	var resolved_stage := round_stage if kind == 1 else 0
	var is_advance := kind == 1 and sector == 4 and round_stage < 2
	var is_jp := sector == 4 and not is_advance
	var payout_before := payout_left
	var multiplier := payout_multiplier if kind == 0 else 1
	if kind == 0:
		royal_colors = [false,false,false]
		payout_multiplier = 1
	if sector == 4:
		if kind == 1 and round_stage < 2:
			round_stage += 1
			pending_colors.append(roulette_color)
			message.emit("ROUND %d / 3  •  次の抽選へ" % (round_stage+1))
		else:
			payout_left += 180*multiplier if kind == 0 else 260
			if kind == 1: tower_left += 98
			round_stage = 0
			royal_colors = [false,false,false]
			jackpot.emit()
			message.emit("JACKPOT  •  大量払い出し！")
	elif sector == 3:
		if kind == 1: round_stage = 0
		spawn_ball(Vector3(rng.randf_range(-1.2,1.2),0.9,-1.7),rng.randi_range(0,2))
		payout_left += 15*multiplier
		message.emit("BALL BONUS  •  ボール追加 ＋ %d枚払い出し"%(15*multiplier))
	else:
		var reward: int = [20,40,80][sector]*multiplier
		payout_left += reward
		if kind == 0 and sector == 2: payout_multiplier = 2
		if kind == 1:
			tower_left += 21+sector*14
			round_stage = 0
		message.emit("%d MEDALS  •  %s" % [reward,"次の抽選の払出し ×2！" if payout_multiplier == 2 else "フィールドへ払い出し"])
	var prize := payout_left-payout_before
	sound.roulette_result("advance" if is_advance else ("jackpot" if is_jp else "win"))
	roulette_root.last_hit = sector
	var title := "NEXT STAGE!" if is_advance else ("JACKPOT!" if is_jp else "%d MEDALS"%prize)
	var detail := "第%d段階へ進出"%(round_stage+1) if is_advance else "%d枚を盤面へ払い出し"%prize
	if sector == 3: detail = "ボール追加 ＋ %d枚"%prize
	elif kind == 0 and sector == 2: detail = "次回の払い出し ×2"
	elif is_jp and kind == 1: detail = "260枚 ＋ 新タワー98枚"
	bonus_show.finish(sector,resolved_stage,title,detail,is_jp)
	bonus_changed.emit()
	refresh_lights()

func refresh_lights() -> void:
	if is_instance_valid(roulette_root): roulette_root.set_stage(round_stage if kind == 1 else 0)
	for i in collection_balls.size(): collection_balls[i].visible = royal_colors[i]
	for i in progress_lights.size():
		var lit: bool = royal_colors[i] if kind == 0 else i < round_stage
		var color: Color = BALL_COLORS[i] if kind == 0 else Color("eac271")
		if kind == 2:
			lit = bonus_show.mode == "spin" or i < bonus_show.medal_count
			color = Color("ff43c9") if i%2 == 0 else Color("36dfff")
		progress_lights[i].material_override = Art.mat("progress%d_%d_%s" % [kind,i,str(lit)],color,0.45,0.2,1.8 if lit else 0.0)

func process_builder(delta: float) -> void:
	if kind != 1: return
	if tower_transfer >= 0:
		tower_transfer += delta*0.22
		tower_layer.position.z = lerpf(-0.85,1.85,smoothstep(0.25,0.75,tower_transfer))
		tower_layer.position.y = lerpf(0.55,1.55,smoothstep(0,0.25,tower_transfer))-1.39*smoothstep(0.75,1,tower_transfer)
		if tower_transfer >= 1:
			var members: Array = []
			for m in tower_visuals:
				var medal := spawn_coin(m.global_position,false)
				medal.rotation = m.global_rotation
				members.append(medal)
				m.queue_free()
			var height := (ceili(members.size()/7.0)-1)*0.037+0.036
			var stack := preload("res://scripts/tower_stack.gd").new()
			add_child(stack)
			stack.configure(self,members,tower_layer.position+Vector3(0,height/2,0),0.445,height,next_stack_id)
			next_stack_id += 1
			stacks.append(stack)
			tower_visuals.clear()
			tower_index = 0
			tower_layer.position = Vector3(0,0.55,-0.85)
			tower_transfer = -1
			audit.towers += 1
			sound.play("tower",0.8)
			message.emit("NEW TOWER  •  メダルタワー搬入！")
		return
	if tower_left <= 0 or coins.size()+guided.size()+tower_visuals.size() >= PAYOUT_SOFT_DENSITY: return
	tower_clock -= delta
	if tower_clock <= 0:
		tower_clock = 0.09
		var layer := tower_index/7
		var slot := tower_index%7
		var pos := Vector3(0,0.019+layer*0.037,0)
		if slot > 0:
			var angle := TAU*(slot-1)/6+(layer%2)*PI/6.0
			pos += Vector3(sin(angle)*0.30,0,cos(angle)*0.30)
		var m := Art.coin_visual(tower_layer)
		m.position = pos
		tower_visuals.append(m)
		tower_index += 1
		tower_left -= 1
		if tower_left == 0 or tower_index >= 140: tower_transfer = 0

func serialize() -> Dictionary:
	var entries: Array = []
	for b in coins:
		entries.append({"p":vec(b.position),"r":vec(b.rotation),"v":vec(b.linear_velocity),"w":vec(b.angular_velocity),"stack":b.get_meta("stack_id",-1)})
	var party_guided: Array = []
	for g in guided:
		if kind == 2: party_guided.append({"side":g.side,"t":g.t})
		else: entries.append({"p":vec(g.end),"r":[0,0,PI/2],"v":[0,0,-2],"w":[0,0,0]})
	var bs: Array = []
	for b in balls: bs.append({"p":vec(b.position),"color":b.get_meta("color")})
	var pending := pending_colors.duplicate()
	if transit_t >= 0 or roulette_clock >= 0: pending.push_front(roulette_color)
	var groups: Array = []
	for stack in stacks:
		if is_instance_valid(stack) and not stack.released: groups.append(stack.snapshot())
	return {"layout":3,"stacks":groups,"coins":entries,"balls":bs,"phase":phase,"angles":angles,"payout":payout_left,
		"party":bonus_show.snapshot() if kind == 2 else {},
		"party_guided":party_guided,
		"pending":pending,"royal":royal_colors,"multiplier":payout_multiplier,"ball_count":ball_count,"round":round_stage,
		"tower_left":tower_left+tower_visuals.size()}

func restore(data: Dictionary) -> void:
	if kind == 2: bonus_show.restore(data.get("party",{}))
	var grouped: Dictionary = {}
	for entry in data.get("coins",[]):
		if not entry is Dictionary: continue
		var pos := restore_position(entry.get("p",[0,1,0]),data)
		var b := spawn_coin(pos,false)
		if b:
			b.rotation = vector(entry.get("r",[0,0,0]))
			b.linear_velocity = vector(entry.get("v",[0,0,0]))
			b.angular_velocity = vector(entry.get("w",[0,0,0]))
			var identifier := int(entry.get("stack",-1))
			if identifier >= 0:
				if not grouped.has(identifier): grouped[identifier] = []
				grouped[identifier].append(b)
	for entry in data.get("stacks",[]):
		if not entry is Dictionary: continue
		var identifier := int(entry.get("id",-1))
		if not grouped.has(identifier): continue
		var stack := preload("res://scripts/tower_stack.gd").new()
		add_child(stack)
		stack.configure(self,grouped[identifier],vector(entry.p),float(entry.radius),float(entry.height),identifier,vector(entry.r))
		stack.linear_velocity = vector(entry.get("v",[0,0,0]))
		stack.angular_velocity = vector(entry.get("w",[0,0,0]))
		next_stack_id = maxi(next_stack_id,identifier+1)
		stacks.append(stack)
	for entry in data.get("balls",[]).slice(0,7):
		if entry is Dictionary: spawn_ball(restore_position(entry.get("p",[0,1,0]),data),clampi(int(entry.get("color",0)),0,2))
	phase = float(data.get("phase",0))
	pusher.position.z = -1.65 + 0.36*sin(phase*TAU/3.2)
	payout_left = clampi(int(data.get("payout",0)),0,3000)
	payout_multiplier = clampi(int(data.get("multiplier",1)),1,2)
	tower_left = clampi(int(data.get("tower_left",0)),0,1000)
	ball_count = int(data.get("ball_count",0))
	round_stage = clampi(int(data.get("round",0)),0,2)
	var colors = data.get("royal",[false,false,false])
	if colors is Array and colors.size() == 3: royal_colors = colors
	for value in data.get("pending",[]).slice(0,20): pending_colors.append(clampi(int(value),0,2))
	var a = data.get("angles",[0,0])
	if a is Array and a.size() == 2:
		for i in 2: set_angle(i,float(a[i]))
	if kind == 2:
		for g in data.get("party_guided",[]).slice(0,14):
			if g is Dictionary: add_guided(clampi(int(g.get("side",0)),0,1),clampf(float(g.get("t",0)),0,0.9))

func restore_position(value: Variant, data: Dictionary) -> Vector3:
	var pos := vector(value)
	# Preserve older plays while extending their lower bed to the new front lip.
	if int(data.get("layout",2)) < 3 and pos.z > -0.5: pos.z = -0.5+(pos.z+0.5)*3.2/2.2
	return pos

func vec(v: Vector3) -> Array:
	return [snappedf(v.x,0.0001),snappedf(v.y,0.0001),snappedf(v.z,0.0001)]

func vector(a: Variant) -> Vector3:
	if not a is Array or a.size() != 3: return Vector3(0,1,0)
	return Vector3(float(a[0]),float(a[1]),float(a[2]))

func set_simulation(enabled: bool) -> void:
	sound.set_machine_active(enabled)
	var was_playing := playing
	playing = enabled
	coin_batch.enabled = enabled
	coin_batch.sync_all()
	for b in coins:
		if b.get_meta("grouped",false): continue
		if not enabled and (was_playing or not b.has_meta("paused_sleep")): b.set_meta("paused_sleep",b.sleeping)
		b.freeze = not enabled
		if enabled and not was_playing and b.get_meta("paused_sleep",false): b.sleeping = true
	for b in balls:
		b.freeze = not enabled
	for stack in stacks:
		if is_instance_valid(stack): stack.freeze = not enabled
	if is_instance_valid(roulette_ball): roulette_ball.freeze = not enabled

func _exit_tree() -> void:
	if is_instance_valid(sound): sound.cancel_roulette()
