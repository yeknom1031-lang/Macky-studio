extends Node3D
## A perforated collision mesh: prizes require a ball to fall through a real hole.
const A = preload("res://scripts/art.gd")
const COLORS := [Color("227da1"),Color("ae2945"),Color("208568"),Color("a73394"),Color("d2a342")]
var pockets: Array[Dictionary] = []
var track_rings: Array[MeshInstance3D] = []
var shutters: Array[Node3D] = []
var stages := 1
var active_stage := 0
var hole_radius := 0.225
var radii: Array[float] = [0.89]
var flash_clock := 0.0
var last_hit := -1

func build(tower: bool) -> void:
	stages = 3 if tower else 1
	radii.assign([1.22,0.73,0.31] if tower else [0.89])
	var points := PackedVector2Array()
	var outer := 1.52 if tower else 1.42
	for i in 128:
		var angle := TAU*i/128.0
		points.append(Vector2(sin(angle),cos(angle))*outer)
	for stage in stages:
		var radius: float = [0.18,0.15,0.103][stage] if tower else 0.225
		for index in 5:
			var angle := TAU*(index+0.5)/5.0 + stage*0.33
			var center: Vector2 = Vector2(sin(angle),cos(angle))*radii[stage]
			pockets.append({"center":center,"radius":radius,"stage":stage,"index":index})
			for i in 32:
				var t := TAU*i/32.0
				points.append(center+Vector2(sin(t),cos(t))*radius)
			var pos := Vector3(center.x,0.004,center.y)
			A.ring(self,pos,radius+0.014,0.014,A.mat("socket%d"%index,COLORS[index],0.68,0.23))
			A.ring(self,pos+Vector3(0,-0.065,0),radius-0.002,0.009,A.chrome())
			# Black catch cup is well below the physical floor: the opening is empty.
			A.cylinder(self,pos+Vector3(0,-0.25,0),radius*0.93,0.028,A.dark())
			var shutter := AnimatableBody3D.new()
			shutter.sync_to_physics = false
			add_child(shutter)
			shutter.position = pos+Vector3(0,-0.24,0)
			shutter.set_meta("dynamic",true)
			shutter.set_meta("stage",stage)
			shutter.collision_layer = 4
			shutter.collision_mask = 4
			var lid_shape := CylinderShape3D.new()
			lid_shape.radius = radius
			lid_shape.height = 0.025
			var lid_collision := CollisionShape3D.new()
			lid_collision.shape = lid_shape
			shutter.add_child(lid_collision)
			A.cylinder(shutter,Vector3.ZERO,radius*0.98,0.024,A.chrome())
			shutters.append(shutter)
			if stage == 0:
				var text_pos := Vector3(sin(angle)*(radii[stage]-radius-0.12),0.014,cos(angle)*(radii[stage]-radius-0.12))
				var caption: String = ["20","40","80","BALL","JP"][index]
				if not tower and index == 2: caption = "80 + ×2"
				var text := A.label(self,caption,text_pos,27 if not tower else 22,Color("ffe2a5"))
				text.rotation.x = -PI/2
	# Delaunay triangulation joins the boundary loops; internal hole triangles are removed.
	var indices := Geometry2D.triangulate_delaunay(points)
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in range(0,indices.size(),3):
		var a: Vector2 = points[indices[i]]
		var b: Vector2 = points[indices[i+1]]
		var c: Vector2 = points[indices[i+2]]
		var center := (a+b+c)/3.0
		var open := false
		for pocket in pockets:
			if center.distance_to(pocket.center) < pocket.radius*0.995:
				open = true
				break
		if open: continue
		var va := Vector3(a.x,0,a.y)
		var vb := Vector3(b.x,0,b.y)
		var vc := Vector3(c.x,0,c.y)
		if (vb-va).cross(vc-va).y > 0:
			var swap := vb
			vb = vc
			vc = swap
		for v in [va,vb,vc]:
			surface.set_normal(Vector3.UP)
			surface.set_uv(Vector2(v.x,v.z)*0.3)
			surface.add_vertex(v)
	surface.index()
	var mesh := surface.commit()
	var face := MeshInstance3D.new()
	face.mesh = mesh
	face.material_override = A.mat("roulette_floor",Color("382b27"),0.58,0.30)
	add_child(face)
	var body := StaticBody3D.new()
	add_child(body)
	body.collision_layer = 4
	body.collision_mask = 4
	var collision := CollisionShape3D.new()
	collision.shape = mesh.create_trimesh_shape()
	body.add_child(collision)
	var material := PhysicsMaterial.new()
	material.friction = 0.14
	material.bounce = 0.20
	body.physics_material_override = material
	var glass := A.mat("roulette_guard",Color(0.8,0.9,1,0.055),0.08,0.15)
	glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	guard(outer,0.24,glass)
	A.ring(self,Vector3(0,-0.045,0),outer,0.045,A.gold())
	A.ring(self,Vector3(0,-0.16,0),outer-0.01,0.03,A.chrome())
	A.ring(self,Vector3(0,0.26,0),outer,0.018,A.chrome())
	if tower:
		for radius in [1.0,0.5]:
			guard(radius,0.10,glass)
			A.ring(self,Vector3(0,0.012,0),radius,0.018,A.gold())
		for radius in [1.47,0.96,0.47]:
			var ring := A.ring(self,Vector3(0,0.02,0),radius,0.012,A.gold())
			ring.set_meta("dynamic",true)
			track_rings.append(ring)
	# Central lit spindle leaves room for all of the openings.
	A.cylinder(self,Vector3(0,0.04,0),0.10 if tower else 0.17,0.11,A.gold())
	var jewel := A.ball_visual(self,0.063 if tower else 0.12,Color("fff1c5"))
	jewel.position.y = 0.14 if tower else 0.21
	set_stage(0)

