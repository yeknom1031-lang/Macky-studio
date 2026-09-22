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
var phase := 0.0
var elapsed := 0.0
var payout_left := 0
var payout_clock := 0.0
var ball_count := 0
var royal_colors := [false,false,false]
var round_stage := 0
var roulette_root: Node3D
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
var selected_side := 0
var audit := {"rail_exits":0,"wins":0,"losses":0,"balls":0,"rounds":0,"towers":0}
var loss_samples: Array = []
const BALL_COLORS := [Color("bf2948"),Color("198fbf"),Color("29a887")]
const COIN_LIMIT := 850
const ROULETTE_CENTER := Vector3(0,1.75,-3.0)

func setup(machine_kind: int, audio: Node, snapshot: Dictionary = {}) -> void:
	kind = machine_kind
	sound = audio
	rng.seed = 82231 + kind*972
	build_environment()
	build_cabinet()
	build_roulette()
	for i in 2:
		var root := Node3D.new()
		add_child(root)
		rails.append(root)
		rail_starts.append(Vector3(-1.82 if i == 0 else 1.82,1.48,2.08))
		rail_ends.append(Vector3.ZERO)
		set_angle(i,0.0)
	if snapshot.is_empty(): seed_field()
	else: restore(snapshot)
	select_rail(0)
	refresh_lights()

func build_environment() -> void:
	world_environment = WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color("070c13")
	var sky := Sky.new()
	var sm := ShaderMaterial.new()
	sm.shader = load("res://shaders/studio_sky.gdshader")
	sky.sky_material = sm
	sky.radiance_size = Sky.RADIANCE_SIZE_256
	e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	e.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	e.ambient_light_energy = 0.6
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	e.glow_enabled = true
	e.glow_intensity = 0.42
	e.glow_bloom = 0.08
	world_environment.environment = e
	add_child(world_environment)
	camera = Camera3D.new()
	add_child(camera)
	camera.position = Vector3(0,7.2,10.6)
	camera.look_at(Vector3(0,0.55,-0.3))
	camera.fov = 43
	camera.current = true
	camera.near = 0.05
	for i in 3:
		var l := SpotLight3D.new()
		add_child(l)
		l.position = [Vector3(-2,4,1),Vector3(2,4,-1),Vector3(0,4,-3)][i]
		l.look_at(Vector3(0,0,-0.3))
		l.light_color = [Color("ffdfb0"),Color("bddeff"),Color("fff3dc")][i]
		l.light_energy = [1.8,1.3,1.3][i]
		l.spot_range = 12
		l.spot_angle = 62
		l.shadow_enabled = i < 2
		l.shadow_bias = 0.04

