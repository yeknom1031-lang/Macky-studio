extends RefCounted
const A = preload("res://scripts/art.gd")
const INLAY := "res://assets/generated/cabinet-inlay-v3.png"

static func build(m) -> void:
	var party: bool = m.kind == 2
	var inlay := "res://assets/generated/party/inlay.png" if party else INLAY
	var brass := A.gold()
	var chrome := A.chrome()
	var steel := A.steel()
	var enamel := A.mat("enamel",Color("160e16"),0.32,0.23)
	var black := A.mat("cabinet_black",Color("090e14"),0.35,0.30)
	var rubber := A.mat("rubber",Color("080a0d"),0.05,0.70)
	var wine := A.mat("party_wine" if party else "wine",Color("290748") if party else Color("371321"),0.28,0.23)
	var led := A.mat("warm_lamp",Color("ffe1a0"),0.15,0.32,1.7)
	var glass := A.mat("clear_acrylic",Color(0.72,0.81,0.88,0.045),0.08,0.10)
	glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	# Full-depth play bed. The visible front drop and tray remain unobstructed.
	A.box(m,Vector3(0,-0.23,0.30),Vector3(4.50,0.45,6.1),black)
	var bed := A.box(m,Vector3(0,-0.11,0.28),Vector3(3.84,0.22,4.84),steel,true)
	var polished := PhysicsMaterial.new()
	polished.friction = 0.18
	polished.bounce = 0.0
	bed.physics_material_override = polished
	m.pusher = AnimatableBody3D.new()
	m.pusher.sync_to_physics = false
	m.pusher.physics_material_override = polished
	m.pusher.position = Vector3(0,0.32,-1.65)
	m.add_child(m.pusher)
	A.box(m.pusher,Vector3(0,-0.13,0),Vector3(3.84,0.50,1.65),steel)
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(3.84,0.50,1.65)
	col.shape = shape
	col.position.y = -0.13
	m.pusher.add_child(col)
	A.box(m.pusher,Vector3(0,0.115,0.812),Vector3(3.84,0.012,0.045),chrome)
	for x in [-1.7,-0.9,0,0.9,1.7]: screw(m.pusher,Vector3(x,0.129,0.70))
	for side in [-1,1]:
		A.box(m,Vector3(side*2.15,0.25,0.22),Vector3(0.22,0.95,5.8),wine,true)
		A.tube(m,Vector3(side*2.16,0.66,-2.65),Vector3(side*2.16,0.66,3.18),0.058,brass)
		A.box(m,Vector3(side*1.99,-0.12,0.3),Vector3(0.11,0.14,4.82),black)
		A.box(m,Vector3(side*1.925,0.004,0.3),Vector3(0.014,0.018,4.8),chrome)
		A.box(m,Vector3(side*2.18,1.25,-0.4),Vector3(0.012,1.20,4.8),glass)
		for z in [-2.75,0.6,2.60]:
			A.tube(m,Vector3(side*2.2,0.65,z),Vector3(side*2.2,1.88,z),0.028,brass)
			A.cylinder(m,Vector3(side*2.20,0.66,z),0.064,0.10,chrome)
		# Raised side panels and engraved inserts give the glass enclosure depth.
		A.box(m,Vector3(side*2.2,2.4,-3.16),Vector3(0.18,3.05,0.42),wine)
		for y in [1.05,1.38,1.71,2.04,2.37,2.7,3.03,3.36,3.69]:
			lamp(m,Vector3(side*2.12,y,-2.91),0.041,led)
	# Back enclosure and broad engraved crown, without a black empty hole.
	A.box(m,Vector3(0,1.92,-3.54),Vector3(4.50,4.35,0.32),enamel)
	A.panel(m,Vector3(0,2.08,-3.36),Vector2(4.13,3.6),inlay,Color.WHITE if party else Color("88775f"))
	for x in [-2.13,2.13]:
		A.tube(m,Vector3(x,0.65,-3.2),Vector3(x,4.12,-3.2),0.061,brass)
	for x in [-1.75,-1.45,-1.15,1.15,1.45,1.75]:
		A.tube(m,Vector3(x,1.45,-3.22),Vector3(x,3.64,-3.22),0.015,chrome)
	A.box(m,Vector3(0,3.92,-3.18),Vector3(4.36,1.05 if party else 0.65,0.26),brass)
	A.box(m,Vector3(0,3.92,-3.03),Vector3(4.18,0.99 if party else 0.52,0.04),wine)
	var plaque := A.panel(m,Vector3(0,3.92,-2.999),Vector2(4.06,0.94 if party else 0.43),"res://assets/generated/party/marquee.png" if party else inlay,Color.WHITE if party else Color("a68962"))
	plaque.material_override.roughness = 0.45
	if party:
		plaque.material_override.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Baskerville","Georgia","Times New Roman"])
	font.font_weight = 600
	var title := A.label(m,"" if party else ("ROYAL PUSHER" if m.kind == 0 else "IMPERIAL TOWER"),Vector3(0,3.915,-2.96),90,Color("e6c987"))
	title.font = font
	title.pixel_size = 0.0030
	for side in [-1,1]:
		screw(m,Vector3(side*2.02,4.13,-2.98),true)
		screw(m,Vector3(side*2.02,3.71,-2.98),true)
	A.box(m,Vector3(0,3.58,-3.0),Vector3(4.08,0.065,0.34),brass)
	for x in [-1.60,-0.8,0,0.8,1.60]:
		A.cylinder(m,Vector3(x,3.54,-2.96),0.074,0.04,brass)
		A.cylinder(m,Vector3(x,3.515,-2.96),0.051,0.014,led)
	# Fixed sweeper and physical progress display beneath the roulette.
	A.box(m,Vector3(0,0.6,-2.10),Vector3(4.2,1.1,0.1),steel,true)
	A.box(m,Vector3(0,0.83,-2.03),Vector3(3.94,0.46,0.035),brass)
	A.panel(m,Vector3(0,0.83,-2.0),Vector2(3.85,0.38),inlay)
	m.status_label = A.label(m,"",Vector3(0,0.53,3.50),24,Color("ffe5a6"))
	m.status_label.rotation.x = -PI/2
	for i in (5 if party else 3):
		var x := -0.60+i*0.30 if party else -0.43+i*0.43
		A.ring(m,Vector3(x,0.52,3.70),0.086,0.013,brass)
		var orb := A.ball_visual(m,0.073,m.BALL_COLORS[i] if m.kind == 0 else Color("c6aa70"))
		orb.position = Vector3(x,0.55,3.70)
		orb.set_meta("dynamic",true)
		m.progress_lights.append(orb)
	# The front ledge, real medal catch tray and separate right-hand ball gate.
	A.box(m,Vector3(0,-0.27,2.99),Vector3(3.83,0.07,0.55),steel)
	A.box(m,Vector3(0,-0.34,3.27),Vector3(3.9,0.38,0.06),enamel)
	A.tube(m,Vector3(-1.92,-0.13,3.23),Vector3(1.92,-0.13,3.23),0.035,brass)
	for z in [2.78,2.90,3.02,3.14]: A.box(m,Vector3(0,-0.22,z),Vector3(3.75,0.02,0.011),chrome)
	var gate := A.label(m,"MEDAL OUT",Vector3(0,-0.15,3.265),27,Color("e0c383"))
	A.box(m,Vector3(1.72,0.13,2.98),Vector3(0.40,0.035,0.35),black)
	var gate_label := A.label(m,"BALL GATE",Vector3(1.64,0.23,3.1),18,Color("ffe4a0"))
	# Low control deck: it must never mask the medal drop edge.
	A.box(m,Vector3(0,0.21,3.89),Vector3(4.45,0.34,1.20),wine)
	A.box(m,Vector3(0,0.405,3.88),Vector3(4.38,0.075,1.12),brass)
	A.box(m,Vector3(0,0.45,3.87),Vector3(4.23,0.016,0.99),black)
	var deck := A.panel(m,Vector3(0,0.461,3.87),Vector2(4.20,0.96),inlay)
	deck.rotation.x = -PI/2
	A.tube(m,Vector3(-2.15,0.44,4.44),Vector3(2.15,0.44,4.44),0.055,brass)
	for side in 2:
		var x := -1.23 if side == 0 else 1.23
		A.cylinder(m,Vector3(x,0.49,3.99),0.31,0.055,rubber)
		A.cylinder(m,Vector3(x,0.535,3.99),0.277,0.052,brass)
		A.ring(m,Vector3(x,0.57,3.99),0.235,0.012,led)
		var cap := Node3D.new()
		m.add_child(cap)
		cap.position = Vector3(x,0.59,3.99)
		cap.set_meta("dynamic",true)
		A.cylinder(cap,Vector3.ZERO,0.217,0.09,A.mat("button_cap",Color("821927"),0.22,0.20))
		A.ring(cap,Vector3(0,0.044,0),0.201,0.009,brass)
		var text := A.label(cap,"MEDAL",Vector3(0,0.052,0),25,Color("ffebbd"))
		text.font = font
		text.rotation.x = -PI/2
		m.press_caps.append(cap)
		var caption := A.label(m,"LEFT" if side == 0 else "RIGHT",Vector3(x,0.467,3.63),24,Color("dbc493"))
		caption.rotation.x = -PI/2
		for dx in [-0.41,0.41]: screw(m,Vector3(x+dx,0.47,3.63))
	A.box(m,Vector3(0,0.48,4.05),Vector3(1.1,0.04,0.40),brass)
	A.box(m,Vector3(0,0.51,4.05),Vector3(1.04,0.021,0.34),black)
	m.counter_label = A.label(m,"FREE PLAY\nOUT 00000",Vector3(0,0.528,4.05),23,Color("e7d8ad"))
	m.counter_label.rotation.x = -PI/2
	# The payout hopper is a real outlet with a chute, moved along its gantry.
	m.hopper = Node3D.new()
	m.add_child(m.hopper)
	m.hopper.position = Vector3(-1.35,1.25,-2.30)
	A.box(m.hopper,Vector3.ZERO,Vector3(0.43,0.12,0.40),steel)
	A.box(m.hopper,Vector3(0,0.18,-0.17),Vector3(0.43,0.32,0.04),brass)
	A.box(m.hopper,Vector3(0,0.18,0.09),Vector3(0.32,0.1,0.03),black)
	A.label(m.hopper,"PAYOUT",Vector3(0,0.19,0.109),19,Color("e4c17d"))
	for x in [-0.18,0.18]: A.bar(m.hopper,Vector3(x,0.01,0.08),Vector3(x,-0.23,0.48),0.023,0.06,chrome)
	A.bar(m.hopper,Vector3(0,-0.02,0.08),Vector3(0,-0.25,0.48),0.35,0.013,steel)
	A.tube(m,Vector3(-1.9,1.48,-2.49),Vector3(1.9,1.48,-2.49),0.029,brass)
	# Transparent return track and lift share the actual animation path.
	for stage in (3 if m.kind == 1 else 1):
		var radius: float = [1.22,0.73,0.31][stage] if m.kind == 1 else 0.89
		var angle := 0.08+stage*0.33
		m.draw_outlets.append(m.ROULETTE_CENTER+Vector3(cos(angle)*radius,0.105 if m.kind == 1 else 0.125,-sin(angle)*radius))
	var outlet: Vector3 = m.draw_outlets[0]
	m.transport_points = [Vector3(1.7,0.05,2.95),Vector3(2.28,0.12,2.95),Vector3(2.28,0.12,-2.64),Vector3(2.28,3.12,-2.64),outlet]
	var tube_glass := A.mat("tube_glass",Color(0.83,0.89,0.95,0.055),0.1,0.16)
	tube_glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	for i in m.transport_points.size()-1:
		A.tube(m,m.transport_points[i],m.transport_points[i+1],0.19,tube_glass)
		for t in [0.0,0.5,1.0]:
			var band := A.ring(m,m.transport_points[i].lerp(m.transport_points[i+1],t),0.19,0.014,brass)
			band.quaternion = Quaternion(Vector3.UP,(m.transport_points[i+1]-m.transport_points[i]).normalized())
	A.box(m,Vector3(2.28,1.47,-2.87),Vector3(0.46,3.0,0.18),enamel)
	for y in [0.2,0.55,0.90,1.25,1.60,1.95,2.3,2.65,3.0]:
		A.box(m,Vector3(2.28,y,-2.72),Vector3(0.28,0.022,0.045),chrome)
	if m.kind == 0:
		A.box(m,Vector3(1.92,3.04,-2.93),Vector3(0.69,0.12,0.32),black)
		for i in 3:
			var cup := Vector3(1.72+i*0.20,3.17,-2.93)
			A.ring(m,cup-Vector3(0,0.08,0),0.087,0.012,brass)
			A.tube(m,Vector3(2.28,3.12,-2.64),cup,0.115,tube_glass)
			var stored := A.ball_visual(m,0.079,m.BALL_COLORS[i])
			stored.position = cup
			stored.set_meta("dynamic",true)
			m.collection_balls.append(stored)
	elif m.kind == 1:
		A.tube(m,Vector3(0,2.36,-1.80),Vector3(2.28,2.36,-2.64),0.115,tube_glass)
		for stage in [1,2]:
			A.tube(m,Vector3(2.28,3.12,-2.64),m.draw_outlets[stage],0.115,tube_glass)
			var nozzle := A.ring(m,m.draw_outlets[stage]+Vector3(0,0.05,0),0.102,0.013,brass)
			nozzle.rotation.z = PI/2
	if m.kind == 1:
		m.tower_layer = Node3D.new()
		m.add_child(m.tower_layer)
		m.tower_layer.position = Vector3(0,0.55,-0.85)
		A.cylinder(m.tower_layer,Vector3(0,-0.027,0),0.49,0.045,black)
		A.ring(m.tower_layer,Vector3(0,-0.018,0),0.48,0.019,chrome)
		for x in [-0.50,0.50]:
			A.tube(m,Vector3(x,0.51,-0.99),Vector3(x,1.40,-0.99),0.024,chrome)
			A.box(m,Vector3(x,0.95,-1.00),Vector3(0.035,0.78,0.10),black)
		A.box(m,Vector3(0,0.93,-1.02),Vector3(1.10,0.85,0.015),glass)
		A.box(m,Vector3(0,1.41,-0.91),Vector3(1.12,0.12,0.22),wine)
		A.cylinder(m,Vector3(0,1.335,-0.85),0.15,0.10,steel)
		A.label(m,"TOWER BUILDER",Vector3(0,1.425,-0.785),28,Color("ead6a4"))
		for x in [-0.50,0.50]:
			A.tube(m,Vector3(x,1.57,-0.88),Vector3(x,1.57,1.85),0.012,chrome)

static func lamp(parent: Node3D, pos: Vector3, radius: float, material: Material) -> void:
	var root := Node3D.new()
	parent.add_child(root)
	root.position = pos
	root.rotation.x = PI/2
	A.cylinder(root,Vector3.ZERO,radius*1.6,0.027,A.gold())
	A.cylinder(root,Vector3(0,0.02,0),radius,0.012,material)

static func screw(parent: Node3D, pos: Vector3, vertical: bool = false) -> void:
	var root := Node3D.new()
	parent.add_child(root)
	root.position = pos
	if vertical: root.rotation.x = PI/2
	A.cylinder(root,Vector3.ZERO,0.024,0.008,A.gold())
	A.box(root,Vector3(0,0.005,0),Vector3(0.030,0.001,0.005),A.dark())
