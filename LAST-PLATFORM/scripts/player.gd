extends CharacterBody3D

signal step
var camera: Camera3D
var enabled = false
var sensitivity = 0.0021
var foot_distance = 0.0

func _ready() -> void:
	var capsule = CapsuleShape3D.new()
	capsule.radius = 0.27
	capsule.height = 1.65
	var collision = CollisionShape3D.new()
	collision.shape = capsule
	collision.position.y = 0.84
	add_child(collision)
	camera = Camera3D.new()
	camera.position.y = 1.64
	camera.fov = 76
	camera.near = 0.05
	camera.far = 110
	add_child(camera)
	camera.current = true
	floor_snap_length = 0.2

func _unhandled_input(event: InputEvent) -> void:
	if not enabled:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotation.y -= event.relative.x * sensitivity
		camera.rotation.x = clampf(camera.rotation.x - event.relative.y * sensitivity, -1.15, 1.15)

func _physics_process(delta: float) -> void:
	if not enabled:
		velocity = Vector3.ZERO
		return
	rotation.y += (float(Input.is_key_pressed(KEY_LEFT)) - float(Input.is_key_pressed(KEY_RIGHT))) * delta * 1.6
	var axis = Vector2(float(Input.is_key_pressed(KEY_D)) - float(Input.is_key_pressed(KEY_A)),
		float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP)))
	var direction = basis * Vector3(axis.x, 0, axis.y).normalized()
	var speed = 4.1 if Input.is_key_pressed(KEY_SHIFT) else 2.65
	velocity.x = move_toward(velocity.x, direction.x * speed, delta * 18)
	velocity.z = move_toward(velocity.z, direction.z * speed, delta * 18)
	velocity.y = -0.5 if is_on_floor() else velocity.y - delta * 20
	var previous = position
	move_and_slide()
	foot_distance += Vector2(position.x - previous.x, position.z - previous.z).length()
	if foot_distance > 1.5 and is_on_floor():
		foot_distance = 0.0
		step.emit()
	camera.fov = lerpf(camera.fov, 45.0 if Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT) else 76.0, delta * 9)

func spawn() -> void:
	position = Vector3(0, 0.06, 13.8)
	rotation = Vector3.ZERO
	camera.rotation = Vector3.ZERO
	velocity = Vector3.ZERO
	foot_distance = 0.0
