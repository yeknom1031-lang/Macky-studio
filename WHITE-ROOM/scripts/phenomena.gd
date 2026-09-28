extends Node3D

var room
var extra
var event_id=0
var elapsed=0.0
var actors=[]
var hands=[]
var last_looked=false
var unseen_time=0.0
var turns=0
var rain:GPUParticles3D
var source:AudioStreamPlayer3D
var acoustic_elapsed=0.0
var echo_queue=[]
var echoes_heard=0

func setup(owner_room,id:int) -> void:
	room=owner_room
	event_id=id
	if id>=16:
		extra=load("res://scripts/spatial_variations.gd").new()
		add_child(extra)
		extra.setup(room,id)
	match id:
		2:
			for i in range(5):
				var at=Vector3(-8+i*4,9+(i%2)*4,-8)
				var obj=cube(at,Vector3(2.8,2.8,2.8),room.mats.plaster)
				obj.rotation_degrees=Vector3(12*i,15*i,8*i)
				actors.append(obj)
		3:room.false_door(0,10,10)
		4:
			var mat=ShaderMaterial.new()
			mat.shader=load("res://shaders/shadow_v2.gdshader")
			var shadow=MeshInstance3D.new()
			var plane=QuadMesh.new()
			plane.size=Vector2(6,13)
			shadow.mesh=plane
			shadow.material_override=mat
			shadow.position=Vector3(-12,7,-29.25)
			shadow.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(shadow)
			actors.append(shadow)
		5:
			for i in range(7):actors.append(cube(Vector3(-21+i*7,8,-28.9),Vector3(6.85,9,0.7),room.mats.plaster))
		7:
			room.mats.floor.set_shader_parameter("wetness",0.85)
			if room.water_materials.is_empty():room.Architecture.add_water(room,Vector3(0,0.018,0),Vector2(40,40))
			make_rain()
		8:
			var face=cube(Vector3(12,5.0,-29.35),Vector3(3.1,3.1,0.18),room.mats.panel)
			for i in range(12):
				var angle=i*TAU/12
				var mark=cube(Vector3(12+sin(angle)*1.23,5+cos(angle)*1.23,-29.20),Vector3(0.035,0.13,0.025),room.mats.ink)
				mark.rotation.z=-angle
			for i in range(2):
				var pivot=Node3D.new()
				pivot.position=Vector3(12,5,-29.15+i*0.01)
				add_child(pivot)
				var hand=cube(Vector3(0,0.45-i*0.12,0),Vector3(0.045+i*0.022,0.95-i*0.25,0.025),room.mats.ink,pivot)
				hands.append(pivot)
		9:
			for i in range(14):
				var size=14.0-i*0.82
				var y=12.0+i*0.72
				for sign_value in [-1,1]:
					cube(Vector3(sign_value*size/2,y,0),Vector3(0.15,0.18,size),room.mats.panel)
					cube(Vector3(0,y,sign_value*size/2),Vector3(size,0.18,0.15),room.mats.panel)
		10:
			var red=StandardMaterial3D.new()
			red.albedo_color=Color(0.5,0.025,0.01)
			red.emission_enabled=true
			red.emission=Color(1,0.055,0.012)
			red.emission_energy_multiplier=2.8
			cube(Vector3(-15,6,-29.25),Vector3(0.06,11,0.09),red)
			var lamp=OmniLight3D.new()
			lamp.position=Vector3(-15,6,-27)
			lamp.omni_range=10
			lamp.light_color=Color(1,0.07,0.018)
			lamp.light_energy=1.5
			add_child(lamp)
		11:
			source=AudioStreamPlayer3D.new()
			source.bus="Room"
			source.stream=load("res://assets/audio/step1.wav")
			source.position=Vector3(-15,1,-12)
			source.volume_db=-19
			source.max_distance=65
			source.unit_size=18
			add_child(source)
		12:
			actors.append(cube(Vector3(0,8,-11),Vector3(12,0.8,1.8),room.mats.plaster))
		14:
			for i in range(18):
				var step=cube(Vector3(-12+i*1.1,6+i*0.5,-6),Vector3(1.07,0.25,4),room.mats.plaster)
				actors.append(step)
		15:
			for side in [0,2]:
				for x in [-20.0,-15.0,-10.0,-5.0,5.0,10.0,15.0,20.0]:room.false_door(side,x,5.5+(int(x)%3)*0.9)
	for actor in actors:actor.set_meta("rest_position",actor.position)
	room.flush()

func cube(at:Vector3,size:Vector3,mat:Material,parent:Node3D=null) -> MeshInstance3D:
	var node=MeshInstance3D.new()
	var mesh=BoxMesh.new()
	mesh.size=size
	node.mesh=mesh
	node.material_override=mat
	node.position=at
	node.gi_mode=GeometryInstance3D.GI_MODE_DYNAMIC
	(parent if parent else self).add_child(node)
	return node

