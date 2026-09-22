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
var display_clock := 0.0

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
	var display := Node3D.new()
	add_child(display)
	display.position = Vector3(0,3.36,-2.73)
	display.rotation.x = -0.60
	A.box(display,Vector3.ZERO,Vector3(3.12,0.48,0.07),A.gold())
	A.box(display,Vector3(0,0,0.043),Vector3(3.04,0.41,0.022),A.dark())
	sign_title = A.label(display,"",Vector3(0,0.079,0.061),68,Color("ffe3a0"))
	sign_detail = A.label(display,"",Vector3(0,-0.12,0.062),38,Color("d8dfdf"))
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Hiragino Sans","Noto Sans CJK JP","Arial"])
	sign_title.font = font
	sign_detail.font = font
	reset_display()

func reset_display() -> void:
	var state := idle_display()
	if sign_title.text != state[0]: sign_title.text = state[0]
	if sign_detail.text != state[1]: sign_detail.text = state[1]

func idle_display() -> Array[String]:
	if machine.payout_left > 0:
		var waiting: bool = machine.coins.size()+machine.guided.size()+machine.tower_visuals.size() >= machine.PAYOUT_SOFT_DENSITY
		return ["PAYOUT  %03d"%machine.payout_left,"盤面の空きを待っています" if waiting else "残り枚数 ・ 盤面へ払い出し中"]
	if machine.kind == 1 and (machine.tower_left > 0 or machine.tower_transfer >= 0):
		return ["TOWER BUILD","盤面へ搬入中" if machine.tower_transfer >= 0 else "%d枚を積み上げ中"%machine.tower_left]
	if machine.transit_t >= 0 or not machine.pending_colors.is_empty():
		return ["BALL TRANSFER","ボールをリフトで搬送中"]
	if machine.kind == 0:
		var count: int = machine.royal_colors.count(true)
		return ["COLOR  %d / 3"%count,"次回払出 ×2 ・ "+missing_colors() if machine.payout_multiplier == 2 else missing_colors()]
	return ["STAGE  %d / 3"%(machine.round_stage+1),"ボールを手前に落として抽選へ"]

func missing_colors() -> String:
	var missing: PackedStringArray = []
	for i in 3:
		if not machine.royal_colors[i]: missing.append(["赤","青","緑"][i])
	return "3色達成 ・ 抽選へ" if missing.is_empty() else "あと "+"・".join(missing)

func player_hint() -> String:
	if mode == "spin": return "ポケットに入れば当選 ・ ボールの行方に注目"
	if mode == "result": return sign_title.text+"  •  "+sign_detail.text
	var state := idle_display()
	return state[0]+"  •  "+state[1]

func begin(stage: int) -> void:
	mode = "spin"
	clock = 0.0
	result_left = 0
	jackpot_show = false
	winner.visible = false
	sign_title.text = "ROULETTE CHANCE" if machine.kind == 0 else "ROUND %d / 3"%(stage+1)
	sign_detail.text = "ボールがポケットへ落ちると当選"

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
	display_clock += delta
	if mode == "idle" and display_clock >= 0.2:
		display_clock = 0
		reset_display()
	var target_fov := base_fov-0.7 if mode == "spin" else base_fov
	machine.camera.fov = lerpf(machine.camera.fov,target_fov,minf(1,delta*2.5))
	light_material.set_shader_parameter("phase",clock*(4.0 if mode == "spin" else 0.5))
	var energy := 0.16
	if mode == "spin":
		energy = 1.6 if machine.roulette_clock >= 2.2 else 0.9
		if machine.roulette_clock >= 2.2 and not sign_detail.text.begins_with("POCKET OPEN"):
			sign_detail.text = "POCKET OPEN ・ 入賞待ち"
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
