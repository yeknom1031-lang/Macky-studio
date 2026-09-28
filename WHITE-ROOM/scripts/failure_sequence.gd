extends Node3D

var game
var stage=0
var cause=-1
var elapsed=0.0
var duration=0.0
var origin=Vector3.ZERO
var old_yaw=0.0
var old_pitch=0.0
var yaw_target=0.0
var rig:Node3D
var shade:MeshInstance3D
var shadow_material:ShaderMaterial
var slabs=[]
var floor_start=0.0
var active=false
var finished=false

func start(owner_game,level:int,death_cause:int) -> void:
	game=owner_game
	stage=level
	cause=death_cause
	elapsed=0
	finished=false
	active=true
	duration=[0.0,1.4,2.3,2.7,3.0,4.2][stage]
	origin=game.player.position
	old_yaw=game.player.rotation.y
	old_pitch=game.player.pitch
	floor_start=game.room.floor_root.position.y
	var forward=Vector3(-origin.x,0,-origin.z).normalized()
	if forward.length_squared()<0.1:forward=-game.player.basis.z
	yaw_target=atan2(-forward.x,-forward.z)
	rig=Node3D.new()
	add_child(rig)
	rig.position=origin
	rig.rotation.y=yaw_target
	if stage==2 or (stage==5 and cause==0):build_shadow()
	if stage==4 or (stage==5 and cause==2):build_slabs()

func build_shadow() -> void:
	shade=MeshInstance3D.new()
	var plane=QuadMesh.new()
	plane.size=Vector2(3.8,4.8)
	shade.mesh=plane
	shadow_material=ShaderMaterial.new()
	shadow_material.shader=load("res://shaders/threat_shadow.gdshader")
	shade.material_override=shadow_material
	shade.position=Vector3(0,2.0,-6)
	shade.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	rig.add_child(shade)

func build_slabs() -> void:
	var stone=StandardMaterial3D.new()
	stone.albedo_color=Color(0.12,0.135,0.145)
	stone.roughness=0.82
	var groove=StandardMaterial3D.new()
	groove.albedo_color=Color(0.16,0.19,0.2)
	groove.emission_enabled=true
	groove.emission=Color(0.16,0.19,0.2)
	groove.emission_energy_multiplier=0.75
	for side in [-1,1]:
		var slab=Node3D.new()
		slab.position=Vector3(side*5,0,-0.4)
		rig.add_child(slab)
		slabs.append(slab)
		box(slab,Vector3(0,5,0),Vector3(2,10,6),stone)
		for y in [1.0,3.0,7.0,9.0]:box(slab,Vector3(0,y,3.01),Vector3(1.94,0.045,0.025),groove)
		# Inward-facing inscriptions remain legible as the slabs close around us.
		var inside=-side*1.01
		for z in [-2.0,-0.8,0.4]:
			box(slab,Vector3(inside,3.5,z),Vector3(0.035,6.8,0.028),groove)
		for y in [0.7,2.2,4.9]:box(slab,Vector3(inside,y,-0.8),Vector3(0.035,0.025,2.4),groove)

func box(parent:Node3D,at:Vector3,size:Vector3,material:Material) -> void:
	var node=MeshInstance3D.new()
	var mesh=BoxMesh.new()
	mesh.size=size
	node.mesh=mesh
	node.position=at
	node.material_override=material
	node.gi_mode=GeometryInstance3D.GI_MODE_DYNAMIC
	parent.add_child(node)

func tick(delta:float) -> bool:
	if not active or finished:return false
	elapsed=minf(elapsed+delta,duration)
	var t=elapsed/duration
	game.player.rotation.y=lerp_angle(old_yaw,yaw_target,smoothstep(0,0.28,t))
	game.player.camera.rotation.x=lerpf(deg_to_rad(old_pitch),deg_to_rad(-7.0),smoothstep(0,0.28,t))
	var release=1.0-smoothstep(0.68,1.0,t) if stage<5 else 1.0
	if is_instance_valid(shade):
		var approach=smoothstep(0.18,0.94,t)
		shade.position.z=lerpf(-6,-0.12 if stage==5 else -2.1,approach)
		shade.scale=Vector3.ONE*(1.0+approach*0.35)
		shadow_material.set_shader_parameter("phase",elapsed)
		shadow_material.set_shader_parameter("opacity",smoothstep(0.0,0.25,t)*release)
	if stage==3 or (stage==5 and cause==1):
		var drop=(17.0*pow(smoothstep(0.28,1.0,t),2)) if stage==5 else (0.72*sin(PI*t))
		game.room.floor_root.position.y=floor_start-drop
		game.player.position.y=origin.y-drop
		game.player.camera.rotation.x=deg_to_rad(-7-32*smoothstep(0.3,0.8,t))
	if not slabs.is_empty():
		var progress=smoothstep(0.2,0.94,t) if stage==5 else sin(PI*t)
		var distance=lerpf(5.0,1.025 if stage==5 else 1.9,progress)
		slabs[0].position.x=-distance
		slabs[1].position.x=distance
	if elapsed>=duration:
		finished=true
		return true
	return false

func reset(restore_pose:bool=true) -> void:
	active=false
	if is_instance_valid(game) and is_instance_valid(game.room):
		game.room.floor_root.position.y=floor_start
		if restore_pose:
			game.player.position=origin
			game.player.rotation.y=old_yaw
			game.player.pitch=old_pitch
			game.player.camera.rotation.x=deg_to_rad(old_pitch)
	if is_instance_valid(rig):
		remove_child(rig)
		rig.queue_free()
	slabs.clear()
	shade=null
