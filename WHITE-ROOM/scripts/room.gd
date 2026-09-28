extends Node3D

const Door=preload("res://scripts/door.gd")
const Catalog=preload("res://scripts/anomaly_catalog.gd")
const Architecture=preload("res://scripts/architecture.gd")
const Phenomena=preload("res://scripts/phenomena.gd")
const SYMBOLS=["∅","○","◇","△","□","∅","∅","∅","∅"]
const Puzzles=preload("res://scripts/puzzle_catalog.gd")
const DIGITS={1:4,3:7,4:2}
var room_id=0
var doors=[]
var exit_door
var clue_target
var observation_display:Label3D
var saved_state={}
var key_visual:Node3D
var key_target:StaticBody3D
var batches={}
var mats={}
var font:Font
var status_lamps=[]
var preview=false
var ceiling_lights=[]
var ceiling_height=26.0
var ceiling_root:Node3D
var reflection_probe:ReflectionProbe
var event_id=0
var elapsed=0.0
var phenomenon
var floaters=[]
var water_materials=[]

func make(id:int,state:Dictionary,is_preview:bool=false) -> void:
	room_id=id
	saved_state=state
	preview=is_preview
	Catalog.ensure(state)
	event_id=Catalog.peek(state) if is_preview else int(state.current_event)
	ceiling_height=44.0 if id==6 else 26.0
	font=SystemFont.new()
	font.font_names=PackedStringArray(["Hiragino Sans","Arial"])
	for entry in [["wall",Color(0.63,0.65,0.66),0.74],["panel",Color(0.84,0.84,0.80),0.48],["seam",Color(0.18,0.22,0.23),0.82],["metal",Color(0.32,0.36,0.37),0.27],["ink",Color(0.08,0.13,0.15),0.85],["light",Color(0.87,0.94,1.0),0.28],["warm_light",Color(1.0,0.87,0.66),0.28]]:
		var mat=StandardMaterial3D.new()
		mat.albedo_color=entry[1]
		mat.roughness=entry[2]
		if "light" in entry[0]:
			mat.emission_enabled=true
			mat.emission=entry[1]
			mat.emission_energy_multiplier=3.0
		if entry[0]=="metal":mat.metallic=0.85
		mats[entry[0]]=mat
	mats.floor=surface_material("ivory-terrazzo-v2.png",Color(0.94,0.94,0.93),0.3,0.44,true)
	mats.plaster=surface_material("chalk-concrete-v2.png",Color(0.86,0.87,0.85),0.64,0.5)
	box(Vector3(0,-0.25,0),Vector3(61,0.5,61),"floor")
	solid(Vector3(0,-0.25,0),Vector3(61,0.5,61))
	box(Vector3(0,ceiling_height+0.3,0),Vector3(61,0.6,61),"plaster")
	for side in range(4):
		build_wall(side)
		var door=Door.new()
		add_child(door)
		door.position=wall_at(side,Vector3.ZERO)
		door.rotation.y=-side*PI/2.0
		door.make(side)
		doors.append(door)
		label(SYMBOLS[id],wall_at(side,Vector3(1.26,1.52,0.3)),0.0038,-side*PI/2.0,Color(0.12,0.18,0.20))
		label("SECTOR / %02d"%id,wall_at(side,Vector3(1.26,1.14,0.3)),0.0009,-side*PI/2.0)
	flush()
	Architecture.build(self)
	if id in DIGITS or (state.get("campaign",false) and id>0):observation(id)
	if id==0:build_origin(state)
	if id==2:build_relay(state)
	flush()
	phenomenon=Phenomena.new()
	add_child(phenomenon)
	phenomenon.setup(self,event_id)
	if event_id==1:
		for part in ceiling_root.get_children():
			if part is GeometryInstance3D:part.gi_mode=GeometryInstance3D.GI_MODE_DYNAMIC

func surface_material(file:String,tint:Color,roughness:float,scale_value:float,is_floor:bool=false) -> ShaderMaterial:
	var mat=ShaderMaterial.new()
	mat.shader=load("res://shaders/surface_v2.gdshader")
	mat.set_shader_parameter("surface_texture",load("res://assets/materials/"+file))
	mat.set_shader_parameter("tint",tint)
	mat.set_shader_parameter("roughness_base",roughness)
	mat.set_shader_parameter("texture_scale",scale_value)
	mat.set_shader_parameter("floor_surface",is_floor)
	return mat

func activate() -> void:
	preview=false
	for i in range(ceiling_lights.size()):ceiling_lights[i].shadow_enabled=i in [0,2,4]
	if is_instance_valid(reflection_probe):reflection_probe.update_mode=ReflectionProbe.UPDATE_ONCE

func tick(delta:float,player:Node3D) -> void:
	elapsed+=delta
	phenomenon.tick(delta,player)
	for i in range(floaters.size()):
		var f=floaters[i]
		f.position.y=float(f.get_meta("rest_y"))+sin(elapsed*0.24+i)*0.6
		f.rotation.y=sin(elapsed*0.12+i)*0.09
	for mat in water_materials:mat.set_shader_parameter("phase",elapsed*0.4)