func build_cabinet() -> void:
	Art.box(self,Vector3(0,-0.25,0),Vector3(4.8,0.4,5.4),Art.dark())
	Art.box(self,Vector3(0,-0.11,-0.22),Vector3(3.84,0.22,3.84),Art.steel(),true)
	# The upper shelf moves toward the player (+Z), carrying and pushing real rigid bodies.
	pusher = AnimatableBody3D.new()
	pusher.sync_to_physics = false
	pusher.position = Vector3(0,0.32,-1.65)
	add_child(pusher)
	Art.box(pusher,Vector3(0,-0.13,0),Vector3(3.84,0.50,1.65),Art.steel())
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(3.84,0.50,1.65)
	col.shape = shape
	col.position.y = -0.13
	pusher.add_child(col)
	Art.box(pusher,Vector3(0,0.105,0.825),Vector3(3.84,0.024,0.018),Art.gold())
	for s in [-1,1]:
		Art.box(self,Vector3(s*2.22,0.35,-0.2),Vector3(0.22,1.2,4.6),Art.burgundy(),true)
		Art.box(self,Vector3(s*2.06,-0.23,-0.15),Vector3(0.20,0.1,4.0),Art.dark())
		Art.box(self,Vector3(s*2.21,0.96,-0.2),Vector3(0.07,0.035,4.6),Art.gold())
		Art.box(self,Vector3(s*1.95,0.02,-0.2),Vector3(0.025,0.04,3.84),Art.gold())
		var glass := Art.mat("glass",Color(0.35,0.55,0.62,0.13),0.15,0.1)
		glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		Art.box(self,Vector3(s*2.2,1.42,-0.7),Vector3(0.025,0.9,3.45),glass)
		for z in [-2.6,0.0,2.15]:
			Art.cylinder(self,Vector3(s*2.24,0.9,z),0.045,1.8,Art.gold())
		var strip := Art.mat("amber",Color("f4b65c"),0.1,0.4,2.0)
		Art.box(self,Vector3(s*2.13,0.72,-0.4),Vector3(0.026,0.025,4.2),strip)
	Art.box(self,Vector3(0,1.45,-3.72),Vector3(4.8,3.5,0.28),Art.dark())
	Art.box(self,Vector3(0,2.8,-3.50),Vector3(4.35,0.50,0.08),Art.burgundy())
	Art.label(self,"ROYAL PUSHER" if kind == 0 else "IMPERIAL TOWER",Vector3(0,2.8,-3.43),75,Color("e7cc93"))
	for y in [2.51,3.09]: Art.box(self,Vector3(0,y,-3.47),Vector3(4.4,0.024,0.035),Art.gold())
	# Fixed rear sweeper overlaps the moving shelf throughout its entire stroke.
	# There is no inaccessible gap behind the shelf for inserted medals to fall into.
	Art.box(self,Vector3(0,0.6,-2.10),Vector3(4.2,1.1,0.1),Art.burgundy(),true)
	Art.box(self,Vector3(0,0.78,-2.035),Vector3(3.85,0.42,0.025),Art.dark())
	Art.label(self,"COLLECT THREE COLORS" if kind == 0 else "THREE STAGE CHALLENGE",Vector3(0,1.03,-2.0),22,Color("cbb482"))
	for i in 3:
		var orb := Art.ball_visual(self,0.085,BALL_COLORS[i] if kind == 0 else Color("cdab65"))
		orb.position = Vector3(-0.40+i*0.40,0.78,-1.98)
		progress_lights.append(orb)
	Art.label(self,"180 MEDALS" if kind == 0 else "260 MEDALS + TOWER",Vector3(0,0.59,-1.995),22,Color("cbb482"))
	Art.box(self,Vector3(0,-0.32,2.22),Vector3(4.38,0.12,0.75),Art.dark())
	Art.box(self,Vector3(0,-0.24,2.62),Vector3(4.4,0.05,0.05),Art.gold())
	Art.label(self,"M E D A L   C O L L E C T",Vector3(0,-0.13,2.57),29,Color("cebd94"))
	# Decorative ball-return rail and elevator, separate from the medal trough.
	for x in [1.32,1.65]: Art.bar(self,Vector3(x,-0.08,1.93),Vector3(x,-0.20,2.45),0.023,0.023,Art.gold())
	for z in [2.3,-3.0]:
		for x in [2.34,2.47]: Art.bar(self,Vector3(x,-0.15,z),Vector3(x,2.4,z),0.018,0.018,Art.gold())
	Art.bar(self,Vector3(2.39,-0.1,2.3),Vector3(2.39,-0.1,-3),0.018,0.018,Art.gold())
	Art.bar(self,Vector3(2.39,2.3,-3),Vector3(0.82,2.1,-3),0.023,0.023,Art.gold())
	Art.label(self,"BALL RETURN",Vector3(1.6,0.05,2.5),23,Color("81c8bb"))
	# A visible overhead payout hopper.
	hopper = Node3D.new()
	add_child(hopper)
	hopper.position = Vector3(-1.35,1.25,-2.30)
	Art.box(hopper,Vector3.ZERO,Vector3(0.65,0.18,0.54),Art.gold())
	Art.box(hopper,Vector3(0,0.19,-0.23),Vector3(0.65,0.4,0.05),Art.steel())
	Art.label(hopper,"PAYOUT",Vector3(0,0.13,0.08),27,Color("f0dcb0"))
	Art.bar(self,Vector3(-1.85,1.48,-2.58),Vector3(1.85,1.48,-2.58),0.024,0.024,Art.steel())
	if kind == 1:
		tower_layer = Node3D.new()
		add_child(tower_layer)
		tower_layer.position = Vector3(0,0.5,-1.70)
		Art.box(self,Vector3(0,0.48,-1.70),Vector3(1.04,0.09,0.96),Art.gold())
		Art.label(self,"TOWER BUILDER",Vector3(0,1.52,-2.40),30,Color("e8cb91"))

