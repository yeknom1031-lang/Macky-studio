extends Node3D
## Free-play electronic slot: outcomes are saved before animation, never rerolled on resume.
const A = preload("res://scripts/art.gd")
const ROOT := "res://assets/generated/party/"
const PAYOUTS := [300,120,80,20,30,50]
const COLORS := [Color("ff3eb5"),Color("29d9ff"),Color("ffd35e")]
var machine: Node3D
var rng := RandomNumberGenerator.new()
var medal_count := 0
var queued := 0
var fever_spins := 0
var mode := "idle"
var clock := 0.0
var show_clock := 0.0
var result_left := 0.0
var result := [0,1,2]
var reward := 0
var multiplier := 1
var rounds := 0
var hits := 0
var stopped := [false,false,false]
var materials: Array[ShaderMaterial] = []
var sign_title: Label3D
var sign_detail: Label3D
var panel_root: Node3D
var bulbs: Array[MeshInstance3D] = []
var bulb_materials: Array[StandardMaterial3D] = []
var beams: Array[Node3D] = []
var confetti: MultiMeshInstance3D
var confetti_left := 0.0
var confetti_age := 0.0
var display_clock := 0.0

func setup(m: Node3D) -> void:
	machine = m
	set_meta("dynamic",true)
	rng.randomize()
	panel_root = Node3D.new()
	add_child(panel_root)
	panel_root.position = Vector3(0,2.50,-2.15)
	panel_root.rotation.x = -0.55
	A.box(panel_root,Vector3(0,0,-0.08),Vector3(4.04,2.30,0.18),A.chrome())
	var stage := A.panel(panel_root,Vector3(0,0,0.021),Vector2(3.92,2.18),ROOT+"stage.png")
	stage.material_override.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	for i in 3:
		var x := (i-1)*1.12
		A.box(panel_root,Vector3(x,0.04,0.07),Vector3(1.08,1.36,0.10),A.gold())
		var reel := MeshInstance3D.new()
		var quad := QuadMesh.new()
		quad.size = Vector2(1.0,1.25)
		reel.mesh = quad
		var mat := ShaderMaterial.new()
		mat.shader = load("res://shaders/party_reel.gdshader")
		mat.set_shader_parameter("symbols",load(ROOT+"symbols.png"))
		mat.set_shader_parameter("offset",float(i)-0.3)
		reel.material_override = mat
		reel.position = Vector3(x,0.04,0.131)
		reel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		panel_root.add_child(reel)
		materials.append(mat)
	# A single horizontal payline with physical markers, not a floating HUD.
	for side in [-1,1]:
		var arrow := A.label(panel_root,"▶" if side == -1 else "◀",Vector3(side*1.81,0.04,0.14),75,Color("ffe258"))
		arrow.pixel_size = 0.003
	A.box(panel_root,Vector3(0,0.89,0.085),Vector3(3.39,0.30,0.025),A.dark())
	A.box(panel_root,Vector3(0,-0.83,0.085),Vector3(3.68,0.30,0.025),A.dark())
	sign_title = A.label(panel_root,"PARTY READY",Vector3(0,0.89,0.14),70,Color("ffdf72"))
	sign_detail = A.label(panel_root,"",Vector3(0,-0.83,0.14),43,Color.WHITE)
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Hiragino Sans","Arial"])
	sign_title.font = font
	sign_detail.font = font
	for i in 3:
		bulb_materials.append(A.mat("party_bulb%d"%i,COLORS[i],0.15,0.25,2.0))
	for i in 32:
		var t := i/32.0*TAU
		var b := A.ball_visual(panel_root,0.037,COLORS[i%3])
		if not bulbs.is_empty(): b.mesh = bulbs[0].mesh
		b.position = Vector3(signf(cos(t))*minf(absf(cos(t))*2.65,1.94),signf(sin(t))*minf(absf(sin(t))*1.60,1.075),0.15)
		b.material_override = bulb_materials[i%3]
		b.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		bulbs.append(b)
	# Real fixture-shaped rails of light; no extra shadow-casting lights.
	for side in [-1,1]:
		for n in 2:
			var beam := A.box(self,Vector3(side*(1.90+n*0.12),2.5,-2.25+n*0.08),Vector3(0.026,2.0,0.025),bulb_materials[(n+(1 if side > 0 else 0))%3])
			beams.append(beam)
			beam.get_child(0).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	A.batch_static(panel_root,[])
	build_confetti()
	reset_display()