func guard(radius: float, height: float, material: Material) -> void:
	var body := StaticBody3D.new()
	add_child(body)
	body.collision_layer = 4
	body.collision_mask = 4
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 96
	mesh.cap_top = false
	mesh.cap_bottom = false
	var visual := MeshInstance3D.new()
	visual.mesh = mesh
	visual.material_override = material
	visual.position.y = height/2
	add_child(visual)
	for i in 64:
		var angle := TAU*i/64.0
		var collision := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = Vector3(radius*TAU/64*1.02,height,0.014)
		collision.shape = shape
		collision.position = Vector3(sin(angle)*radius,height/2,cos(angle)*radius)
		collision.rotation.y = angle
		body.add_child(collision)

func set_stage(stage: int) -> void:
	active_stage = clampi(stage,0,stages-1)
	for i in track_rings.size():
		track_rings[i].material_override = A.mat("ring_stage%d_%d"%[i,active_stage],Color("eac475") if i == active_stage else Color("665b45"),0.65,0.25,1.2 if i == active_stage else 0.0)

func ball_radius() -> float:
	return 0.085 if stages == 3 else 0.105

func set_shutters(open_amount: float) -> void:
	for shutter in shutters:
		var opened := open_amount if shutter.get_meta("stage") == active_stage else 1.0
		shutter.position.y = lerpf(-0.015,-0.24,opened)

func launch_position() -> Vector3:
	var angle := PI/2+0.08+active_stage*0.33
	return Vector3(sin(angle)*radii[active_stage],ball_radius()+0.02,cos(angle)*radii[active_stage])

func hit_index(local_position: Vector3) -> int:
	if local_position.y >= -0.085: return -1
	var pos := Vector2(local_position.x,local_position.z)
	for pocket in pockets:
		if pocket.stage == active_stage and pos.distance_to(pocket.center) < pocket.radius*1.2:
			return pocket.index
	return -1

func guide_force(local_position: Vector3, clock: float) -> Vector3:
	# The shallow circular track centers the ball radially, never toward a chosen prize.
	var radial := Vector3(local_position.x,0,local_position.z)
	var correction: float = radii[active_stage]-radial.length()
	var force: Vector3 = radial.normalized()*correction*0.24
	if clock > 7.0:
		# Mechanical vibration prevents a ball resting between pockets indefinitely.
		force += Vector3(radial.z,0,-radial.x).normalized()*0.008
	return force
