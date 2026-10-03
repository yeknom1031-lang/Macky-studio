extends Node3D

const SURFACE = preload("res://shaders/surface.gdshader")
var mats = {}
var font: SystemFont
var anomaly = -1
var elapsed = 0.0
var bench: Node3D
var clock_hand: Node3D
var passenger: Node3D
var watchers: Array = []
var moon: MeshInstance3D
var name_sign: Label3D
var lights: Array = []
var player: Node3D

func _init() -> void:
	font = SystemFont.new()
	font.font_names = PackedStringArray(["Hiragino Sans", "Noto Sans CJK JP", "Arial"])

func material(key: String, color: Color, roughness: float = 0.7, metallic: float = 0.0, grid: bool = false) -> Material:
	if mats.has(key):
		return mats[key]
	var m = ShaderMaterial.new()
	m.shader = SURFACE
	m.set_shader_parameter("base_color", color)
	m.set_shader_parameter("rough", roughness)
	m.set_shader_parameter("metal", metallic)
	m.set_shader_parameter("grid", grid)
	m.set_shader_parameter("tile", 0.7)
	mats[key] = m
	return m

func glow(color: Color, energy: float = 1.0) -> Material:
	var m = StandardMaterial3D.new()
	m.albedo_color = color
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = energy
	m.roughness = 0.5
	return m

func block(parent: Node3D, size: Vector3, pos: Vector3, mat: Material, solid: bool = false) -> MeshInstance3D:
	var n = MeshInstance3D.new()
	var mesh = BoxMesh.new()
	mesh.size = size
	n.mesh = mesh
	n.material_override = mat
	parent.add_child(n)
	n.position = pos
	if solid:
		var body = StaticBody3D.new()
		var shape = CollisionShape3D.new()
		var box = BoxShape3D.new()
		box.size = size
		shape.shape = box
		body.add_child(shape)
		n.add_child(body)
	return n

func ball(parent: Node3D, radius: float, pos: Vector3, mat: Material) -> MeshInstance3D:
	var n = MeshInstance3D.new()
	var mesh = SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2
	mesh.radial_segments = 20
	mesh.rings = 12
	n.mesh = mesh
	n.material_override = mat
	parent.add_child(n)
	n.position = pos
	return n

func tube(parent: Node3D, radius: float, height: float, pos: Vector3, mat: Material) -> MeshInstance3D:
	var n = MeshInstance3D.new()
	var mesh = CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 16
	n.mesh = mesh
	n.material_override = mat
	parent.add_child(n)
	n.position = pos
	return n

func label(parent: Node3D, words: String, pos: Vector3, size: int = 50, color: Color = Color.WHITE, scale_factor: float = 0.004) -> Label3D:
	var n = Label3D.new()
	n.font = font
	n.text = words
	n.font_size = size
	n.pixel_size = scale_factor
	n.modulate = color
	n.outline_size = 0
	n.no_depth_test = false
	n.shaded = false
	parent.add_child(n)
	n.position = pos
	return n

func light_at(pos: Vector3, color: Color, energy: float, reach: float) -> OmniLight3D:
	var light = OmniLight3D.new()
	light.position = pos
	light.light_color = color
	light.light_energy = energy
	light.omni_range = reach
	light.omni_attenuation = 1.3
	add_child(light)
	return light