func build_confetti() -> void:
	confetti = MultiMeshInstance3D.new()
	add_child(confetti)
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.052,0.016,0.105)
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = mesh
	mm.instance_count = 120
	confetti.multimesh = mm
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo = true
	confetti.material_override = mat
	confetti.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	confetti.visible = false
	for i in 120: mm.set_instance_color(i,COLORS[i%3])

func medal_arrived() -> void:
	medal_count += 1
	if medal_count >= 5:
		medal_count -= 5
		add_spins(1)
	machine.refresh_lights()
	machine.bonus_changed.emit()

func add_spins(count: int) -> void:
	queued += maxi(0,count)
	machine.sound.play("gate",0.45)
	machine.bonus_changed.emit()

static func symbol_for_roll(roll: int) -> int:
	if roll < 4: return 0
	if roll < 12: return 1
	if roll < 24: return 2
	if roll < 40: return 5
	if roll < 60: return 4
	if roll < 75: return 3
	return -1

func start_spin() -> void:
	if mode != "idle" or queued <= 0: return
	queued -= 1
	multiplier = 2 if fever_spins > 0 else 1
	if fever_spins > 0: fever_spins -= 1
	var symbol := symbol_for_roll(rng.randi_range(0,99))
	if symbol >= 0:
		result = [symbol,symbol,symbol]
		reward = PAYOUTS[symbol]*multiplier
	else:
		result = [rng.randi_range(0,5),rng.randi_range(0,5),rng.randi_range(0,5)]
		if result[0] == result[1] and result[1] == result[2]: result[2] = (result[2]+1)%6
		reward = 0
	mode = "spin"
	clock = 0
	stopped = [false,false,false]
	rounds += 1
	machine.sound.roulette_start(1 if multiplier == 2 else 0)
	sign_title.text = "FEVER ×2" if multiplier == 2 else "LET'S PARTY!"
	sign_detail.text = "5枚投入で1回 ・ ストック %d"%queued
	machine.refresh_lights()
	machine.bonus_changed.emit()

func advance(delta: float) -> void:
	if not machine.playing: return
	show_clock += delta
	clock += delta
	if mode == "idle" and queued > 0: start_spin()
	elif mode == "spin":
		machine.sound.roulette_update(delta,clock,2.6-clock*0.35,clock*4)
		for i in 3:
			var duration := 2.6+i*0.75
			var t := clampf(clock/duration,0,1)
			var end := 30.0+float(result[i])-0.3
			var offset := lerpf(-0.3,end,1-pow(1-t,2.4))
			materials[i].set_shader_parameter("offset",offset)
			materials[i].set_shader_parameter("winning",0.0)
			if t >= 1 and not stopped[i]:
				stopped[i] = true
				machine.sound.play("pocket",0.75,(i-1)*0.5)
		if clock >= 4.1: finish_spin()
	elif mode == "result":
		result_left -= delta
		if result_left <= 0:
			mode = "idle"
			for mat in materials: mat.set_shader_parameter("winning",0.0)
			reset_display()
	display_clock += delta
	if mode == "idle" and display_clock >= 0.2:
		display_clock = 0
		reset_display()
	animate_lights(delta)

