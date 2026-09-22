extends Node3D
const A = preload("res://scripts/art.gd")
var floor_bar: Node3D
var side_bars: Array[Node3D] = []
var handle: Node3D
var stem: Node3D
var selected_ring: MeshInstance3D
var dial_pointer: Node3D

func _ready() -> void:
	set_meta("dynamic",true)
	floor_bar = A.box(self,Vector3.ZERO,Vector3.ONE,A.steel())
	for i in 2: side_bars.append(A.box(self,Vector3.ZERO,Vector3.ONE,A.chrome()))
	A.cylinder(self,Vector3(0,-0.09,0),0.15,0.17,A.chrome())
	A.ring(self,Vector3(0,-0.02,0),0.14,0.015,A.dark())
	# Engraved mechanical angle scale; no floating aim line or impact prediction.
	A.cylinder(self,Vector3(0,-0.24,0.29),0.24,0.028,A.dark())
	var marks := Node3D.new()
	add_child(marks)
	for i in 9:
		var a := lerpf(-0.85,0.85,i/8.0)
		var mark := A.box(marks,Vector3(sin(a)*0.21,-0.222,0.29+cos(a)*0.21),Vector3(0.010,0.006,0.037 if i%2 == 0 else 0.021),A.chrome())
		mark.rotation.y = a
	A.batch_static(marks,[])
	dial_pointer = A.box(self,Vector3.ZERO,Vector3(0.020,0.01,0.09),A.gold())
	A.box(self,Vector3(0,0.11,0.09),Vector3(0.20,0.28,0.075),A.chrome())
	A.box(self,Vector3(0,0.11,0.133),Vector3(0.043,0.215,0.008),A.dark())
	stem = A.box(self,Vector3.ZERO,Vector3.ONE,A.chrome())
	handle = Node3D.new()
	add_child(handle)
	A.ball_visual(handle,0.108,Color("18212a"))
	A.ring(handle,Vector3(0,-0.05,0),0.091,0.007,A.chrome())
	selected_ring = A.ring(handle,Vector3(0,0.01,0),0.109,0.009,A.mat("selected_rail",Color("f4cd7c"),0.2,0.28,1.4))
	selected_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	selected_ring.visible = false

func set_selected(value: bool) -> void:
	selected_ring.visible = value

func configure(start: Vector3, end: Vector3, angle: float) -> void:
	position = start
	var to := end-start
	var lateral := to.cross(Vector3.UP).normalized()
	align(floor_bar,Vector3.ZERO,to,0.05,0.018)
	for i in 2:
		var offset := lateral*(-0.030 if i == 0 else 0.030)+Vector3(0,0.023,0)
		align(side_bars[i],offset,to+offset,0.013,0.046)
	handle.position = Vector3(angle*0.27,-0.12,0.37)
	var dial_angle := angle*0.85
	dial_pointer.position = Vector3(sin(dial_angle)*0.16,-0.211,0.29+cos(dial_angle)*0.16)
	dial_pointer.rotation.y = dial_angle
	align(stem,Vector3(0,-0.09,0),handle.position,0.035,0.035)

func align(part: Node3D, from: Vector3, to: Vector3, width: float, height: float) -> void:
	part.position = (from+to)*0.5
	part.basis = Basis.looking_at((to-from).normalized(),Vector3.UP)
	part.get_child(0).scale = Vector3(width,height,(to-from).length())