func build(id: int = -1) -> void:
	anomaly = id
	var floor_mat = material("floor", Color("657172"), 0.52, 0.10, true)
	var wall = material("wall", Color("9caca5"), 0.84)
	var metal = material("metal", Color("475559"), 0.35, 0.75)
	var dark = material("dark", Color("14232a"), 0.8)
	var concrete = material("concrete", Color("4b585c"), 0.89)
	var amber = material("amber", Color("d7a84e"), 0.65)
	var teal = material("teal", Color("256d70"), 0.46, 0.15)
	block(self, Vector3(8, 0.6, 38), Vector3(0, -0.3, 0), floor_mat, true)
	block(self, Vector3(0.4, 5, 38), Vector3(4.1, 2.2, 0), wall, true)
	block(self, Vector3(0.08, 0.15, 38), Vector3(3.86, 0.18, 0), dark)
	block(self, Vector3(0.06, 0.19, 38), Vector3(3.86, 1.18, 0), teal)
	block(self, Vector3(15, 0.35, 39), Vector3(-3.0, 4.45, 0), dark)
	for z in range(-18, 20, 2):
		block(self, Vector3(0.015, 3.8, 0.025), Vector3(3.885, 2.2, z), concrete)
	for z in [-15, -9, -3, 3, 9, 15]:
		block(self, Vector3(10.4, 0.22, 0.22), Vector3(-1.4, 4.05, z), metal)
		block(self, Vector3(0.3, 4.2, 0.3), Vector3(-3.28, 2.1, z), wall, true)
		block(self, Vector3(0.33, 0.5, 0.33), Vector3(-3.28, 0.48, z), teal)
		block(self, Vector3(0.38, 0.12, 2.2), Vector3(0.1, 3.91, z), metal)
		block(self, Vector3(0.26, 0.045, 2.0), Vector3(0.1, 3.83, z), glow(Color("e2ece2"), 2))
		var light = light_at(Vector3(0.1, 3.46, z), Color("cfe0d5"), 1.7, 6.5)
		lights.append(light)
		if z in [-9, 3, 15]:
			light.shadow_enabled = true
		# Small enamel platform markers.
		block(self, Vector3(0.34, 0.50, 0.025), Vector3(-3.28, 2.65, z + 0.17), dark)
		label(self, "0", Vector3(-3.28, 2.65, z + 0.19), 56, Color("e4d4a8"), 0.006)
	# Track bed, rails, sleepers and the parked train.
	block(self, Vector3(6.7, 0.25, 75), Vector3(-7.4, -0.9, 0), dark)
	for z in range(-36, 38):
		block(self, Vector3(3.0, 0.15, 0.18), Vector3(-6.0, -0.65, z), concrete)
	for x in [-5.24, -6.76]:
		block(self, Vector3(0.10, 0.22, 75), Vector3(x, -0.51, 0), metal)
	build_train(metal, dark, teal)
	# A waist-high barrier gives the track a visible, physical boundary.
	for z in range(-18, 20, 3):
		tube(self, 0.037, 0.9, Vector3(-3.83, 0.45, z), metal)
	block(self, Vector3(0.06, 0.06, 38), Vector3(-3.83, 0.90, 0), metal)
	var edge = block(self, Vector3(0.1, 3.8, 38), Vector3(-3.91, 1.85, 0), dark, true)
	edge.visible = false
	if id != 6:
		block(self, Vector3(0.44, 0.025, 37), Vector3(-2.95, 0.022, 0), amber)
		var dots = MultiMeshInstance3D.new()
		var multi = MultiMesh.new()
		multi.transform_format = MultiMesh.TRANSFORM_3D
		var dot_mesh = CylinderMesh.new()
		dot_mesh.top_radius = 0.025
		dot_mesh.bottom_radius = 0.027
		dot_mesh.height = 0.012
		dot_mesh.radial_segments = 6
		multi.mesh = dot_mesh
		multi.instance_count = 555
		for i in range(555):
			multi.set_instance_transform(i, Transform3D(Basis.IDENTITY, Vector3(-3.09 + (i % 3) * 0.14, 0.044, -18.4 + (i / 3) * 0.2)))
		dots.multimesh = multi
		dots.material_override = amber
		add_child(dots)
	# Exit vestibules at both ends.
	build_gate(-18.1, false, dark, metal)
	build_gate(18.1, true, dark, metal)
	# Station name board facing inward from the wall.
	var station_board = Node3D.new()
	add_child(station_board)
	station_board.position = Vector3(3.86, 2.58, -3)
	station_board.rotation.y = -PI / 2
	block(station_board, Vector3(3.3, 1.05, 0.09), Vector3.ZERO, glow(Color("d1d9c9"), 0.3))
	block(station_board, Vector3(3.31, 0.16, 0.1), Vector3(0, -0.34, 0.01), teal)
	name_sign = label(station_board, "帰 れ" if id == 0 else "宵 凪", Vector3(0, 0.12, 0.06), 74, Color("182d30"), 0.0044)
	label(station_board, "Y O I N A G I", Vector3(0, -0.14, 0.065), 25, Color("243d40"))
	label(station_board, "あさぎり   ←                         →   しおみ", Vector3(0, -0.35, 0.066), 23, Color("eef5e9"))
	build_departure(dark)
	build_clock(metal)
	build_bench(metal, teal)
	build_vending(metal, dark)
	build_poster(5.7, false)
	build_poster(-11.1, id == 10)
	passenger = person(Vector3(1.65, 0, -9), 0.3)
	if id == 4:
		passenger.scale.y = 1.92
	if id == 7:
		watchers = [passenger, person(Vector3(1.45, 0, 4.5), 0), person(Vector3(-1.7, 0, -4), 0), person(Vector3(2.0, 0, -13.7), 0)]
	if id == 5:
		for i in range(12):
			var foot = ball(self, 0.13, Vector3(-0.7 + 0.28 * (i % 2), 4.22, 7 - i * 0.62), material("foot", Color("2c1819")))
			foot.scale = Vector3(0.62, 0.08, 1.7)
	if id == 9:
		moon = ball(self, 1.17, Vector3(-0.35, 2.6, -6.3), glow(Color("d6ddc7"), 0.65))
		for i in range(14):
			var angle = i * 2.39
			var dist = 0.35 + 0.03 * i
			ball(moon, 0.1 + 0.04 * (i % 3), Vector3(sin(angle) * dist, cos(angle) * dist, 0.86), material("crater", Color("9ca697"), 1))
		light_at(Vector3(-0.4, 2.5, -5), Color("e0e4bc"), 0.8, 5)
	# A skyline beyond the dark train windows gives the space depth.
	var city_rng = RandomNumberGenerator.new()
	city_rng.seed = 8247
	for z in range(-45, 46, 5):
		var height = city_rng.randf_range(5, 13)
		block(self, Vector3(5, height, 4.6), Vector3(-22, height * 0.5 - 2, z), dark)
		for level in range(2, int(height)):
			if city_rng.randf() < 0.55:
				block(self, Vector3(0.04, 0.5, 1.3), Vector3(-19.47, level - 2, z), glow(Color("798a82"), 0.4))

