extends RefCounted

const TITLES=["境界ホール","列柱の間","保全区画","水鏡の間","浮遊保管庫","白い記念碑","終わりのない高さ","格子回廊","扉の保管庫"]

static func build(r) -> void:
	var height=r.ceiling_height
	# Real construction detail: plinths, recessed seams, panels, ventilation.
	for side in range(4):
		for x in [-24.0,-18.0,-12.0,-6.0,6.0,12.0,18.0,24.0]:
			if r.room_id==0 and side==3 and x==12:continue
			r.wall_box(side,Vector3(x,1.6,0.028),Vector3(5.94,3.12,0.065),"plaster")
			r.wall_box(side,Vector3(x,0.085,0.13),Vector3(5.94,0.17,0.16),"panel")
			for screw_x in [-2.83,2.83]:
				r.wall_box(side,Vector3(x+screw_x,0.3,0.068),Vector3(0.015,0.015,0.012),"metal")
		for x in [-22.0,-8.0,8.0,22.0]:
			for y in [8.5,19.5]:
				# Deep coffers, with a dark cavity and broad chamfer-like reveals.
				r.wall_box(side,Vector3(x,y,0.08),Vector3(8.4,7.5,0.12),"seam")
				r.wall_box(side,Vector3(x,y,0.12),Vector3(7.6,6.7,0.15),"plaster")
				for dx in [-4.0,4.0]:r.wall_box(side,Vector3(x+dx,y,0.46),Vector3(0.4,7.5,0.9),"panel")
				for dy in [-3.55,3.55]:r.wall_box(side,Vector3(x,y+dy,0.46),Vector3(7.7,0.4,0.9),"panel")
				r.wall_box(side,Vector3(x,y+3.27,0.62),Vector3(7.3,0.045,0.06),"warm_light")
		for x in [-18.0,18.0]:
			r.wall_box(side,Vector3(x,3.95,0.06),Vector3(2.1,0.55,0.12),"seam")
			for y in range(7):r.wall_box(side,Vector3(x,3.73+y*0.067,0.16),Vector3(2.04,0.028,0.16),"metal")
	r.flush()
	# Structure and ceiling coffers. Lights sit inside the recesses.
	r.ceiling_root=Node3D.new()
	r.add_child(r.ceiling_root)
	for x in range(-25,30,10):
		for z in range(-25,30,10):
			r.box(Vector3(x,height-0.22,z),Vector3(9.87,0.6,9.87),"plaster")
			r.box(Vector3(x,height-0.8,z-4.85),Vector3(9.9,1.45,0.28),"panel")
			r.box(Vector3(x+4.85,height-0.8,z),Vector3(0.28,1.45,9.9),"panel")
			if (x+z)%20==10:
				r.box(Vector3(x,height-0.55,z),Vector3(5.0,0.16,1.25),"seam")
				r.box(Vector3(x,height-0.65,z),Vector3(4.76,0.045,1.05),"light")
	r.flush(r.ceiling_root)
	match r.room_id:
		0:
			# Two long elevated service bridges emphasize a human-scale exit below.
			for x in [-19.0,19.0]:
				r.box(Vector3(x,12,-1),Vector3(3.4,0.8,58),"plaster")
				for z in [-20.0,0.0,20.0]:r.column(Vector3(x,0,z),Vector3(0.9,12,0.9))
		1:
			for x in [-18.0,-6.0,6.0,18.0]:
				for z in [-18.0,-6.0,6.0,18.0]:r.column(Vector3(x,0,z),Vector3(1.15,height,1.15))
		2:
			for x in [-22.0,22.0]:
				for z in range(-20,25,5):
					r.box(Vector3(x,2.5,z),Vector3(3.8,5,3.8),"plaster")
					r.solid(Vector3(x,2.5,z),Vector3(3.8,5,3.8))
					for y in range(1,5):r.box(Vector3(x, y,z+1.92),Vector3(3.6,0.025,0.04),"seam")
					r.box(Vector3(x,4.55,z+1.95),Vector3(0.08,0.12,0.025),"light")
		3:
			add_water(r,Vector3(0,0.016,0),Vector2(51,51))
			for x in [-23.0,23.0]:r.column(Vector3(x,0,0),Vector3(0.7,height,0.7))
		4:
			for x in [-16.0,0.0,16.0]:
				for z in [-16.0,0.0,16.0]:
					var cube=r.actor(Vector3(x,10+abs(x)*0.2,z),Vector3(5,5,5),"plaster")
					r.floaters.append(cube)
		5:
			r.box(Vector3(0,7,0),Vector3(12,14,12),"plaster")
			r.solid(Vector3(0,7,0),Vector3(12,14,12))
			for z in [-6.02,6.02]:r.box(Vector3(0,7,z),Vector3(0.018,13.8,0.025),"warm_light")
		6:
			for x in [-20.0,-10.0,10.0,20.0]:
				for z in [-20.0,0.0,20.0]:r.column(Vector3(x,0,z),Vector3(0.7,height,0.7))
		7:
			for z in range(-24,25,8):
				r.box(Vector3(0,7,z),Vector3(58,0.5,0.6),"plaster")
				for x in [-21.0,21.0]:r.column(Vector3(x,0,z),Vector3(0.6,7,0.6))
		8:
			for side in range(4):
				for x in [-20.0,-10.0,10.0,20.0]:r.false_door(side,x,7.5)
			add_water(r,Vector3(0,0.016,0),Vector2(42,42))
	r.flush()
	# Local, shadowed sources rather than a shadowless light across the world.
	for i in range(6):
		var pos=Vector3([-18.0,0.0,18.0][i%3],minf(height-2,24),-13 if i<3 else 13)
		var lamp=SpotLight3D.new()
		lamp.position=pos
		lamp.rotation.x=-PI/2.0
		lamp.light_color=Color(1,0.93,0.82) if i%3==0 else Color(0.87,0.94,1)
		lamp.light_energy=2.2
		lamp.light_indirect_energy=1.4
		lamp.spot_range=64
		lamp.spot_angle=47
		lamp.spot_attenuation=0.65
		lamp.light_size=0.7
		lamp.shadow_enabled=not r.preview and i in [0,2,4]
		lamp.shadow_blur=3.0
		lamp.shadow_bias=0.035
		lamp.set_meta("base_energy",lamp.light_energy)
		lamp.set_meta("base_color",lamp.light_color)
		r.add_child(lamp)
		r.ceiling_lights.append(lamp)
	for side in range(4):
		var lamp=OmniLight3D.new()
		lamp.position=r.wall_at(side,Vector3(0,3.25,1.5))
		lamp.light_color=Color(1,0.9,0.75)
		lamp.light_energy=0.42
		lamp.omni_range=7.0
		r.add_child(lamp)
		r.wall_box(side,Vector3(0,2.77,0.15),Vector3(1.7,0.06,0.22),"warm_light")
	r.flush()
	var probe=ReflectionProbe.new()
	probe.size=Vector3(61,height,61)
	probe.position.y=height/2
	probe.origin_offset=Vector3(0,-height/2+3,0)
	probe.interior=true
	probe.box_projection=true
	probe.intensity=0.7
	probe.max_distance=80
	r.add_child(probe)
	r.reflection_probe=probe

static func add_water(r,at:Vector3,size:Vector2) -> void:
	var surface=MeshInstance3D.new()
	var plane=PlaneMesh.new()
	plane.size=size
	surface.mesh=plane
	var mat=ShaderMaterial.new()
	mat.shader=load("res://shaders/water_v2.gdshader")
	surface.material_override=mat
	surface.position=at
	surface.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	r.add_child(surface)
	r.water_materials.append(mat)
	for sign_value in [-1,1]:
		r.box(at+Vector3(sign_value*size.x/2,0.005,0),Vector3(0.055,0.025,size.y),"metal")
		r.box(at+Vector3(0,0.005,sign_value*size.y/2),Vector3(size.x,0.025,0.055),"metal")