func suspend(paused:bool) -> void:
	if is_instance_valid(phenomenon):phenomenon.suspend(paused)

func _exit_tree() -> void:
	if is_instance_valid(phenomenon):phenomenon.stop_audio()

func wall_at(side:int,p:Vector3) -> Vector3:
	return Basis(Vector3.UP,-side*PI/2.0)*(Vector3(0,0,-30)+p)

func wall_box(side:int,p:Vector3,size:Vector3,mat:String) -> void:
	box(wall_at(side,p),size,mat,Basis(Vector3.UP,-side*PI/2.0))

func build_wall(side:int) -> void:
	var basis=Basis(Vector3.UP,-side*PI/2.0)
	var cuts=[Vector2(-0.83,0.83)]
	if room_id==0 and side==3:cuts.append(Vector2(11.17,12.83))
	var start=-30.3
	for cut in cuts:
		var width=cut.x-start
		var at=wall_at(side,Vector3(start+width/2,1.22,-0.35))
		box(at,Vector3(width,2.44,0.7),"plaster",basis)
		solid(at,Vector3(width,2.44,0.7),basis)
		start=cut.y
	var remaining=30.3-start
	var end=wall_at(side,Vector3(start+remaining/2,1.22,-0.35))
	box(end,Vector3(remaining,2.44,0.7),"plaster",basis)
	solid(end,Vector3(remaining,2.44,0.7),basis)
	var upper=wall_at(side,Vector3(0,(ceiling_height+2.44)/2,-0.35))
	box(upper,Vector3(60.6,ceiling_height-2.44,0.7),"plaster",basis)
	solid(upper,Vector3(60.6,ceiling_height-2.44,0.7),basis)

func column(at:Vector3,size:Vector3=Vector3(2.8,26,2.8)) -> void:
	box(at+Vector3(0,size.y/2,0),size,"plaster")
	solid(at+Vector3(0,size.y/2,0),size)
	for y in range(6,int(size.y),6):box(at+Vector3(0,y,0),Vector3(size.x+0.015,0.018,size.z+0.015),"seam")
	box(at+Vector3(0,0.08,0),Vector3(size.x+0.12,0.16,size.z+0.12),"panel")

func actor(at:Vector3,size:Vector3,mat:String) -> MeshInstance3D:
	var node=MeshInstance3D.new()
	var mesh=BoxMesh.new()
	mesh.size=size
	node.mesh=mesh
	node.material_override=mats[mat]
	node.position=at
	node.set_meta("rest_y",at.y)
	node.gi_mode=GeometryInstance3D.GI_MODE_DYNAMIC
	add_child(node)
	return node

func false_door(side:int,x:float,y:float) -> void:
	var door=Door.new()
	add_child(door)
	door.position=wall_at(side,Vector3(x,y,0.16))
	door.rotation.y=-side*PI/2
	door.make(side)
	# Unreachable, decorative closed doors never join the traversal system.
	door.barrier.collision_layer=0
	door.barrier.remove_meta("action")

func observation(id:int) -> void:
	var at=Vector3(9,0,-10)
	box(at+Vector3(0,0.61,0),Vector3(0.82,1.22,0.65),"panel")
	box(at+Vector3(0,1.235,0),Vector3(0.76,0.03,0.59),"metal")
	box(at+Vector3(0,1.05,0.335),Vector3(0.55,0.24,0.025),"ink")
	observation_display=label(observation_text(id),at+Vector3(0,1.05,0.36),0.0019,0,Color(0.87,0.94,0.96))
	label("OBSERVATION",at+Vector3(0,0.76,0.345),0.0007,0)
	clue_target=target(at+Vector3(0,0.8,0),Vector3(0.86,1.5,0.7),"station" if saved_state.get("campaign",false) else "clue",{"id":id})
	solid(at+Vector3(0,0.61,0),Vector3(0.82,1.22,0.65))
	# A remote human-scale object makes the huge space tangible.
	label("%02d / %s"%[id,SYMBOLS[id]],Vector3(9,1.85,-10),0.0035,0)