func build_roulette() -> void:
	roulette_root = Node3D.new()
	add_child(roulette_root)
	roulette_root.position = ROULETTE_CENTER
	roulette_root.scale = Vector3(1.32,1,1.32)
	Art.cylinder(roulette_root,Vector3(0,-0.07,0),0.96,0.12,Art.gold())
	Art.ring(roulette_root,Vector3(0,-0.01,0),0.94,0.025,Art.steel())
	Art.ring(roulette_root,Vector3(0,0.26,0),0.92,0.018,Art.gold())
	Art.ring(roulette_root,Vector3(0,-0.09,0),0.96,0.014,Art.mat("roulette_glow",Color("e2ba6e"),0.3,0.3,1.3))
	# A real ball rolls on this surface. Five perimeter dividers determine its sector.
	var floor_body := StaticBody3D.new()
	roulette_root.add_child(floor_body)
	var c := CollisionShape3D.new()
	var disc := CylinderShape3D.new()
	disc.radius = 0.9
	disc.height = 0.08
	c.shape = disc
	c.position.y = -0.03
	floor_body.add_child(c)
	Art.cylinder(roulette_root,Vector3(0,-0.015,0),0.90,0.03,Art.burgundy())
	for i in 32:
		var a := TAU*i/32.0
		var wall := Art.box(roulette_root,Vector3(sin(a)*0.92,0.12,cos(a)*0.92),Vector3(0.20,0.26,0.045),Art.gold(),true)
		wall.rotation.y = a
	for i in 5:
		var a := TAU*i/5.0
		var color: Color = [Color("d4ae6f"),Color("4c879e"),Color("b73150"),Color("329d80"),Color("e1c180")][i]
		Art.cylinder(roulette_root,Vector3(sin(a+0.4)*0.60,0.014,cos(a+0.4)*0.60),0.14,0.014,Art.mat("pocket%d"%i,color,0.6,0.3))
		var divider := Art.box(roulette_root,Vector3(sin(a)*0.70,0.06,cos(a)*0.70),Vector3(0.02,0.12,0.38),Art.gold(),true)
		divider.rotation.y = a
		var txt := Art.label(roulette_root,["20","40","80","BALL","JP"][i],Vector3(sin(a+0.55)*0.63,0.03,cos(a+0.55)*0.63),34,Color.WHITE)
		txt.rotation.x = -PI/2
	Art.cylinder(roulette_root,Vector3(0,0.02,0),0.22,0.14,Art.gold())
	Art.ring(roulette_root,Vector3(0,0.10,0),0.19,0.018,Art.steel())
	Art.ball_visual(roulette_root,0.065,Color("ddd7c4")).position = Vector3(0,0.15,0)

