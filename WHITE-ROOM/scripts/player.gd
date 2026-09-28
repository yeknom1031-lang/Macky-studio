extends CharacterBody3D

var camera: Camera3D
var enabled = false
var sensitivity = 0.11
var head_bob = false
var pitch = 0.0
var stride = 0.0
var step_distance = 0.0
var test_input = Vector2.ZERO
signal footstep(speed:float)

func _ready() -> void:
	var collider=CollisionShape3D.new()
	var capsule=CapsuleShape3D.new()
	capsule.radius=0.27
	capsule.height=1.72
	collider.shape=capsule
	collider.position.y=0.87
	add_child(collider)
	collision_layer=4
	collision_mask=1
	floor_snap_length=0.25
	camera=Camera3D.new()
	camera.position.y=1.65
	camera.near=0.045
	camera.far=210.0
	camera.fov=78.0
	add_child(camera)
	camera.current=true

func _unhandled_input(event:InputEvent) -> void:
	if enabled and event is InputEventMouseMotion and Input.mouse_mode==Input.MOUSE_MODE_CAPTURED:
		rotate_y(deg_to_rad(-event.relative.x*sensitivity))
		pitch=clampf(pitch-event.relative.y*sensitivity,-82.0,82.0)
		camera.rotation.x=deg_to_rad(pitch)

func _physics_process(delta:float) -> void:
	if not enabled:
		velocity=Vector3.ZERO
		return
	var axis=Input.get_vector("left","right","forward","back")+test_input
	if axis.length()>1.0:
		axis=axis.normalized()
	if Input.is_action_pressed("look_left"):
		rotate_y(delta*1.6)
	if Input.is_action_pressed("look_right"):
		rotate_y(-delta*1.6)
	var desired=transform.basis*Vector3(axis.x,0.0,axis.y)
	var speed=9.2 if Input.is_action_pressed("sprint") else 5.8
	velocity.x=move_toward(velocity.x,desired.x*speed,delta*32.0)
	velocity.z=move_toward(velocity.z,desired.z*speed,delta*32.0)
	velocity.y-=18.0*delta
	var previous=position
	move_and_slide()
	var moved=Vector2(position.x-previous.x,position.z-previous.z).length()
	step_distance+=moved
	stride+=moved*2.9
	if step_distance>1.9 and is_on_floor():
		step_distance=0.0
		footstep.emit(speed)
	camera.position.y=1.65+(sin(stride)*0.018 if head_bob and moved>0.005 else 0.0)
	if position.y< -8.0:
		position=Vector3(0,0.1,0)
		velocity=Vector3.ZERO

func aim_query() -> Dictionary:
	var from=camera.global_position
	var to=from-camera.global_basis.z*3.0
	var query=PhysicsRayQueryParameters3D.create(from,to,3,[get_rid()])
	return get_world_3d().direct_space_state.intersect_ray(query)
