extends Node3D

var room
var kind=16
var pieces=[]
var clock_hands=[]
var elapsed=0.0
var particles:GPUParticles3D

func box(at:Vector3,size:Vector3,material:Material=null,parent:Node3D=null) -> MeshInstance3D:
	var node=MeshInstance3D.new()
	var mesh=BoxMesh.new()
	mesh.size=size
	node.mesh=mesh
	node.material_override=material if material else room.mats.plaster
	node.position=at
	node.gi_mode=GeometryInstance3D.GI_MODE_DYNAMIC
	(parent if parent else self).add_child(node)
	return node

func pivot(at:Vector3) -> Node3D:
	var node=Node3D.new()
	node.position=at
	add_child(node)
	pieces.append(node)
	return node

func frame(parent:Node3D,size:float,mat:Material) -> void:
	for side in [-1,1]:
		box(Vector3(side*size/2,0,0),Vector3(0.16,size,0.18),mat,parent)
		box(Vector3(0,side*size/2,0),Vector3(size,0.16,0.18),mat,parent)

func ring(at:Vector3,radius:float) -> MeshInstance3D:
	var node=MeshInstance3D.new()
	var mesh=TorusMesh.new()
	mesh.inner_radius=radius-0.18
	mesh.outer_radius=radius+0.18
	mesh.rings=32
	mesh.ring_segments=8
	node.mesh=mesh
	node.material_override=room.mats.panel
	node.position=at
	add_child(node)
	pieces.append(node)
	return node

func setup(owner_room,id:int) -> void:
	room=owner_room
	kind=id
	match kind:
		16:
			var p=pivot(Vector3(-8,18,-8))
			box(Vector3(0,-4,0),Vector3(0.035,8,0.035),room.mats.metal,p)
			box(Vector3(0,-8,0),Vector3(9,0.16,0.16),room.mats.light,p)
		17:
			for i in range(3):
				var p=pivot(Vector3(-18+i*7,11,-29.25))
				box(Vector3.ZERO,Vector3(5.5,8,0.1),room.mats.light,p)
				frame(p,5.8,room.mats.metal)
		18:
			for i in range(12):pieces.append(box(Vector3(-20+i*3.5,9,-5),Vector3(3,0.12,10)))
		19:
			for i in range(7):
				var p=pivot(Vector3(0,20-i*0.15,0))
				p.rotation.x=PI/2
				frame(p,5+i*4,room.mats.panel)
		20:
			for i in range(3):
				var p=ring(Vector3(0,12+i*1.5,-10),5+i*1.7)
				p.rotation.x=i*PI/3
		21:
			for i in range(22):pieces.append(box(Vector3(-16,5+i*0.65,-29.1),Vector3(2 if i%5==0 else 0.8,0.045,0.07),room.mats.ink))
		22:
			var p=pivot(Vector3(13,8,-9))
			box(Vector3(0,5,0),Vector3(1.2,10,1.2),null,p)
		23:
			for i in range(9):
				pieces.append(box(Vector3(-20+i*5,11,0),Vector3(0.035,0.04,40),room.mats.light))
				box(Vector3(0,11,-20+i*5),Vector3(40,0.04,0.035),room.mats.light)
		24:
			for i in range(4):frame(pivot(Vector3(-13+i*8,10,-7)),7,room.mats.panel)
		25:
			for i in range(9):
				var p=pivot(Vector3(-15,12,-29.0+i*0.32))
				frame(p,13-i*0.8,room.mats.panel if i%2==0 else room.mats.seam)
		26:
			for i in range(70):pieces.append(box(Vector3(sin(i*7.12)*21,6+posmod(i*7,16),cos(i*3.9)*20),Vector3(0.035,0.65,0.035),room.mats.metal))
		27:
			for i in range(9):
				var p=pivot(Vector3(-24+i*5.5,11,-28))
				box(Vector3(2,0,0),Vector3(4,8,0.14),null,p)
		28:
			var p=pivot(Vector3(0,17,0))
			for i in range(4):
				var fin=box(Vector3.ZERO,Vector3(24,0.14,0.7),null,p)
				fin.rotation.y=i*PI/4
		29:
			for x in [-15,15]:
				for z in [-15,15]:pieces.append(box(Vector3(x,13,z),Vector3(1.1,14,1.1)))
		30:
			for side in range(4):
				var line=box(room.wall_at(side,Vector3(0,6,0.2)),Vector3(58,0.045,0.06),room.mats.light)
				line.rotation.y=-side*PI/2
				pieces.append(line)
		31:
			for i in range(4):
				var p=pivot(Vector3(-14+i*9,12,-8))
				box(Vector3.ZERO,Vector3(4,0.2,2),null,p)
				for x in [-1.7,1.7]:
					for z in [-0.7,0.7]:box(Vector3(x,1.5,z),Vector3(0.16,3,0.16),null,p)
		32:
			particles=GPUParticles3D.new()
			particles.position=Vector3(0,0.2,0)
			particles.amount=200
			particles.lifetime=14
			particles.preprocess=12
			particles.visibility_aabb=AABB(Vector3(-25,-1,-25),Vector3(50,30,50))
			var process=ParticleProcessMaterial.new()
			process.emission_shape=ParticleProcessMaterial.EMISSION_SHAPE_BOX
			process.emission_box_extents=Vector3(24,0.1,24)
			process.direction=Vector3.UP
			process.initial_velocity_min=1.4
			process.initial_velocity_max=1.8
			process.gravity=Vector3.ZERO
			particles.process_material=process
			var mesh=BoxMesh.new()
			mesh.size=Vector3(0.035,0.07,0.035)
			mesh.material=room.mats.light
			particles.draw_pass_1=mesh
			add_child(particles)
		33:
			pieces.append(box(Vector3(0,18,-28.8),Vector3(7,7,0.08),room.mats.light))
			for i in range(4):frame(pivot(Vector3(0,18,-28.6+i*0.2)),8+i*0.7,room.mats.panel)
		34:
			for i in range(10):frame(pivot(Vector3(-15+i*3.2,12,-4)),8,room.mats.panel)
		35:
			for i in range(18):pieces.append(box(Vector3(-25+i*3,13,-29.1),Vector3(0.04,16,0.06),room.mats.seam))
		36:pass # Light energy is animated without ever obscuring the exits.
		37:
			for i in range(8):pieces.append(box(Vector3(0,0.035,-22+i*6),Vector3(43,0.009,0.03),room.mats.metal))
		38:
			for i in range(5):ring(Vector3(-15+i*7,10+(i%2)*3,-8),2.8)
		39:
			for i in range(3):
				var origin=Vector3(-18+i*7,9,-29.1)
				box(origin,Vector3(4.4,4.4,0.1),room.mats.panel)
				for j in range(12):box(origin+Vector3(sin(j*TAU/12)*1.8,cos(j*TAU/12)*1.8,0.1),Vector3(0.07,0.13,0.03),room.mats.ink)
				var p=pivot(origin+Vector3(0,0,0.15))
				box(Vector3(0,0.8,0),Vector3(0.06,1.7,0.03),room.mats.ink,p)
				clock_hands.append(p)
	for p in pieces:
		p.set_meta("rest",p.position)
		p.set_meta("angle",p.rotation)

