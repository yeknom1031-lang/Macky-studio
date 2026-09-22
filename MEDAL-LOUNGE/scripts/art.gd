extends RefCounted
## Shared meshes/materials, reusable physical cabinet geometry.
static var materials: Dictionary = {}
static var medal_mesh: ArrayMesh
static var medal_shape: CylinderShape3D

static func mat(key: String, color: Color, metallic: float = 0.0, rough: float = 0.4, emission: float = 0.0) -> StandardMaterial3D:
	if materials.has(key):
		return materials[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.metallic = metallic
	m.roughness = rough
	if emission > 0:
		m.emission_enabled = true
		m.emission = color
		m.emission_energy_multiplier = emission
	materials[key] = m
	return m

static func gold() -> Material:
	return mat("brass", Color("b79b61"), 0.83, 0.26)

static func steel() -> Material:
	return mat("steel", Color("79858f"), 0.85, 0.29)

static func dark() -> Material:
	return mat("dark", Color("101b28"), 0.52, 0.27)

static func burgundy() -> Material:
	return mat("burgundy", Color("35101c"), 0.36, 0.23)

static func box(parent: Node3D, pos: Vector3, size: Vector3, material: Material, solid: bool = false) -> Node3D:
	var root: Node3D = StaticBody3D.new() if solid else Node3D.new()
	parent.add_child(root)
	root.position = pos
	var mesh := MeshInstance3D.new()
	var shape := BoxMesh.new()
	shape.size = size
	mesh.mesh = shape
	mesh.material_override = material
	root.add_child(mesh)
	if solid:
		var collision := CollisionShape3D.new()
		var b := BoxShape3D.new()
		b.size = size
		collision.shape = b
		root.add_child(collision)
	return root

static func cylinder(parent: Node3D, pos: Vector3, radius: float, height: float, material: Material) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	var shape := CylinderMesh.new()
	shape.top_radius = radius
	shape.bottom_radius = radius
	shape.height = height
	shape.radial_segments = 48
	mesh.mesh = shape
	mesh.material_override = material
	parent.add_child(mesh)
	mesh.position = pos
	return mesh

static func bar(parent: Node3D, from: Vector3, to: Vector3, width: float, height: float, material: Material) -> Node3D:
	var v := to - from
	var obj := box(parent, (from+to)*0.5, Vector3(width,height,v.length()), material)
	obj.look_at_from_position(obj.position, to, Vector3.FORWARD if absf(v.normalized().y) > 0.98 else Vector3.UP)
	return obj

static func label(parent: Node3D, content: String, pos: Vector3, size: int, color: Color) -> Label3D:
	var l := Label3D.new()
	parent.add_child(l)
	l.text = content
	l.position = pos
	l.font_size = size
	l.pixel_size = 0.003
	l.modulate = color
	l.outline_size = 0
	l.no_depth_test = false
	return l

static func ring(parent: Node3D, pos: Vector3, radius: float, thickness: float, material: Material) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var t := TorusMesh.new()
	t.inner_radius = radius-thickness
	t.outer_radius = radius+thickness
	t.rings = 64
	t.ring_segments = 8
	m.mesh = t
	m.material_override = material
	parent.add_child(m)
	m.position = pos
	return m

static func coin_mesh() -> ArrayMesh:
	if medal_mesh == null:
		var surface := SurfaceTool.new()
		surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		# Lathed profile creates a raised rim and beveled edges, not a flat cylinder.
		var profile := [Vector2(0,0.016),Vector2(0.126,0.016),Vector2(0.132,0.021),Vector2(0.141,0.021),Vector2(0.145,0.015),Vector2(0.145,-0.015),Vector2(0.141,-0.021),Vector2(0.132,-0.021),Vector2(0.126,-0.016),Vector2(0,-0.016)]
		for j in profile.size()-1:
			for i in 64:
				var a := TAU*i/64.0
				var b := TAU*(i+1)/64.0
				var q: Vector2 = profile[j]
				var r: Vector2 = profile[j+1]
				var vertices := [Vector3(sin(a)*q.x,q.y,cos(a)*q.x),Vector3(sin(b)*q.x,q.y,cos(b)*q.x),Vector3(sin(a)*r.x,r.y,cos(a)*r.x),Vector3(sin(b)*r.x,r.y,cos(b)*r.x)]
				for index in [0,1,2,1,3,2]: surface.add_vertex(vertices[index])
		surface.generate_normals()
		surface.index()
		medal_mesh = surface.commit()
		var shader := ShaderMaterial.new()
		shader.shader = load("res://shaders/coin.gdshader")
		medal_mesh.surface_set_material(0,shader)
	return medal_mesh

static func coin_collision() -> CylinderShape3D:
	if medal_shape == null:
		medal_shape = CylinderShape3D.new()
		medal_shape.radius = 0.145
		medal_shape.height = 0.036
	return medal_shape

static func coin_visual(parent: Node3D) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	m.mesh = coin_mesh()
	parent.add_child(m)
	return m

static func ball_visual(parent: Node3D, radius: float, color: Color) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var s := SphereMesh.new()
	s.radius = radius
	s.height = radius*2
	s.radial_segments = 32
	s.rings = 16
	m.mesh = s
	m.material_override = mat("ball"+color.to_html(),color,0.6,0.18)
	parent.add_child(m)
	return m
