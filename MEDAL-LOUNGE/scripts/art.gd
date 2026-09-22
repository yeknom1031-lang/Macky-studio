extends RefCounted
## Shared meshes/materials, reusable physical cabinet geometry.
static var materials: Dictionary = {}
static var medal_mesh: ArrayMesh
static var medal_shape: Shape3D
static var unit_box: ArrayMesh
static var unit_cylinder: CylinderMesh
static var rings: Dictionary = {}

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
	return mat("brass", Color("b5904e"), 0.84, 0.23)

static func steel() -> Material:
	var m := mat("steel", Color("c1c6cb"), 0.90, 0.24)
	if ResourceLoader.exists("res://assets/generated/brushed-steel.png"):
		m.albedo_texture = load("res://assets/generated/brushed-steel.png")
		m.uv1_triplanar = true
		m.uv1_scale = Vector3(1.5,1.5,1.5)
		m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	return m

static func chrome() -> Material:
	return mat("chrome",Color("c7ced5"),0.96,0.14)

static func ivory() -> Material:
	return mat("ivory",Color("cbd1d4"),0.32,0.23)

static func dark() -> Material:
	return mat("dark", Color("101b28"), 0.52, 0.27)

static func burgundy() -> Material:
	return mat("burgundy", Color("35101c"), 0.36, 0.23)

static func box(parent: Node3D, pos: Vector3, size: Vector3, material: Material, solid: bool = false) -> Node3D:
	var root: Node3D = StaticBody3D.new() if solid else Node3D.new()
	parent.add_child(root)
	root.position = pos
	var mesh := MeshInstance3D.new()
	if unit_box == null: unit_box = bevel_cube()
	mesh.mesh = unit_box
	mesh.scale = size
	mesh.material_override = material
	root.add_child(mesh)
	if solid:
		var collision := CollisionShape3D.new()
		var b := BoxShape3D.new()
		b.size = size
		collision.shape = b
		root.add_child(collision)
	return root

static func bevel_cube() -> ArrayMesh:
	var s := SurfaceTool.new()
	s.begin(Mesh.PRIMITIVE_TRIANGLES)
	var inset := 0.465
	for axis in 3:
		var u := (axis+1)%3
		var v := (axis+2)%3
		for side in [-1,1]:
			var normal := Vector3.ZERO
			normal[axis] = side
			var points: Array = []
			for p in [Vector2(-1,-1),Vector2(1,-1),Vector2(1,1),Vector2(-1,1)]:
				var pos := Vector3.ZERO
				pos[axis] = side*0.5
				pos[u] = p.x*inset
				pos[v] = p.y*inset
				points.append(pos)
			emit_polygon(s,points,normal)
		for su in [-1,1]:
			for sv in [-1,1]:
				var points: Array = []
				for config in [Vector2(-1,0),Vector2(1,0),Vector2(1,1),Vector2(-1,1)]:
					var pos := Vector3.ZERO
					pos[axis] = config.x*inset
					pos[u] = su*(0.5 if config.y == 0 else inset)
					pos[v] = sv*(inset if config.y == 0 else 0.5)
					points.append(pos)
				var normal := Vector3.ZERO
				normal[u] = su
				normal[v] = sv
				emit_polygon(s,points,normal.normalized())
	for x in [-1,1]:
		for y in [-1,1]:
			for z in [-1,1]:
				var sign := Vector3(x,y,z)
				var points: Array = []
				for axis in 3:
					var p := sign*inset
					p[axis] = sign[axis]*0.5
					points.append(p)
				emit_polygon(s,points,sign.normalized())
	s.index()
	return s.commit()

static func emit_polygon(s: SurfaceTool, points: Array, normal: Vector3) -> void:
	for i in range(1,points.size()-1):
		var triangle := [points[0],points[i],points[i+1]]
		if (triangle[1]-triangle[0]).cross(triangle[2]-triangle[0]).dot(normal) > 0: triangle.reverse()
		for pos in triangle:
			s.set_normal(normal)
			s.set_uv(Vector2(pos.x,pos.z)+Vector2(0.5,0.5))
			s.add_vertex(pos)

static func cylinder(parent: Node3D, pos: Vector3, radius: float, height: float, material: Material) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	if unit_cylinder == null:
		unit_cylinder = CylinderMesh.new()
		unit_cylinder.top_radius = 1.0
		unit_cylinder.bottom_radius = 1.0
		unit_cylinder.height = 1.0
		unit_cylinder.radial_segments = 64
	mesh.mesh = unit_cylinder
	mesh.scale = Vector3(radius,height,radius)
	mesh.material_override = material
	parent.add_child(mesh)
	mesh.position = pos
	return mesh