func tick(delta:float) -> void:
	elapsed+=delta
	var t=elapsed
	for i in range(pieces.size()):
		var p=pieces[i]
		var rest:Vector3=p.get_meta("rest")
		match kind:
			16:p.rotation.z=sin(t*0.28)*0.35
			18:p.position.y=rest.y+sin(t*0.4+i*0.45)*1.6
			19:p.scale=Vector3.ONE*(1.0+sin(t*0.25+i*0.6)*0.07)
			20:p.rotation.z+=delta*(0.08+i*0.025)
			21:p.position.y=5+fposmod(rest.y-5+t*0.25,15)
			22:p.rotation.z=sin(t*0.15)*0.18
			23:p.position.y=rest.y+sin(t*0.22+i*0.2)*0.4
			24:p.position.z=rest.z+sin(t*0.23+i*0.8)*8
			27:p.rotation.y=sin(t*0.27+i*0.4)*0.65
			28:p.rotation.y=t*0.035
			29:p.position.y=rest.y+sin(t*0.2+i)*0.8
			30:p.position.y=6+(0.5-0.5*cos(t*0.2))*9
			31:p.rotation.y=sin(t*0.16+i)*0.12
			34:p.rotation.y=sin(t*0.3+i*0.4)*PI/3
			35:p.position.x=rest.x+sin(t*0.38+i*0.7)*0.45
			37:p.position.z=-24+fposmod(rest.z+24+t*0.25,48)
			38:p.rotation.x=sin(t*0.2+i)*0.8
			39:p.rotation.z=t*[0.3,-0.13,0.06][i]
	if kind==36:
		for i in range(room.ceiling_lights.size()):
			var light=room.ceiling_lights[i]
			light.light_energy=float(light.get_meta("base_energy"))*(0.22+0.78*(0.5+0.5*cos(t*0.16+i*PI)))

func suspend(paused:bool) -> void:
	if is_instance_valid(particles):particles.speed_scale=0 if paused else 1
