extends Node3D
const A = preload("res://scripts/art.gd")
var floor_bar: Node3D
var side_bars: Array[Node3D] = []
var handle: Node3D
var stem: Node3D

func _ready() -> void:
	set_meta("dynamic",true)
	floor_bar = A.box(self,Vector3.ZERO,Vector3.ONE,A.steel())
	for i in 2: side_bars.append(A.box(self,Vector3.ZERO,Vector3.ONE,A.chrome()))
	A.cylinder(self,Vector3(0,-0.09,0),0.15,0.17,A.chrome())
	A.ring(self,Vector3(0,-0.02,0),0.14,0.015,A.dark())
	A.box(self,Vector3(0,0.11,0.09),Vector3(0.20,0.28,0.075),A.chrome())
	A.box(self,Vector3(0,0.11,0.133),Vector3(0.043,0.215,0.008),A.dark())
	stem = A.box(self,Vector3.ZERO,Vector3.ONE,A.chrome())
	handle = Node3D.new()
	add_child(handle)
	A.ball_visual(handle,0.108,Color("18212a"))
	A.ring(handle,Vector3(0,-0.05,0),0.091,0.007,A.chrome())

func configure(start: Vector3, end: Vector3, angle: float) -> void:
	position = start
	var to := end-start
	var lateral := to.cross(Vector3.UP).normalized()
	align(floor_bar,Vector3.ZERO,to,0.05,0.018)
	for i in 2:
		var offset := lateral*(-0.030 if i == 0 else 0.030)+Vector3(0,0.023,0)
		align(side_bars[i],offset,to+offset,0.013,0.046)
	handle.position = Vector3(angle*0.27,-0.12,0.37)
	align(stem,Vector3(0,-0.09,0),handle.position,0.035,0.035)

func align(part: Node3D, from: Vector3, to: Vector3, width: float, height: float) -> void:
	part.position = (from+to)*0.5
	part.basis = Basis.looking_at((to-from).normalized(),Vector3.UP)
	part.get_child(0).scale = Vector3(width,height,(to-from).length())