func build_gate(z: float, near_gate: bool, dark: Material, metal: Material) -> void:
	var gate = Node3D.new()
	add_child(gate)
	gate.position.z = z
	if near_gate:
		gate.rotation.y = PI
	block(gate, Vector3(3, 4.4, 0.35), Vector3(-2.5, 2.2, 0), dark, true)
	block(gate, Vector3(3, 4.4, 0.35), Vector3(2.5, 2.2, 0), dark, true)
	block(gate, Vector3(2, 1.1, 0.35), Vector3(0, 3.85, 0), dark, true)
	block(gate, Vector3(2, 3.4, 0.18), Vector3(0, 1.7, 0.04), metal, true)
	for x in [-0.48, 0.48]:
		block(gate, Vector3(0.88, 3, 0.06), Vector3(x, 1.5, 0.15), material("gate", Color("52676a"), 0.35, 0.7))
		block(gate, Vector3(0.5, 1.25, 0.08), Vector3(x, 2.08, 0.19), material("glass", Color("0b191c"), 0.12, 0.7))
	block(gate, Vector3(1.9, 0.45, 0.13), Vector3(0, 3.2, 0.2), glow(Color("294c44"), 0.7))
	label(gate, "入口へ戻る" if near_gate else "出口へ進む", Vector3(0, 3.21, 0.28), 52, Color("e4ebc9"), 0.004)
	label(gate, "RETURN" if near_gate else "EXIT", Vector3(0, 2.0, 0.3), 28, Color("b3c5b5"))
	label(gate, "異変があれば、引き返せ。" if near_gate else "異変がなければ、その先へ。", Vector3(0, 0.86, 0.26), 28, Color("d9e4d2"))
	light_at(Vector3(0, 2.6, z + (-0.8 if near_gate else 0.8)), Color("8fcca6"), 0.5, 3)