func finish_spin() -> void:
	if mode != "spin": return
	mode = "result" # Set before signals/saves: the reward cannot be granted twice.
	var jp: bool = reward > 0 and result[0] == 0
	result_left = 6.0 if jp else 3.3
	machine.payout_left += reward
	if reward > 0:
		hits += 1
		confetti_left = 5.6 if jp else 2.5
		confetti_age = 0
		for mat in materials: mat.set_shader_parameter("winning",1.0)
		if result[0] == 1:
			fever_spins += 3
			queued += 3
		sign_title.text = "777 JACKPOT!" if jp else ("DISCO FEVER!" if result[0] == 1 else "%d MEDALS!"%reward)
		sign_detail.text = "%d枚 ＋ 2倍抽選3回"%reward if result[0] == 1 else "%d枚をホッパーから払い出し！"%reward
		machine.sound.roulette_result("jackpot" if jp else ("advance" if result[0] == 1 else "win"))
	else:
		sign_title.text = "NEXT CHANCE"
		sign_detail.text = "5枚投入でスロット1回追加"
		machine.sound.cancel_roulette()
		machine.sound.play("lever",0.3)
	machine.message.emit(sign_title.text+" • "+sign_detail.text)
	machine.refresh_lights()
	machine.bonus_changed.emit()
	if jp: machine.jackpot.emit()

func reset_display() -> void:
	var title := "PAYOUT %03d"%machine.payout_left if machine.payout_left > 0 else "PARTY FEVER"
	var detail := "あと%d枚でスロット ・ STOCK %d"%[5-medal_count,queued]
	if fever_spins > 0: detail = "FEVER ×2 残り%d回 ・ STOCK %d"%[fever_spins,queued]
	if sign_title.text != title: sign_title.text = title
	if sign_detail.text != detail: sign_detail.text = detail

func player_hint() -> String:
	return sign_title.text+" • "+sign_detail.text

func animate_lights(delta: float) -> void:
	for i in bulb_materials.size():
		bulb_materials[i].emission_energy_multiplier = (2.6 if mode != "idle" else 1.4)+(0.6*sin(show_clock*TAU*0.8+i*2.1))
	for i in beams.size(): beams[i].rotation.z = sin(show_clock*0.9+i)*0.22
	if confetti_left > 0:
		confetti_left -= delta
		confetti_age += delta
		confetti.visible = true
		for i in 120:
			var age := fmod(confetti_age+i*0.037,2.4)
			var phase := i*2.399
			var p := Vector3(sin(phase)*1.9+sin(age*3+phase)*0.2,4.1-age*1.3,-1.0+cos(phase)*0.8+age*0.7)
			confetti.multimesh.set_instance_transform(i,Transform3D(Basis.from_euler(Vector3(age*2+phase,phase,age*3)),p))
	else: confetti.visible = false

func snapshot() -> Dictionary:
	return {"medals":medal_count,"queue":queued,"fever":fever_spins,"mode":mode,"result":result.duplicate(),"reward":reward,"multiplier":multiplier,"hold":result_left,"rounds":rounds,"hits":hits,"rng":str(rng.state)}

func restore(data: Dictionary) -> void:
	medal_count = clampi(int(data.get("medals",0)),0,4)
	queued = maxi(0,int(data.get("queue",0)))
	fever_spins = maxi(0,int(data.get("fever",0)))
	rounds = maxi(0,int(data.get("rounds",0)))
	hits = maxi(0,int(data.get("hits",0)))
	if data.has("rng"): rng.state = int(data.rng)
	mode = str(data.get("mode","idle"))
	if mode not in ["idle","spin","result"]: mode = "idle"
	var saved = data.get("result",[0,1,2])
	if saved is Array and saved.size() == 3:
		for i in 3: result[i] = clampi(int(saved[i]),0,5)
	reward = clampi(int(data.get("reward",0)),0,600)
	multiplier = clampi(int(data.get("multiplier",1)),1,2)
	result_left = clampf(float(data.get("hold",0)),0,6)
	clock = 0
	stopped = [false,false,false]
	for i in 3: materials[i].set_shader_parameter("offset",float(result[i])-0.3)
	reset_display()
	if mode == "spin":
		sign_title.text = "SPIN RESUME"
		sign_detail.text = "保存した抽選を再開"
		machine.sound.roulette_start(1 if multiplier == 2 else 0)