func seed_field() -> void:
	for row in 12:
		for column in 12:
			var p := Vector3(-1.68+column*0.303+(row%2)*0.08,0.031,-1.85+row*0.304)
			if p.z < -0.48: continue
			if kind == 1 and under_tower(p): continue
			spawn_coin(p,false)
	for row in 4:
		for column in 12:
			spawn_coin(Vector3(-1.66+column*0.3,0.48,-1.895+row*0.295+(column%2)*0.05),false)
	for row in 5:
		for column in 9:
			var p := Vector3(-1.38+column*0.31,0.081,0.05+row*0.32)
			if kind == 1 and under_tower(p): continue
			spawn_coin(p,false)
	if kind == 1:
		make_tower(Vector3(0,0.001,0.55),28,true)
		make_tower(Vector3(-1.22,0.001,0.83),18,false)
		make_tower(Vector3(1.22,0.001,0.83),18,false)
	for i in 3:
		var p := Vector3(-1.18+i*1.18,0.4,1.20)
		if kind == 1: p = [Vector3(-1.55,0.4,0.10),Vector3(0,0.4,1.25),Vector3(1.55,0.4,0.1)][i]
		spawn_ball(p,i)

func under_tower(p: Vector3) -> bool:
	if Vector2(p.x,p.z-0.55).length() < 0.62: return true
	return Vector2(absf(p.x)-1.22,p.z-0.83).length() < 0.32

func spawn_coin(pos: Vector3, sound_contact: bool = true) -> RigidBody3D:
	if coins.size() >= COIN_LIMIT: return null
	var b: RigidBody3D
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
		b.continuous_cd = true
		var pm := PhysicsMaterial.new()
		pm.friction = 0.43
		pm.bounce = 0.06
		b.physics_material_override = pm
		var c := CollisionShape3D.new()
		c.shape = Art.coin_collision()
		b.add_child(c)
		Art.coin_visual(b)
		b.contact_monitor = true
		b.max_contacts_reported = 2
		b.body_entered.connect(func(_other):
			if playing and b.get_meta("audible",false): sound.contact(b.linear_velocity.length()))
		add_child(b)
	b.set_meta("audible",sound_contact)
	b.position = pos
	b.rotation = Vector3(0,rng.randf_range(0,TAU),0)
	b.linear_velocity = Vector3.ZERO
	b.angular_velocity = Vector3.ZERO
	b.sleeping = false
	coins.append(b)
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
	for y in layers:
		var count := 7 if wide else 1
		for i in count:
			var offset := Vector3.ZERO
			if i > 0:
				var a := TAU*(i-1)/6.0 + (y%2)*0.10
				offset = Vector3(sin(a)*0.30,0,cos(a)*0.30)
			spawn_coin(base+offset+Vector3(0,0.019+y*0.037,0),false)

func set_angle(side: int, value: float) -> void:
	angles[side] = clampf(value,-1,1)
	var start := rail_starts[side]
	var target_x: float = (-0.78 if side == 0 else 0.78)+angles[side]*0.85
	var end := Vector3(clampf(target_x,-1.7,1.7),0.62,-1.73)
	rail_ends[side] = end
	for g in guided:
		if g.side == side:
			g.start = start+Vector3(0,0.147,0)
			g.end = end+Vector3(0,0.147,0)
	for child in rails[side].get_children():
		child.free()
	var side_vec := (end-start).cross(Vector3.UP).normalized()
	Art.bar(rails[side],start,end,0.022,0.022,Art.steel())
	# The narrow groove touches the rim, leaving both coin faces visible.
	for sign_value in [-1,1]:
		Art.bar(rails[side],start+side_vec*0.026+Vector3(0,0.036,0) if sign_value == 1 else start-side_vec*0.026+Vector3(0,0.036,0),end+side_vec*0.026+Vector3(0,0.036,0) if sign_value == 1 else end-side_vec*0.026+Vector3(0,0.036,0),0.012,0.04,Art.gold())
	Art.cylinder(rails[side],start-Vector3(0,0.07,0),0.16,0.1,Art.gold())
	var lever_end := start+Vector3(angles[side]*0.19,-0.12,0.3)
	Art.bar(rails[side],start-Vector3(0,0.08,0),lever_end,0.038,0.038,Art.gold())
	Art.ball_visual(rails[side],0.074,Color("63253b")).position = lever_end
	# A vertical slot at the player's end, not a pipe or a gun.
	Art.box(rails[side],start+Vector3(0,0.12,0.065),Vector3(0.19,0.30,0.06),Art.dark())
	Art.box(rails[side],start+Vector3(0,0.12,0.098),Vector3(0.037,0.245,0.006),Art.mat("slot",Color("020305")))