func build_departure(dark: Material) -> void:
	var board = Node3D.new()
	add_child(board)
	board.position = Vector3(-0.15, 3.14, 8.3)
	block(board, Vector3(3.6, 0.94, 0.17), Vector3.ZERO, dark)
	block(board, Vector3(3.62, 0.025, 0.18), Vector3(0, 0.48, 0), mats.metal)
	for x in [-1.2, 1.2]:
		block(board, Vector3(0.04, 0.75, 0.05), Vector3(x, 0.82, 0), mats.metal)
	label(board, "0   夜間連絡線    DEPARTURES", Vector3(0, 0.28, 0.1), 31, Color("bfd0c9"))
	label(board, "25:99   各駅停車   帰れ" if anomaly == 11 else "00:17   各駅停車   潮見", Vector3(0, -0.07, 0.1), 37, Color("efbe65"))
	label(board, "本日の運転は終了しました", Vector3(0, -0.31, 0.1), 24, Color("8bbac1"))

func build_clock(metal: Material) -> void:
	var clock_root = Node3D.new()
	add_child(clock_root)
	clock_root.position = Vector3(0.0, 3.08, -12.5)
	block(clock_root, Vector3(0.04, 1.1, 0.04), Vector3(0, 0.8, 0), metal)
	var rim = tube(clock_root, 0.46, 0.11, Vector3.ZERO, metal)
	rim.rotation.x = PI / 2
	var face = tube(clock_root, 0.415, 0.02, Vector3(0, 0, 0.07), glow(Color("cbd4bc"), 0.4))
	face.rotation.x = PI / 2
	for i in range(12):
		var angle = i * TAU / 12
		var mark = block(clock_root, Vector3(0.02, 0.075, 0.012), Vector3(sin(angle) * 0.34, cos(angle) * 0.34, 0.09), mats.dark)
		mark.rotation.z = -angle
	clock_hand = Node3D.new()
	clock_root.add_child(clock_hand)
	block(clock_hand, Vector3(0.024, 0.32, 0.02), Vector3(0, 0.13, 0.105), mats.dark)
	var hour = block(clock_root, Vector3(0.033, 0.21, 0.02), Vector3(0.08, 0.05, 0.115), mats.dark)
	hour.rotation.z = -0.95
	clock_hand.rotation.z = -1.78

func build_bench(metal: Material, teal: Material) -> void:
	bench = Node3D.new()
	add_child(bench)
	bench.position = Vector3(2.4, 0, 1.0)
	for z in [-0.94, 0, 0.94]:
		block(bench, Vector3(0.68, 0.10, 0.83), Vector3(0, 0.47, z), teal, true)
		var back = block(bench, Vector3(0.08, 0.62, 0.83), Vector3(0.33, 0.79, z), teal, true)
		back.rotation.z = -0.09
		for side in [-0.3, 0.3]:
			block(bench, Vector3(0.06, 0.44, 0.07), Vector3(side, 0.22, z), metal)
		block(bench, Vector3(0.65, 0.05, 0.035), Vector3(0, 0.70, z + 0.43), metal)
	if anomaly == 2:
		bench.position.y = 0.94