func build_origin(state:Dictionary) -> void:
	box(Vector3(-2.1,1.28,-29.79),Vector3(0.72,0.94,0.14),"panel")
	label("○   △   □",Vector3(-2.1,1.51,-29.69),0.00105,0)
	label("BOUNDARY / 00",Vector3(-2.1,1.68,-29.69),0.00072,0)
	label("—   —   —",Vector3(-2.1,1.34,-29.68),0.0011,0)
	for x in [-0.17,0.0,0.17]:
		for y in [1.02,1.12,1.22]:
			box(Vector3(-2.1+x,y,-29.692),Vector3(0.12,0.065,0.035),"metal")
	target(Vector3(-2.1,1.3,-29.69),Vector3(0.78,1.1,0.3),"cipher")
	key_visual=Node3D.new()
	key_visual.position=Vector3(-2.1,0.87,-29.49)
	add_child(key_visual)
	var gold=StandardMaterial3D.new()
	gold.albedo_color=Color(0.48,0.61,0.65)
	gold.metallic=0.85
	gold.roughness=0.24
	var ring=MeshInstance3D.new()
	var torus=TorusMesh.new()
	torus.inner_radius=0.025
	torus.outer_radius=0.045
	ring.mesh=torus
	ring.material_override=gold
	ring.rotation.x=PI/2
	key_visual.add_child(ring)
	var stem=MeshInstance3D.new()
	var mesh=BoxMesh.new()
	mesh.size=Vector3(0.02,0.17,0.025)
	stem.mesh=mesh
	stem.position.y=-0.1
	stem.material_override=gold
	key_visual.add_child(stem)
	key_visual.visible=bool(state.cipher) and not bool(state.key)
	key_target=target(Vector3(-2.1,0.89,-29.42),Vector3(0.45,0.32,0.3),"key")
	key_target.collision_layer=2 if key_visual.visible else 0
	box(Vector3(-4,1.3,-29.83),Vector3(0.72,0.52,0.08),"panel")
	label("00  /  ORIGIN",Vector3(-4,1.39,-29.76),0.0008,0)
	label("○  →  △  →  □",Vector3(-4,1.22,-29.76),0.00075,0)
	target(Vector3(-4,1.3,-29.7),Vector3(0.76,0.6,0.25),"record")
	exit_door=Door.new()
	add_child(exit_door)
	exit_door.position=wall_at(3,Vector3(12,0,0))
	exit_door.rotation.y=-3*PI/2
	exit_door.make(3,true)
	exit_door.set_hidden(not bool(state.powered))
	if state.powered:
		label("BOUNDARY",wall_at(3,Vector3(13.1,1.4,0.28)),0.001,-3*PI/2)

func build_relay(state:Dictionary) -> void:
	var at=Vector3(-2.3,1.25,-29.8)
	box(at,Vector3(1.06,0.85,0.17),"panel")
	label("◇   /   CIRCUIT",at+Vector3(0,0.26,0.1),0.0012,0)
	label("○   △   □   ◇",at+Vector3(0,0.01,0.1),0.0012,0)
	label("○ → □ → △",at+Vector3(0,-0.24,0.1),0.0013,0)
	target(at+Vector3(0,0,0.13),Vector3(1.1,0.95,0.32),"relay")
	label("BOUNDARY / RESTORE",Vector3(-4,1.4,-29.75),0.0009,0)

func target(at:Vector3,size:Vector3,action:String,metadata:Dictionary={}) -> StaticBody3D:
	var body=StaticBody3D.new()
	body.collision_layer=2
	body.collision_mask=0
	body.position=at
	body.set_meta("action",action)
	for key in metadata:
		body.set_meta(key,metadata[key])
	var shape=CollisionShape3D.new()
	var cube=BoxShape3D.new()
	cube.size=size
	shape.shape=cube
	body.add_child(shape)
	add_child(body)
	return body

func solid(at:Vector3,size:Vector3,basis:Basis=Basis.IDENTITY) -> void:
	var body=StaticBody3D.new()
	body.collision_layer=1
	body.collision_mask=0
	body.transform=Transform3D(basis,at)
	var shape=CollisionShape3D.new()
	var cube=BoxShape3D.new()
	cube.size=size
	shape.shape=cube
	body.add_child(shape)
	add_child(body)

func label(text:String,at:Vector3,pixel_size:float,yaw:float,color:Color=Color(0.22,0.31,0.35)) -> Label3D:
	var node=Label3D.new()
	node.text=text
	node.font=font
	node.font_size=96
	node.pixel_size=pixel_size
	node.modulate=color
	node.outline_size=0
	node.position=at
	node.rotation.y=yaw
	node.no_depth_test=false
	add_child(node)
	return node

func box(at:Vector3,size:Vector3,material:String,basis:Basis=Basis.IDENTITY) -> void:
	if not batches.has(material):
		batches[material]=[]
	batches[material].append(Transform3D(basis*Basis.from_scale(size),at))

func flush(parent:Node3D=null) -> void:
	for key in batches:
		var mm=MultiMesh.new()
		mm.transform_format=MultiMesh.TRANSFORM_3D
		var mesh=BoxMesh.new()
		mesh.size=Vector3.ONE
		mm.mesh=mesh
		mm.instance_count=batches[key].size()
		for i in range(mm.instance_count):
			mm.set_instance_transform(i,batches[key][i])
		var node=MultiMeshInstance3D.new()
		node.multimesh=mm
		node.material_override=mats[key]
		(parent if parent else self).add_child(node)
	batches.clear()

func observation_text(id:int) -> String:
	if saved_state.get("campaign",false) and not id in saved_state.solved_stations:return "CAL / —"
	return SYMBOLS[id]+"   "+str(Puzzles.digit(saved_state,id)) if id in DIGITS else "CAL / OK"