func select_rail(side: int) -> void:
	selected_side = side

func insert(side: int) -> bool:
	if not playing or guided.size() >= 14: return false
	if coins.size()+guided.size()+tower_visuals.size() >= COIN_LIMIT:
		message.emit("盤面がいっぱいです。押し出しを少し待ちましょう")
		return false
	var visual := Art.coin_visual(self)
	var start := rail_starts[side]+Vector3(0,0.147,0)
	var end := rail_ends[side]+Vector3(0,0.147,0)
	guided.append({"node":visual,"t":0.0,"start":start,"end":end,"side":side})
	sound.play("insert",0.8)
	sound.play("launch",0.7)
	return true

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
		g.node.basis = Basis(Vector3.UP,atan2(-d.x,-d.z))*Basis(Vector3.FORWARD,PI/2)*Basis(Vector3.UP,t*4/0.145)
		if t >= 1:
			var b := spawn_coin(g.end)
			if b:
				b.basis = g.node.basis
				b.linear_velocity = d*2.0
				b.angular_velocity = Vector3.UP.cross(d)*2.0/0.145
			g.node.queue_free()
			guided.erase(g)
			audit.rail_exits += 1
	for b in coins.duplicate():
		if b.position.y < -0.20:
			if b.position.z > 1.67 and absf(b.position.x) < 1.94:
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
			if b.position.z > 1.62 and absf(b.position.x) < 2.1: capture_ball(int(b.get_meta("color")))
			balls.erase(b)
			b.queue_free()
	if elapsed > 20 and balls.is_empty() and transit_t < 0 and roulette_clock < 0:
		spawn_ball(Vector3(rng.randf_range(-1.3,1.3),0.9,-1.8),rng.randi_range(0,2))
	if payout_left > 0:
		hopper.position.x = sin(elapsed*1.9)*1.30
		payout_clock -= delta
		# Reserve room for the player's rails while a large prize is dispensed.
		if payout_clock <= 0 and coins.size()+guided.size()+tower_visuals.size() < COIN_LIMIT-80:
			payout_clock = 0.065
			var b := spawn_coin(Vector3(hopper.position.x+rng.randf_range(-0.12,0.12),1.30,-1.86))
			if b:
				b.angular_velocity = Vector3(rng.randf_range(-2,2),0,rng.randf_range(-2,2))
				payout_left -= 1
	process_transit(delta)
	process_roulette(delta)
	process_builder(delta)

func capture_ball(color_id: int) -> void:
	audit.balls += 1
	ball_count += 1
	pending_colors.append(color_id)
	sound.play("ball")
	message.emit("ボール獲得！ 抽選レーンへ")
	bonus_changed.emit()
	if kind == 0:
		royal_colors[color_id] = true
		payout_left += 10
	refresh_lights()

func process_transit(delta: float) -> void:
	if transit_t < 0 and roulette_clock < 0 and not pending_colors.is_empty():
		roulette_color = pending_colors.pop_front()
		transit = Art.ball_visual(self,0.15,BALL_COLORS[roulette_color])
		transit_t = 0
	if transit_t < 0: return
	transit_t += delta*0.8
	var points := [Vector3(1.45,0,1.9),Vector3(2.39,0,2.3),Vector3(2.39,0,-3.0),Vector3(2.39,2.15,-3.0),ROULETTE_CENTER+Vector3(0.65,0.25,0)]
	var seg := mini(int(transit_t),3)
	transit.position = points[seg].lerp(points[seg+1],minf(1,transit_t-seg))
	if transit_t >= 4:
		transit.queue_free()
		transit = null
		transit_t = -1
		start_roulette()