func build_vending(metal: Material, dark: Material) -> void:
	var machine = Node3D.new()
	add_child(machine)
	machine.position = Vector3(3.15, 0, 10.2)
	machine.rotation.y = -PI / 2
	var body_mat = material("vending", Color("91aba5"), 0.35, 0.3)
	block(machine, Vector3(1.37, 2.18, 0.77), Vector3(0, 1.09, 0), body_mat, true)
	block(machine, Vector3(1.07, 1.08, 0.025), Vector3(-0.05, 1.44, 0.40), glow(Color("adc7b8"), 0.6))
	block(machine, Vector3(1.1, 0.1, 0.05), Vector3(-0.05, 0.96, 0.45), metal)
	block(machine, Vector3(0.9, 0.27, 0.05), Vector3(0, 0.33, 0.40), dark)
	label(machine, "Y O I   D R I N K", Vector3(0, 2.01, 0.405), 24, Color("122e33"))
	var colors = [Color("ddbc75"), Color("87adad"), Color("c2897e"), Color("bed0bc")]
	for row in range(2):
		for col in range(4):
			var pos = Vector3(-0.43 + col * 0.255, 1.2 + row * 0.40, 0.47)
			if anomaly == 1:
				ball(machine, 0.10, pos, glow(Color("e2e7da"), 0.3))
				ball(machine, 0.045, pos + Vector3(0, 0, 0.08), dark)
			else:
				tube(machine, 0.055, 0.24, pos, glow(colors[col], 0.2))
				tube(machine, 0.035, 0.035, pos + Vector3(0, 0.137, 0), metal)
			ball(machine, 0.023, pos + Vector3(0, -0.16, 0.015), glow(Color("7fb8a0")))
	block(machine, Vector3(0.16, 0.26, 0.04), Vector3(0.52, 0.76, 0.41), dark)
	light_at(Vector3(2.35, 1.35, 10.2), Color("aed3c3"), 0.45, 2.5)

func build_poster(z: float, eye: bool) -> void:
	var poster = Node3D.new()
	add_child(poster)
	poster.position = Vector3(3.86, 2.24, z)
	poster.rotation.y = -PI / 2
	block(poster, Vector3(1.35, 1.86, 0.055), Vector3.ZERO, mats.metal)
	block(poster, Vector3(1.25, 1.76, 0.02), Vector3(0, 0, 0.04), glow(Color("1d505a"), 0.28))
	if eye:
		var white = ball(poster, 0.42, Vector3(0, 0.10, 0.04), glow(Color("dfd6bd"), 0.3))
		white.scale = Vector3(1.25, 0.7, 0.08)
		var iris = ball(poster, 0.23, Vector3(0, 0.10, 0.09), mats.dark)
		iris.scale.z = 0.1
		label(poster, "見 て い る", Vector3(0, -0.63, 0.08), 39, Color("d9caa5"))
	else:
		var sun = ball(poster, 0.25, Vector3(0.17, 0.24, 0.055), glow(Color("d5b271"), 0.5))
		sun.scale.z = 0.07
		for i in range(5):
			block(poster, Vector3(1.1, 0.028, 0.01), Vector3(0, -0.1 - i * 0.075, 0.08), glow(Color("5a9999"), 0.25))
		label(poster, "海辺で、ひと息。", Vector3(0, 0.65, 0.075), 28, Color("e4d8bf"))
		label(poster, "潮 見 海 岸", Vector3(0, -0.62, 0.075), 40, Color("e4d8bf"))
		label(poster, "SHIOMI COAST", Vector3(0, -0.80, 0.075), 17, Color("d1ddd4"))

