extends Node3D

const Door=preload("res://scripts/door.gd")
const SYMBOLS=["∅","○","◇","△","□","∅","∅","∅","∅"]
const DIGITS={1:4,3:7,4:2}
var room_id=0
var doors=[]
var exit_door
var clue_target
var key_visual:Node3D
var key_target:StaticBody3D
var batches={}
var mats={}
var font:Font
var status_lamps=[]
var preview=false
var ceiling_lights=[]

func make(id:int,state:Dictionary,is_preview:bool=false) -> void:
	room_id=id
	preview=is_preview
	font=SystemFont.new()
	font.font_names=PackedStringArray(["Hiragino Sans","Arial"])
	for entry in [["wall",Color(0.84,0.87,0.89),0.68],["panel",Color(0.94,0.956,0.96),0.62],["seam",Color(0.58,0.65,0.68),0.82],["metal",Color(0.42,0.5,0.55),0.23],["ink",Color(0.16,0.22,0.25),0.85],["light",Color(0.92,0.98,1.0),0.28]]:
		var mat=StandardMaterial3D.new()
		mat.albedo_color=entry[1]
		mat.roughness=entry[2]
		if entry[0]=="light":
			mat.emission_enabled=true
			mat.emission=Color(0.83,0.92,1)
			mat.emission_energy_multiplier=2.2
		if entry[0]=="metal":
			mat.metallic=0.8
		mats[entry[0]]=mat
	var floor_mat=ShaderMaterial.new()
	floor_mat.shader=load("res://shaders/ceramic.gdshader")
	floor_mat.set_shader_parameter("floor_surface",true)
	floor_mat.set_shader_parameter("tint",Color(0.79,0.8,0.81))
	mats.floor=floor_mat
	box(Vector3(0,-0.2,0),Vector3(60.9,0.4,60.9),"floor")
	solid(Vector3(0,-0.2,0),Vector3(61,0.4,61))
	box(Vector3(0,26.22,0),Vector3(61,0.45,61),"wall")
	for side in range(4):
		build_wall(side)
		var door=Door.new()
		add_child(door)
		door.position=wall_at(side,Vector3.ZERO)
		door.rotation.y=-side*PI/2.0
		door.make(side)
		doors.append(door)
		label(SYMBOLS[id],wall_at(side,Vector3(1.26,1.52,0.3)),0.0038,-side*PI/2.0,Color(0.28,0.36,0.4))
		label("SECTOR",wall_at(side,Vector3(1.26,1.14,0.3)),0.0009,-side*PI/2.0)
	for x in range(-25,30,10):
		for z in range(-25,30,10):
			box(Vector3(x,25.7,z),Vector3(9.8,0.5,9.8),"wall")
			box(Vector3(x,25.15,z-4.85),Vector3(9.8,1.0,0.3),"panel")
			box(Vector3(x+4.85,25.15,z),Vector3(0.3,1.0,9.8),"panel")
			box(Vector3(x,25.39,z),Vector3(6.8,0.06,0.19),"light")
	if id in [1,4,5,7]:
		for x in [-16.0,16.0]:
			for z in [-16.0,16.0]:
				column(Vector3(x,0,z))
	# White ceiling sources, with a small number of real shadow maps.
	for p in [Vector3(-14,25,-14),Vector3(14,25,14),Vector3(-14,25,14),Vector3(14,25,-14)]:
		var light=SpotLight3D.new()
		light.position=p
		light.rotation.x=-PI/2.0
		light.light_color=Color(0.975,0.985,1.0)
		light.light_energy=0.74
		light.spot_range=58.0
		light.spot_angle=63.0
		light.spot_attenuation=0.65
		light.shadow_enabled=not is_preview and p.x<0
		light.shadow_bias=0.025
		add_child(light)
		ceiling_lights.append(light)
	if id in DIGITS:
		observation(id)
	if id==0:
		build_origin(state)
	if id==2:
		build_relay(state)
	flush()

func activate() -> void:
	preview=false
	for light in ceiling_lights:
		light.shadow_enabled=light.position.x<0