func make_rain() -> void:
	rain=GPUParticles3D.new()
	rain.position=Vector3(0,12,0)
	rain.amount=900
	rain.lifetime=3.0
	rain.preprocess=2.0
	rain.visibility_aabb=AABB(Vector3(-25,-14,-25),Vector3(50,30,50))
	var process=ParticleProcessMaterial.new()
	process.emission_shape=ParticleProcessMaterial.EMISSION_SHAPE_BOX
	process.emission_box_extents=Vector3(22,0.2,22)
	process.direction=Vector3.DOWN
	process.spread=0
	process.initial_velocity_min=4
	process.initial_velocity_max=5
	process.gravity=Vector3(0,-0.3,0)
	rain.process_material=process
	var mesh=BoxMesh.new()
	mesh.size=Vector3(0.008,0.22,0.008)
	mesh.material=room.mats.panel
	rain.draw_pass_1=mesh
	add_child(rain)

func tick(delta:float,player:Node3D) -> void:
	elapsed+=delta
	if is_instance_valid(extra):extra.tick(delta)
	var t=maxf(0,elapsed-2.0)
	match event_id:
		0:
			for i in range(room.ceiling_lights.size()):
				var lamp=room.ceiling_lights[i]
				var wave=0.5+0.5*sin(t*0.48-i*0.8)
				lamp.light_energy=float(lamp.get_meta("base_energy"))*lerpf(0.08,1.0,smoothstep(0.22,0.65,wave))
		1:room.ceiling_root.position.y=-(0.5-0.5*cos(t*0.25))*7.0
		2:
			for i in range(actors.size()):
				actors[i].position=actors[i].get_meta("rest_position")+Vector3(0,sin(t*0.36+i)*1.4,0)
				actors[i].rotation.y+=delta*0.075
		4:actors[0].position.x=-15+sin(t*0.22)*12
		5:
			for i in range(actors.size()):actors[i].position.z=-28.9+sin(t*0.47+i*0.2)*0.55
		6:
			for lamp in room.ceiling_lights:lamp.light_color=Color(1,0.89,0.75).lerp(Color(0.46,0.68,1),0.5-0.5*cos(t*0.27))
		7:
			for mat in room.water_materials:mat.set_shader_parameter("phase",elapsed*2)
		8:
			for i in range(hands.size()):hands[i].rotation.z=t*(0.35 if i==0 else 0.085)
		11:
			for i in range(echo_queue.size()-1,-1,-1):
				echo_queue[i]-=delta
				if echo_queue[i]<=0:
					echo_queue.remove_at(i)
					source.position=Vector3(-16 if echoes_heard%2==0 else 16,1,-12)
					source.play()
					echoes_heard+=1
		12:
			var direction=player.camera.global_position.direction_to(actors[0].global_position)
			var looked=(-player.camera.global_basis.z).dot(direction)>0.2
			if not looked:unseen_time+=delta
			elif unseen_time>0.6:
				actors[0].rotation.y+=PI/2
				turns+=1
				unseen_time=0
		13:
			for lamp in room.ceiling_lights:
				lamp.look_at(player.global_position+Vector3(0,0.5,0),Vector3.FORWARD)
		14:
			for i in range(actors.size()):actors[i].position.y=actors[i].get_meta("rest_position").y+sin(t*0.5+i*0.35)*0.3

func suspend(paused:bool) -> void:
	if is_instance_valid(extra):extra.suspend(paused)
	if is_instance_valid(rain):rain.speed_scale=0.0 if paused else 1.0
	if is_instance_valid(source):source.stream_paused=paused

func footstep_echo() -> void:
	if event_id==11 and echo_queue.size()<4:echo_queue.append(0.9)

func has_been_seen(player:Node3D) -> bool:
	if elapsed<6:return false
	if event_id>=16:
		if event_id in [32,36,37]:return true
		if not extra.pieces.is_empty():
			var d=player.camera.global_position.direction_to(extra.pieces[0].global_position)
			return (-player.camera.global_basis.z).dot(d)>0.4
		return false
	if event_id in [0,6,7,13]:return true
	if event_id==11:return echoes_heard>0
	if event_id==12:return turns>0
	var positions={1:Vector3(0,18,0),2:Vector3(0,10,-8),3:Vector3(10,11,-29),4:Vector3(0,7,-29),5:Vector3(0,8,-29),8:Vector3(12,5,-29),9:Vector3(0,15,0),10:Vector3(-15,6,-29),14:Vector3(0,10,-6),15:Vector3(0,7,-29)}
	var direction=player.camera.global_position.direction_to(to_global(positions.get(event_id,Vector3.ZERO)))
	return (-player.camera.global_basis.z).dot(direction)>0.45

func stop_audio() -> void:
	if is_instance_valid(source):
		source.stop()
		source.stream=null
