extends MultiMeshInstance3D
## Shared drawing preserves the complete mesh and shadow of every individual medal.
var bodies: Array[RigidBody3D] = []
var sleeping_state: Array[bool] = []
var enabled := true
const HIDDEN := Transform3D(Basis(Vector3.ZERO,Vector3.ZERO,Vector3.ZERO),Vector3(0,-30,0))

func _ready() -> void:
	# Transforms are already interpolated explicitly below; do not interpolate twice.
	physics_interpolation_mode = Node.PHYSICS_INTERPOLATION_MODE_OFF
	multimesh = MultiMesh.new()
	multimesh.transform_format = MultiMesh.TRANSFORM_3D
	multimesh.mesh = preload("res://scripts/art.gd").coin_mesh()
	multimesh.custom_aabb = AABB(Vector3(-6,-4,-6),Vector3(12,12,12))

func register(body: RigidBody3D) -> void:
	bodies.append(body)
	sleeping_state.append(false)
	if bodies.size() > multimesh.instance_count:
		multimesh.instance_count = ceili(bodies.size()/256.0)*256
		for i in bodies.size(): multimesh.set_instance_transform(i,bodies[i].transform if bodies[i].visible else HIDDEN)
	multimesh.visible_instance_count = bodies.size()
	multimesh.set_instance_transform(bodies.size()-1,body.transform)

func sync_all() -> void:
	for i in bodies.size():
		var body := bodies[i]
		multimesh.set_instance_transform(i,body.transform if body.visible else HIDDEN)
		sleeping_state[i] = false

func _process(_delta: float) -> void:
	if not enabled: return
	for i in bodies.size():
		var body := bodies[i]
		var resting := body.sleeping or not body.visible
		if resting and sleeping_state[i]: continue
		multimesh.set_instance_transform(i,body.get_global_transform_interpolated() if body.visible else HIDDEN)
		sleeping_state[i] = resting