func start_roulette() -> void:
	roulette_clock = 0
	audit.rounds += 1
	roulette_ball = RigidBody3D.new()
	roulette_ball.mass = 0.15
	roulette_ball.linear_damp = 0.28
	roulette_ball.angular_damp = 0.3
	var col := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = 0.105
	col.shape = shape
	roulette_ball.add_child(col)
	Art.ball_visual(roulette_ball,0.105,Color("f1e7da"))
	add_child(roulette_ball)
	var a := rng.randf_range(0,TAU)
	roulette_ball.position = ROULETTE_CENTER+Vector3(sin(a)*0.45,0.22,cos(a)*0.45)
	roulette_ball.linear_velocity = Vector3(cos(a)*2.3,0,-sin(a)*2.3)
	message.emit("PHYSICAL ROULETTE  •  ボールの行方に注目")
	bonus_changed.emit()

func process_roulette(delta: float) -> void:
	if roulette_clock < 0 or not is_instance_valid(roulette_ball): return
	roulette_clock += delta
	var offset := roulette_ball.position-ROULETTE_CENTER
	# A gentle radial force models the shallow dished surface; tangential motion remains physical.
	var radial := Vector3(offset.x,0,offset.z).normalized()
	if roulette_clock < 3.8:
		roulette_ball.apply_central_force(radial*0.012)
	else: roulette_ball.linear_damp = 1.7
	if roulette_ball.position.y < ROULETTE_CENTER.y-0.3:
		roulette_ball.position = ROULETTE_CENTER+Vector3(0.45,0.2,0)
		roulette_ball.linear_velocity = Vector3(0,0,1.0)
	if roulette_clock > 7 or (roulette_clock > 4 and roulette_ball.linear_velocity.length() < 0.09):
		var angle := fposmod(atan2(offset.x,offset.z),TAU)
		var sector := clampi(int(angle/(TAU/5)),0,4)
		roulette_ball.queue_free()
		roulette_ball = null
		roulette_clock = -1
		resolve_roulette(sector)

func resolve_roulette(sector: int) -> void:
	var all_colors: bool = royal_colors[0] and royal_colors[1] and royal_colors[2]
	if sector == 4 or (kind == 0 and all_colors):
		if kind == 1 and round_stage < 2:
			round_stage += 1
			pending_colors.append(roulette_color)
			message.emit("ROUND %d / 3  •  次の抽選へ" % (round_stage+1))
		else:
			payout_left += 180 if kind == 0 else 260
			if kind == 1: tower_left += 98
			round_stage = 0
			royal_colors = [false,false,false]
			jackpot.emit()
			message.emit("JACKPOT  •  大量払い出し！")
			sound.play("win")
	elif sector == 3:
		if kind == 1: round_stage = 0
		spawn_ball(Vector3(rng.randf_range(-1.2,1.2),0.9,-1.7),rng.randi_range(0,2))
		payout_left += 15
		message.emit("BALL BONUS  •  ボール追加 ＋ 15枚払い出し")
	else:
		var reward: int = [20,40,80][sector]
		payout_left += reward
		if kind == 1:
			tower_left += 21+sector*14
			round_stage = 0
		message.emit("%d MEDALS  •  フィールドへ払い出し" % reward)
		sound.play("win",0.65)
	bonus_changed.emit()
	refresh_lights()

func refresh_lights() -> void:
	for i in progress_lights.size():
		var lit: bool = royal_colors[i] if kind == 0 else i < round_stage
		var color: Color = BALL_COLORS[i] if kind == 0 else Color("eac271")
		progress_lights[i].material_override = Art.mat("progress%d_%d_%s" % [kind,i,str(lit)],color,0.45,0.2,1.8 if lit else 0.0)

