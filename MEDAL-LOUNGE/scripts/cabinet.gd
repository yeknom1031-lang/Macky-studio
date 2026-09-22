extends RefCounted
const A = preload("res://scripts/art.gd")

static func build(m) -> void:
	var pearl := A.ivory()
	var chrome := A.chrome()
	var steel := A.steel()
	var black := A.mat("cabinet_black",Color("111820"),0.42,0.28)
	var rubber := A.mat("rubber",Color("090d10"),0.05,0.72)
	var trim := A.mat("insert_navy" if m.kind == 0 else "insert_wine",Color("102d40") if m.kind == 0 else Color("3c1721"),0.35,0.26)
	var led := A.mat("cabinet_led",Color("b9d7e2"),0.15,0.3,1.4)
	# Cast shell, stainless play bed, and a full-depth reciprocating pusher.
	A.box(m,Vector3(0,-0.23,-0.20),Vector3(4.5,0.45,5.1),black)
	A.box(m,Vector3(0,-0.11,-0.22),Vector3(3.84,0.22,3.84),steel,true)
	m.pusher = AnimatableBody3D.new()
	m.pusher.sync_to_physics = false
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
		A.box(m,Vector3(side*2.15,0.25,-0.28),Vector3(0.22,0.95,4.8),pearl,true)
		A.box(m,Vector3(side*2.17,0.63,-0.24),Vector3(0.24,0.14,4.9),chrome)
		A.box(m,Vector3(side*2.12,0.725,-0.3),Vector3(0.13,0.045,4.72),rubber)
		A.box(m,Vector3(side*2.08,0.77,-0.3),Vector3(0.035,0.028,4.5),led)
		A.box(m,Vector3(side*1.99,-0.12,-0.2),Vector3(0.11,0.14,3.82),black)
		A.box(m,Vector3(side*1.925,0.004,-0.2),Vector3(0.014,0.018,3.8),chrome)
		var glass := A.mat("glass_v2",Color(0.56,0.75,0.80,0.065),0.12,0.09)
		glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		A.box(m,Vector3(side*2.17,1.42,-1.0),Vector3(0.018,1.3,3.7),glass)
		for z in [-2.75,0.82]:
			A.bar(m,Vector3(side*2.2,0.65,z),Vector3(side*2.2,2.12,z),0.045,0.045,chrome)
			A.box(m,Vector3(side*2.2,0.82,z),Vector3(0.09,0.10,0.08),steel)
	# Rear frame, acrylic title insert, integrated fluorescent canopy.
	A.box(m,Vector3(0,1.57,-3.52),Vector3(4.55,3.7,0.32),pearl)
	A.box(m,Vector3(0,1.9,-3.335),Vector3(4.08,2.9,0.032),black)
	for x in [-2.20,2.20]:
		A.box(m,Vector3(x,1.7,-3.28),Vector3(0.18,3.6,0.28),chrome)
		A.box(m,Vector3(x,1.7,-3.12),Vector3(0.047,3.25,0.03),led)
	A.box(m,Vector3(0,3.25,-3.24),Vector3(4.40,0.42,0.28),chrome)
	A.box(m,Vector3(0,3.25,-3.085),Vector3(4.07,0.30,0.028),trim)
	A.label(m,"ROYAL  MEDAL" if m.kind == 0 else "IMPERIAL  TOWER",Vector3(0,3.255,-3.055),62,Color("edf0e8"))
	A.box(m,Vector3(0,3.0,-3.0),Vector3(3.98,0.055,0.32),black)
	A.box(m,Vector3(0,2.965,-2.98),Vector3(3.72,0.018,0.18),led)
	for x in [-1.97,1.97]:
		for y in [3.10,3.40]: screw(m,Vector3(x,y,-3.07),true)
	# Fixed rear sweeper closes the whole moving shelf stroke.
	A.box(m,Vector3(0,0.6,-2.10),Vector3(4.2,1.1,0.1),steel,true)
	A.box(m,Vector3(0,0.81,-2.027),Vector3(3.86,0.42,0.028),trim)
	A.label(m,"COLOR COLLECTION" if m.kind == 0 else "JACKPOT CHALLENGE",Vector3(0,1.005,-1.996),21,Color("dce5e3"))
	for i in 3:
		A.ring(m,Vector3(-0.37+i*0.37,0.79,-1.99),0.077,0.012,chrome).rotation.x = PI/2
		var orb := A.ball_visual(m,0.066,m.BALL_COLORS[i] if m.kind == 0 else Color("c6aa70"))
		orb.position = Vector3(-0.37+i*0.37,0.79,-1.976)
		orb.set_meta("dynamic",true)
		m.progress_lights.append(orb)
	A.label(m,"180 MEDALS" if m.kind == 0 else "260 MEDALS + TOWER",Vector3(0,0.605,-1.995),22,Color("dce5e3"))
	# A real catch tray is visible below the front edge, not an unexplained black hole.
	A.box(m,Vector3(0,-0.25,1.99),Vector3(3.82,0.07,0.58),steel)
	for z in [1.80,1.89,1.98,2.07,2.16]: A.box(m,Vector3(0,-0.2,z),Vector3(3.72,0.025,0.009),chrome)
	# Cast control deck with tactile arcade buttons, engraved plates and screw heads.
	A.box(m,Vector3(0,0.44,2.8),Vector3(4.42,0.42,1.17),black)
	A.box(m,Vector3(0,0.67,2.77),Vector3(4.4,0.10,1.14),pearl)
	A.box(m,Vector3(0,0.729,2.76),Vector3(4.17,0.018,0.91),steel)
	A.bar(m,Vector3(-2.13,0.72,3.34),Vector3(2.13,0.72,3.34),0.07,0.07,chrome)
	for side in 2:
		var x := -1.15 if side == 0 else 1.15
		A.cylinder(m,Vector3(x,0.76,2.93),0.305,0.055,rubber)
		A.cylinder(m,Vector3(x,0.81,2.93),0.275,0.065,chrome)
		A.ring(m,Vector3(x,0.85,2.93),0.236,0.012,A.mat("button_ring",Color("edaa66"),0.2,0.3,1.5))
		var cap := Node3D.new()
		m.add_child(cap)
		cap.position = Vector3(x,0.87,2.93)
		cap.set_meta("dynamic",true)
		A.cylinder(cap,Vector3.ZERO,0.217,0.10,A.mat("button_cap",Color("9f202a"),0.24,0.16,0.1))
		A.ring(cap,Vector3(0,0.05,0),0.197,0.012,A.mat("button_edge",Color("d93837"),0.18,0.16))
		var label := A.label(cap,"MEDAL",Vector3(0,0.062,0.008),24,Color("fff1d8"))
		label.rotation.x = -PI/2
		m.press_caps.append(cap)
		for dx in [-0.38,0.38]: screw(m,Vector3(x+dx,0.747,2.61))
		var caption := A.label(m,"メダル投入",Vector3(x,0.751,2.54),25,Color("18232d"))
		caption.rotation.x = -PI/2
	# Recessed electronic counter in the physical fascia.
	A.box(m,Vector3(0,0.765,2.83),Vector3(1.09,0.046,0.54),black)
	m.counter_label = A.label(m,"FREE PLAY\nOUT  00000",Vector3(0,0.792,2.83),23,Color("b6e6d0"))
	m.counter_label.rotation.x = -PI/2
	# Moving payout hopper on a visible cross rail.
	m.hopper = Node3D.new()
	m.add_child(m.hopper)
	m.hopper.position = Vector3(-1.35,1.25,-2.30)
	A.box(m.hopper,Vector3.ZERO,Vector3(0.44,0.15,0.44),steel)
	A.box(m.hopper,Vector3(0,0.19,-0.18),Vector3(0.44,0.30,0.045),chrome)
	A.box(m.hopper,Vector3(0,0.18,0.08),Vector3(0.35,0.10,0.025),black)
	A.label(m.hopper,"MEDAL OUT",Vector3(0,0.18,0.098),16,Color("ced7dc"))
	A.bar(m,Vector3(-1.86,1.50,-2.49),Vector3(1.86,1.50,-2.49),0.06,0.04,chrome)
	for x in [2.31,2.46]: A.bar(m,Vector3(x,-0.08,1.95),Vector3(x,-0.08,-3),0.025,0.025,chrome)
	for x in [2.31,2.46]: A.bar(m,Vector3(x,-0.08,-3),Vector3(x,2.2,-3),0.025,0.025,chrome)
	A.bar(m,Vector3(2.39,2.15,-3),Vector3(0.85,2.05,-3),0.06,0.03,steel)
	if m.kind == 1:
		m.tower_layer = Node3D.new()
		m.add_child(m.tower_layer)
		m.tower_layer.position = Vector3(0,0.5,-1.70)
		A.box(m,Vector3(0,0.48,-1.70),Vector3(1.04,0.09,0.96),steel)
		for x in [-0.54,0.54]: A.bar(m,Vector3(x,0.5,-1.9),Vector3(x,1.15,-1.9),0.035,0.035,chrome)

static func screw(parent: Node3D, pos: Vector3, vertical: bool = false) -> void:
	var root := Node3D.new()
	parent.add_child(root)
	root.position = pos
	if vertical: root.rotation.x = PI/2
	A.cylinder(root,Vector3.ZERO,0.024,0.008,A.chrome())
	A.box(root,Vector3(0,0.005,0),Vector3(0.030,0.001,0.005),A.dark())