func person(pos: Vector3, yaw: float, parent: Node3D = self, silhouette: bool = false) -> Node3D:
	var root = Node3D.new()
	parent.add_child(root)
	root.position = pos
	root.rotation.y = yaw
	var coat = material("coat", Color("182428"), 0.95)
	var skin = material("skin", Color("a19d8c"), 0.8) if not silhouette else coat
	for x in [-0.115, 0.115]:
		tube(root, 0.076, 0.76, Vector3(x, 0.47, 0), coat)
		block(root, Vector3(0.16, 0.11, 0.28), Vector3(x, 0.06, 0.06), mats.dark)
	var torso = ball(root, 0.26, Vector3(0, 1.13, 0), coat)
	torso.scale = Vector3(0.95, 1.60, 0.64)
	ball(root, 0.16, Vector3(0, 1.66, 0), skin).scale = Vector3(0.88, 1.15, 0.9)
	var hair = ball(root, 0.164, Vector3(0, 1.74, -0.015), coat)
	hair.scale = Vector3(0.9, 0.66, 0.9)
	if not silhouette:
		for x in [-0.055, 0.055]:
			ball(root, 0.016, Vector3(x, 1.68, 0.14), mats.dark)
		for x in [-0.31, 0.31]:
			tube(root, 0.068, 0.62, Vector3(x, 1.06, 0), coat)
			ball(root, 0.062, Vector3(x, 0.73, 0), skin)
		var blocker = block(root, Vector3(0.62, 1.7, 0.42), Vector3(0, 0.86, 0), coat, true)
		blocker.visible = false
	return root

func build_train(metal: Material, dark: Material, teal: Material) -> void:
	var silver = material("train", Color("869b98"), 0.3, 0.7)
	var window = material("windows", Color("0d1c20"), 0.14, 0.7)
	for start in [-12, 0, 12]:
		block(self, Vector3(2.65, 2.75, 11.7), Vector3(-5.85, 1.53, start), silver)
		block(self, Vector3(2.75, 0.16, 11.75), Vector3(-5.85, 0.96, start), teal)
		block(self, Vector3(2.75, 0.06, 11.75), Vector3(-5.85, 0.79, start), glow(Color("b3b083"), 0.2))
		block(self, Vector3(2.8, 0.19, 11.8), Vector3(-5.85, 2.96, start), metal)
		for wz in [-4.25, -2.15, 2.15, 4.25]:
			block(self, Vector3(0.045, 1.08, 1.72), Vector3(-4.49, 2.05, start + wz), dark)
			block(self, Vector3(0.025, 0.92, 1.59), Vector3(-4.46, 2.05, start + wz), window)
			block(self, Vector3(0.035, 0.035, 1.52), Vector3(-4.44, 2.39, start + wz), glow(Color("50776c"), 0.5))
			if anomaly == 8:
				var ghost = person(Vector3(-4.42, 0.6, start + wz), PI / 2, self, true)
				ghost.scale = Vector3(1, 1, 0.3)
		for dz in [-0.44, 0.44]:
			block(self, Vector3(0.04, 2.1, 0.84), Vector3(-4.46, 1.42, start + dz), metal)
			block(self, Vector3(0.055, 0.85, 0.58), Vector3(-4.425, 2.03, start + dz), window)
		for wz in [-3.7, 3.7]:
			var wheel = tube(self, 0.37, 2.5, Vector3(-5.85, -0.18, start + wz), dark)
			wheel.rotation.z = PI / 2
		var lettering = label(self, "YOINAGI  /  017", Vector3(-4.43, 0.56, start - 2.8), 21, Color("c9d8cd"))
		lettering.rotation.y = PI / 2

func animate(delta: float) -> void:
	elapsed += delta
	if anomaly == 2:
		bench.position.y = 0.94 + sin(elapsed * 1.1) * 0.10
	if anomaly == 3:
		clock_hand.rotation.z += delta * 1.35
	if anomaly == 7 and is_instance_valid(player):
		for watcher in watchers:
			var target = player.global_position
			target.y = watcher.global_position.y
			if target.distance_to(watcher.global_position) > 0.05:
				watcher.look_at(target, Vector3.UP, true)
	if anomaly == 9:
		moon.position.y = 2.6 + sin(elapsed * 0.7) * 0.08