func process_builder(delta: float) -> void:
	if kind != 1: return
	if tower_transfer >= 0:
		tower_transfer += delta*0.6
		tower_layer.position.z = lerpf(-1.70,0.05,minf(1,tower_transfer))
		tower_layer.position.y = lerpf(0.5,0.13,clampf((tower_transfer-0.65)/0.35,0,1))
		if tower_transfer >= 1:
			for m in tower_visuals:
				spawn_coin(m.global_position,false)
				m.queue_free()
			tower_visuals.clear()
			tower_index = 0
			tower_layer.position = Vector3(0,0.5,-1.70)
			tower_transfer = -1
			audit.towers += 1
			sound.play("tower",0.8)
			message.emit("NEW TOWER  •  メダルタワー搬入！")
		return
	if tower_left <= 0 or coins.size()+guided.size()+tower_visuals.size() >= COIN_LIMIT-20: return
	tower_clock -= delta
	if tower_clock <= 0:
		tower_clock = 0.09
		var layer := tower_index/7
		var slot := tower_index%7
		var pos := Vector3(0,0.019+layer*0.037,0)
		if slot > 0: pos += Vector3(sin(TAU*(slot-1)/6)*0.30,0,cos(TAU*(slot-1)/6)*0.30)
		var m := Art.coin_visual(tower_layer)
		m.position = pos
		tower_visuals.append(m)
		tower_index += 1
		tower_left -= 1
		if tower_left == 0 or tower_index >= 140: tower_transfer = 0

func serialize() -> Dictionary:
	var entries: Array = []
	for b in coins:
		entries.append({"p":vec(b.position),"r":vec(b.rotation),"v":vec(b.linear_velocity),"w":vec(b.angular_velocity)})
	for g in guided:
		entries.append({"p":vec(g.end),"r":[0,0,PI/2],"v":[0,0,-2],"w":[0,0,0]})
	var bs: Array = []
	for b in balls: bs.append({"p":vec(b.position),"color":b.get_meta("color")})
	var pending := pending_colors.duplicate()
	if transit_t >= 0 or roulette_clock >= 0: pending.push_front(roulette_color)
	return {"coins":entries,"balls":bs,"phase":phase,"angles":angles,"payout":payout_left,
		"pending":pending,"royal":royal_colors,"ball_count":ball_count,"round":round_stage,
		"tower_left":tower_left+tower_visuals.size()}

func restore(data: Dictionary) -> void:
	for entry in data.get("coins",[]).slice(0,COIN_LIMIT):
		if not entry is Dictionary: continue
		var b := spawn_coin(vector(entry.get("p",[0,1,0])),false)
		if b:
			b.rotation = vector(entry.get("r",[0,0,0]))
			b.linear_velocity = vector(entry.get("v",[0,0,0]))
			b.angular_velocity = vector(entry.get("w",[0,0,0]))
	for entry in data.get("balls",[]).slice(0,7):
		if entry is Dictionary: spawn_ball(vector(entry.get("p",[0,1,0])),clampi(int(entry.get("color",0)),0,2))
	phase = float(data.get("phase",0))
	pusher.position.z = -1.65 + 0.36*sin(phase*TAU/3.2)
	payout_left = clampi(int(data.get("payout",0)),0,3000)
	tower_left = clampi(int(data.get("tower_left",0)),0,1000)
	ball_count = int(data.get("ball_count",0))
	round_stage = clampi(int(data.get("round",0)),0,2)
	var colors = data.get("royal",[false,false,false])
	if colors is Array and colors.size() == 3: royal_colors = colors
	for value in data.get("pending",[]).slice(0,20): pending_colors.append(clampi(int(value),0,2))
	var a = data.get("angles",[0,0])
	if a is Array and a.size() == 2:
		for i in 2: set_angle(i,float(a[i]))

func vec(v: Vector3) -> Array:
	return [snappedf(v.x,0.0001),snappedf(v.y,0.0001),snappedf(v.z,0.0001)]

func vector(a: Variant) -> Vector3:
	if not a is Array or a.size() != 3: return Vector3(0,1,0)
	return Vector3(float(a[0]),float(a[1]),float(a[2]))

func set_simulation(enabled: bool) -> void:
	playing = enabled
	for b in coins: b.freeze = not enabled
	for b in balls: b.freeze = not enabled
	if is_instance_valid(roulette_ball): roulette_ball.freeze = not enabled
