extends RigidBody3D
## A resting stack is one aggregate body. Tilting/impact releases the actual medals.
## This avoids hundreds of unstable resting contacts without gluing the tower in place.
var medals: Array = []
var offsets: Array[Transform3D] = []
var machine: Node3D
var stack_id := 0
var radius := 0.445
var height := 1.3
var last_transform := Transform3D.IDENTITY
var released := false

func configure(owner_machine: Node3D, bodies: Array, center: Vector3, stack_radius: float, stack_height: float, identifier: int, rotation_value: Vector3 = Vector3.ZERO) -> void:
	machine = owner_machine
	medals = bodies
	radius = stack_radius
	height = stack_height
	stack_id = identifier
	position = center
	rotation = rotation_value
	mass = bodies.size()*0.032
	linear_damp = 0.30
	angular_damp = 0.55
	var material := PhysicsMaterial.new()
	material.friction = 0.43
	material.bounce = 0.0
	physics_material_override = material
	var collision := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = radius
	shape.height = height
	collision.shape = shape
	add_child(collision)
	for medal in medals:
		medal.set_meta("tower",true)
		medal.angular_damp = 1.2
		medal.physics_material_override.bounce = 0.0
		medal.physics_material_override.friction = 0.55
		offsets.append(global_transform.affine_inverse()*medal.global_transform)
		medal.freeze = true
		medal.collision_layer = 0
		medal.collision_mask = 0
		medal.set_meta("stack_id",stack_id)
		medal.set_meta("grouped",true)
	last_transform = global_transform

func _physics_process(_delta: float) -> void:
	if released or not machine.playing: return
	if not global_transform.is_equal_approx(last_transform):
		for i in medals.size():
			medals[i].global_transform = global_transform*offsets[i]
			medals[i].set_meta("stack_motion",true)
		last_transform = global_transform
	if Vector2(linear_velocity.x,linear_velocity.z).length() > 0.34 or linear_velocity.y < -1.3 or global_basis.y.dot(Vector3.UP) < 0.994:
		release_medals()

func release_medals() -> void:
	if released: return
	released = true
	collision_layer = 0
	collision_mask = 0
	for i in medals.size():
		var medal: RigidBody3D = medals[i]
		medal.global_transform = global_transform*offsets[i]
		medal.set_meta("grouped",false)
		medal.set_meta("stack_id",-1)
		medal.freeze = false
		medal.collision_layer = 1
		medal.collision_mask = 1
		medal.linear_velocity = linear_velocity+angular_velocity.cross(medal.global_position-global_position)
		medal.angular_velocity = angular_velocity
		medal.reset_physics_interpolation()
	machine.audit.tower_collapses += 1
	machine.sound.play("tower",0.85)
	machine.message.emit("TOWER BREAK  •  メダルタワー崩壊！")
	queue_free()

func snapshot() -> Dictionary:
	return {"id":stack_id,"radius":radius,"height":height,"p":machine.vec(position),"r":machine.vec(rotation),"v":machine.vec(linear_velocity),"w":machine.vec(angular_velocity)}
