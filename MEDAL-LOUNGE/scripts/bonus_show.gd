extends Node3D
## Cabinet-mounted light and result display; never changes physics or reward odds.
const A = preload("res://scripts/art.gd")
var machine: Node3D
var light_material: ShaderMaterial
var winner: MeshInstance3D
var sign_title: Label3D
var sign_detail: Label3D
var clock := 0.0
var result_left := 0.0
var mode := "idle"
var winner_color := Color("e6c277")
var jackpot_show := false
var base_fov := 40.0

func setup(m: Node3D) -> void:
	machine = m
	set_meta("dynamic",true)
	base_fov = m.camera.fov
	light_material = ShaderMaterial.new()
	light_material.shader = load("res://shaders/roulette_marquee.gdshader")
	var halo := A.ring(self,m.ROULETTE_CENTER+Vector3(0,0.30,0),1.56 if m.kind == 1 else 1.46,0.018,light_material)
	halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	winner = A.ring(self,Vector3.ZERO,0.24,0.020,A.gold())
	winner.visible = false
	winner.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# This is a physical display between the wheel and the crown, not a full-screen overlay.
	A.box(self,Vector3(0,3.33,-2.74),Vector3(2.6,0.36,0.065),A.dark())
	sign_title = A.label(self,"",Vector3(0,3.405,-2.69),52,Color("ffe3a0"))
	sign_detail = A.label(self,"",Vector3(0,3.235,-2.685),23,Color("d8dfdf"))
	reset_display()

func reset_display() -> void:
	sign_title.text = "COLLECT 3 COLORS" if machine.kind == 0 else "3 STAGE CHALLENGE"
	sign_detail.text = "REAL POCKET ROULETTE"

func begin(stage: int) -> void:
	mode = "spin"
	clock = 0.0
	result_left = 0
	jackpot_show = false
	winner.visible = false
	sign_title.text = "ROULETTE CHANCE" if machine.kind == 0 else "ROUND %d / 3"%(stage+1)
	sign_detail.text = "ROLLING  •  抽選スタート"

func finish(sector: int, stage: int, title: String, detail: String, big: bool) -> void:
	mode = "result"
	result_left = 6.0 if big else 3.2
	clock = 0
	jackpot_show = big
	sign_title.text = title
	sign_detail.text = detail
	for pocket in machine.roulette_root.pockets:
		if pocket.stage == stage and pocket.index == sector:
			winner.position = machine.ROULETTE_CENTER+Vector3(pocket.center.x,0.045,pocket.center.y)
			winner.scale = Vector3.ONE*(pocket.radius+0.025)/0.24
			winner.visible = true
			winner_color = machine.roulette_root.COLORS[sector]
			winner.material_override = A.mat("winner%d"%sector,winner_color,0.45,0.25,1.8)
			break

func _process(delta: float) -> void:
	if not is_instance_valid(machine) or not machine.playing: return
	clock += delta
	var target_fov := base_fov-0.7 if mode == "spin" else base_fov
	machine.camera.fov = lerpf(machine.camera.fov,target_fov,minf(1,delta*2.5))
	light_material.set_shader_parameter("phase",clock*(4.0 if mode == "spin" else 0.5))
	var energy := 0.16
	if mode == "spin":
		energy = 1.6 if machine.roulette_clock >= 2.2 else 0.9
		if machine.roulette_clock >= 2.2: sign_detail.text = "POCKET OPEN  •  どこに入る？"
	elif mode == "result":
		result_left -= delta
		# Slow glow, no full-screen flash or high-frequency strobe.
		energy = (1.8 if jackpot_show else 1.0)*(0.72+0.28*sin(clock*TAU*1.2))
		if result_left <= 0:
			mode = "idle"
			winner.visible = false
			reset_display()
	light_material.set_shader_parameter("energy",energy)
	light_material.set_shader_parameter("celebration",1.0 if mode == "result" and jackpot_show else 0.0)
	if winner.visible: winner.material_override.emission_energy_multiplier = 2.6+sin(clock*TAU*1.2)*0.8