static func bar(parent: Node3D, from: Vector3, to: Vector3, width: float, height: float, material: Material) -> Node3D:
	var v := to - from
	var obj := box(parent, (from+to)*0.5, Vector3(width,height,v.length()), material)
	obj.basis = Basis.looking_at(v.normalized(),Vector3.FORWARD if absf(v.normalized().y) > 0.98 else Vector3.UP)
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
	var key := "%.6f_%.6f"%[radius,thickness]
	if not rings.has(key):
		var torus := TorusMesh.new()
		torus.inner_radius = radius-thickness
		torus.outer_radius = radius+thickness
		torus.rings = 64
		torus.ring_segments = 8
		rings[key] = torus
	var t: TorusMesh = rings[key]
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
		var profile := [Vector2(0,0.013),Vector2(0.126,0.013),Vector2(0.132,0.018),Vector2(0.141,0.018),Vector2(0.145,0.012),Vector2(0.145,-0.012),Vector2(0.141,-0.018),Vector2(0.132,-0.018),Vector2(0.126,-0.013),Vector2(0,-0.013)]
		for j in profile.size()-1:
			for i in 64:
				var a := TAU*i/64.0
				var b := TAU*(i+1)/64.0
				var q: Vector2 = profile[j]
				var r: Vector2 = profile[j+1]
				var vertices := [Vector3(sin(a)*q.x,q.y,cos(a)*q.x),Vector3(sin(b)*q.x,q.y,cos(b)*q.x),Vector3(sin(a)*r.x,r.y,cos(a)*r.x),Vector3(sin(b)*r.x,r.y,cos(b)*r.x)]
				# A stamped medal has a FLAT face. Averaging normals with its rim
				# bends the whole face into a shiny bowl and erases the engraving.
				var edge := r-q
				for index in [0,1,2,1,3,2]:
					var angle := a if index in [0,2] else b
					var normal := Vector3(-edge.y*sin(angle),edge.x,-edge.y*cos(angle)).normalized()
					surface.set_normal(normal)
					surface.add_vertex(vertices[index])
		surface.index()
		medal_mesh = surface.commit()
		var shader := ShaderMaterial.new()
		shader.shader = load("res://shaders/coin.gdshader")
		if ResourceLoader.exists("res://assets/generated/silver-star-v3.png"):
			shader.set_shader_parameter("face_texture",load("res://assets/generated/silver-star-v3.png"))
		medal_mesh.surface_set_material(0,shader)
	return medal_mesh

static func panel(parent: Node3D, pos: Vector3, size: Vector2, texture: String, tint: Color = Color.WHITE) -> MeshInstance3D:
	var material := mat(texture+tint.to_html(),tint,0.30,0.32)
	material.albedo_texture = load(texture)
	material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	var quad := QuadMesh.new()
	quad.size = size
	var instance := MeshInstance3D.new()
	instance.mesh = quad
	instance.material_override = material
	parent.add_child(instance)
	instance.position = pos
	return instance

static func tube(parent: Node3D, from: Vector3, to: Vector3, radius: float, material: Material) -> Node3D:
	var root := Node3D.new()
	parent.add_child(root)
	root.position = (from+to)*0.5
	var direction := (to-from).normalized()
	root.quaternion = Quaternion(Vector3.UP,direction)
	cylinder(root,Vector3.ZERO,radius,from.distance_to(to),material)
	return root

static func coin_collision() -> Shape3D:
	if medal_shape == null:
		var shape := CylinderShape3D.new()
		shape.radius = 0.145
		shape.height = 0.036
		medal_shape = shape
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

static func batch_static(parent: Node3D, exceptions: Array) -> void:
	var buckets := {}
	collect_static(parent,parent,exceptions,buckets)
	for key in buckets:
		var items: Array = buckets[key]
		var multi := MultiMesh.new()
		multi.transform_format = MultiMesh.TRANSFORM_3D
		multi.mesh = items[0].mesh
		multi.instance_count = items.size()
		var draw := MultiMeshInstance3D.new()
		draw.multimesh = multi
		draw.material_override = items[0].material_override
		parent.add_child(draw)
		for i in items.size():
			multi.set_instance_transform(i,parent.global_transform.affine_inverse()*items[i].global_transform)
			items[i].queue_free()

static func collect_static(root: Node3D, node: Node, exceptions: Array, buckets: Dictionary) -> void:
	if node != root and (node in exceptions or node.get_meta("dynamic",false)): return
	if node is MeshInstance3D and node.material_override:
		var material = node.material_override
		if material is StandardMaterial3D and material.transparency != BaseMaterial3D.TRANSPARENCY_DISABLED: return
		var key := "%d_%d" % [node.mesh.get_instance_id(),material.get_instance_id()]
		if not buckets.has(key): buckets[key] = []
		buckets[key].append(node)
	for child in node.get_children(): collect_static(root,child,exceptions,buckets)
