extends Node3D

var side=0
var is_exit=false
var hinge:Node3D
var slab:MeshInstance3D
var barrier:StaticBody3D
var knob:Node3D
var frame:Node3D
var concealed=false
var openness=0.0

func make(p_side:int,exit_door:bool=false) -> void:
	side=p_side
	is_exit=exit_door
	var paint=StandardMaterial3D.new()
	paint.albedo_color=Color(0.9,0.925,0.935)
	paint.roughness=0.63
	var wood=ShaderMaterial.new()
	wood.shader=load("res://shaders/wood.gdshader")
	var metal=StandardMaterial3D.new()
	metal.albedo_color=Color(0.45,0.51,0.55)
	metal.metallic=0.85
	metal.roughness=0.2
	frame=Node3D.new()
	add_child(frame)
	for x in [-0.77,0.77]:
		block(frame,Vector3(x,1.18,0.015),Vector3(0.09,2.36,0.15),paint)
	block(frame,Vector3(0,2.38,0.015),Vector3(1.63,0.1,0.15),paint)
	hinge=Node3D.new()
	hinge.position.x=-0.68
	add_child(hinge)
	slab=block(hinge,Vector3(0.68,1.16,0),Vector3(1.36,2.32,0.075),wood)
	knob=Node3D.new()
	knob.position=Vector3(1.15,1.04,0.05)
	hinge.add_child(knob)
	for z in [0.08,-0.18]:
		var sphere=MeshInstance3D.new()
		var mesh=SphereMesh.new()
		mesh.radius=0.057
		mesh.height=0.114
		mesh.radial_segments=20
		mesh.rings=10
		sphere.mesh=mesh
		sphere.material_override=metal
		sphere.position.z=z
		knob.add_child(sphere)
	block(knob,Vector3(0,0,-0.055),Vector3(0.06,0.065,0.24),metal)
	for y in [0.3,1.18,2.04]:
		block(hinge,Vector3(0,y,0.065),Vector3(0.06,0.14,0.05),metal)
	barrier=StaticBody3D.new()
	barrier.collision_layer=3
	barrier.collision_mask=0
	barrier.set_meta("action","exit" if is_exit else "door")
	barrier.set_meta("side",side)
	var shape=CollisionShape3D.new()
	var box=BoxShape3D.new()
	box.size=Vector3(1.48,2.4,0.18)
	shape.shape=box
	shape.position.y=1.2
	barrier.add_child(shape)
	add_child(barrier)

func set_hidden(value:bool) -> void:
	concealed=value
	frame.visible=not value
	knob.visible=not value
	barrier.set_meta("action","sealed" if value else ("exit" if is_exit else "door"))

func set_open(value:float) -> void:
	openness=clampf(value,0.0,1.0)
	hinge.rotation.y=deg_to_rad(88.0)*openness
	knob.rotation.z=-0.42*sin(openness*PI)
	barrier.collision_layer=0 if openness>0.55 else 3

func preview_entrance() -> void:
	hinge.visible=false
	barrier.collision_layer=0

func block(parent:Node3D,at:Vector3,size:Vector3,material:Material) -> MeshInstance3D:
	var node=MeshInstance3D.new()
	var mesh=BoxMesh.new()
	mesh.size=size
	node.mesh=mesh
	node.material_override=material
	node.position=at
	parent.add_child(node)
	return node