func wall_at(side:int,p:Vector3) -> Vector3:
	return Basis(Vector3.UP,-side*PI/2.0)*(Vector3(0,0,-30)+p)

func wall_box(side:int,p:Vector3,size:Vector3,mat:String) -> void:
	box(wall_at(side,p),size,mat,Basis(Vector3.UP,-side*PI/2.0))

func build_wall(side:int) -> void:
	var basis=Basis(Vector3.UP,-side*PI/2.0)
	var cuts=[Vector2(-0.83,0.83)]
	if room_id==0 and side==3:
		cuts.append(Vector2(11.17,12.83))
	var start=-30.3
	for cut in cuts:
		var width=cut.x-start
		var at=wall_at(side,Vector3(start+width/2,1.22,-0.23))
		box(at,Vector3(width,2.44,0.46),"wall",basis)
		solid(at,Vector3(width,2.44,0.46),basis)
		start=cut.y
	var remaining=30.3-start
	var end=wall_at(side,Vector3(start+remaining/2,1.22,-0.23))
	box(end,Vector3(remaining,2.44,0.46),"wall",basis)
	solid(end,Vector3(remaining,2.44,0.46),basis)
	var upper=wall_at(side,Vector3(0,14.3,-0.23))
	box(upper,Vector3(60.6,23.8,0.46),"wall",basis)
	solid(upper,Vector3(60.6,23.8,0.46),basis)
	for x in range(-30,31,6):
		wall_box(side,Vector3(x,14.4,0.012),Vector3(0.012,23.2,0.012),"seam")
	for y in [5.0,11.0,17.0,23.0]:
		wall_box(side,Vector3(0,y,0.013),Vector3(60,0.012,0.013),"seam")
	for x in [-21.0,-7.0,7.0,21.0]:
		for y in [9.0,20.0]:
			# Deep square recesses read clearly at a human viewpoint.
			wall_box(side,Vector3(x,y,0.1),Vector3(6.7,6.7,0.16),"panel")
			wall_box(side,Vector3(x,y,0.2),Vector3(5.7,5.7,0.08),"wall")
			for dx in [-3.05,3.05]:
				wall_box(side,Vector3(x+dx,y,0.26),Vector3(0.16,6.1,0.32),"panel")
			for dy in [-3.05,3.05]:
				wall_box(side,Vector3(x,y+dy,0.26),Vector3(6.1,0.16,0.32),"panel")
	wall_box(side,Vector3(0,25.3,0.3),Vector3(57,0.08,0.15),"light")

func column(at:Vector3) -> void:
	box(at+Vector3(0,13,0),Vector3(2.8,26,2.8),"panel")
	solid(at+Vector3(0,13,0),Vector3(2.8,26,2.8))
	for y in [6.0,12.0,18.0,24.0]:
		box(at+Vector3(0,y,0),Vector3(2.811,0.014,2.811),"seam")
	box(at+Vector3(0,0.08,0),Vector3(2.86,0.16,2.86),"wall")

func observation(id:int) -> void:
	var at=Vector3(9,0,-10)
	box(at+Vector3(0,0.61,0),Vector3(0.82,1.22,0.65),"panel")
	box(at+Vector3(0,1.235,0),Vector3(0.76,0.03,0.59),"metal")
	box(at+Vector3(0,1.05,0.335),Vector3(0.55,0.24,0.025),"ink")
	label(SYMBOLS[id]+"   "+str(DIGITS[id]),at+Vector3(0,1.05,0.36),0.0019,0,Color(0.87,0.94,0.96))
	label("OBSERVATION",at+Vector3(0,0.76,0.345),0.0007,0)
	clue_target=target(at+Vector3(0,0.8,0),Vector3(0.86,1.5,0.7),"clue",{"id":id})
	solid(at+Vector3(0,0.61,0),Vector3(0.82,1.22,0.65))
	# A remote human-scale object makes the huge space tangible.
	label(SYMBOLS[id],Vector3(9,1.85,-10),0.006,0)

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

func flush() -> void:
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
		add_child(node)
	batches.clear()
