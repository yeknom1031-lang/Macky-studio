extends RefCounted

const NAMES=["連動する照明","回転する流路","三つの分銅","二進の保全信号","止まった時計の順序","記号の計算","観測座標","復旧の手順","光学偏向器","抵抗の経路"]
const GLYPHS=["○","△","□","◇"]

static func make(state:Dictionary,id:int) -> Dictionary:
	var rng=RandomNumberGenerator.new()
	rng.seed=int(state.anomaly_seed)+id*7919
	var kind=int(state.puzzle_pool[id-1])
	var p={"kind":kind,"id":id,"title":NAMES[kind],"initial":[],"answer":[],"buttons":[],"mode":"select","prompt":"","hint":"","detail":""}
	match kind:
		0:
			p.initial=[0,0,0,0,0]
			p.answer=[rng.randi_range(0,1),rng.randi_range(0,1),rng.randi_range(0,1),rng.randi_range(0,1),1]
			p.masks=[1,3,6,12,24]
			p.target=mask_value(p.answer,p.masks)
			p.mode="toggle"
			p.buttons=["A","B","C","D","E"]
			p.prompt="目標の照明と一致させる。各スイッチは接続先の灯りを反転する。"
			p.detail="A→1   B→1・2   C→2・3   D→3・4   E→4・5"
			p.hint="右端の灯りから合わせよう。5番に触れるのは E だけ。"
		1:
			p.initial=[0,0,0]
			p.answer=[rng.randi_range(1,3),rng.randi_range(1,3),rng.randi_range(1,3)]
			p.mode="rotate"
			p.buttons=["流路 A ↻","流路 B ↻","流路 C ↻"]
			p.prompt="各流路を回し、入口から右に90°曲がった方向へ出口を向ける。"
			p.inputs=p.answer.map(func(x):return posmod(x-1,4))
			p.detail="N → E → S → W の順に右回り。矢印が現在の出口。"
			p.hint="たとえば入口が E なら、右に曲がった出口は S。"
		2:
			p.initial=[0,0,0,0,0,0]
			p.weights=[1,2,4,8,16,32]
			var selected=preload("res://scripts/run_catalog.gd").shuffled(range(6),rng).slice(0,3)
			p.answer=range(6).map(func(i):return 1 if i in selected else 0)
			p.target=weight_value(p.answer,p.weights)
			p.mode="toggle"
			for w in p.weights:p.buttons.append(str(w)+" g")
			p.prompt="分銅をちょうど3個選び、基準の重さと釣り合わせる。"
			p.detail="基準：%d g。押した分銅はもう一度押すと外れる。"%p.target
			p.hint="大きい分銅から、残りの重さを引き算してみよう。"
		3:
			p.initial=[0,0,0,0]
			p.target=rng.randi_range(3,14)
			p.weights=[8,4,2,1]
			p.answer=p.weights.map(func(w):return 1 if (int(p.target)&w)!=0 else 0)
			p.mode="toggle"
			p.buttons=["8","4","2","1"]
			p.prompt="点灯した端子の値を足して、保全信号の数値を作る。"
			p.detail="要求信号：%d。例：0101 は 4＋1＝5。"%p.target
			p.hint="要求値以下の最大の端子を点灯し、残りを小さい端子で作る。"
		4:
			p.initial=[]
			p.times=preload("res://scripts/run_catalog.gd").shuffled([125,310,490,665],rng)
			var time_offset=rng.randi_range(0,40)
			p.times=p.times.map(func(v):return v+time_offset)
			p.answer=[0,1,2,3]
			p.answer.sort_custom(func(a,b):return p.times[a]<p.times[b])
			p.mode="sequence"
			p.buttons=["時計 A","時計 B","時計 C","時計 D"]
			p.prompt="同じ日の4台の時計。早い時刻から順に選び、記録を復元する。"
			p.detail="外の時計の動きではなく、この装置に保存された時刻を使う。"
			p.hint="まず短い針の時を比べ、同じ時なら長い針の分を比べる。"
		5:
			var base=rng.randi_range(2,6)
			p.base=base
			var target=base+(base+2)*2
			p.initial=[-1]
			p.options=preload("res://scripts/run_catalog.gd").shuffled([target,target-2,target+2,target+4],rng)
			p.answer=[p.options.find(target)]
			p.buttons=p.options.map(func(v):return str(v))
			p.prompt="保全記号の規則から、○ ＋ □ の値を求める。"
			p.detail="○＝%d     △＝○＋2     □＝△×2"%base
			p.hint="○ から △、△ から □ の順に計算。最後に ○ と □ を足す。"
		6:
			p.initial=[-1]
			var col=rng.randi_range(0,2)
			var row=rng.randi_range(0,1)
			p.answer=[row*3+col]
			p.buttons=["A1","B1","C1","A2","B2","C2","A3","B3","C3"]
			p.prompt="北が上の観測図。指定された移動の到着点を選ぶ。"
			var horizontal=["西へ1","東西には動かず","東へ1"][col]
			p.detail="B3 から北へ%d、%s。"%[2-row,horizontal]
			p.hint="上に進むほど行番号は小さくなる。B列の西はA、東はC。"
		7:
			p.initial=[]
			p.answer=preload("res://scripts/run_catalog.gd").shuffled(range(4),rng)
			p.mode="sequence"
			p.buttons=["排水 A","通気 B","給電 C","校正 D"]
			p.prompt="作業記録の前後関係を満たす順に、4工程を選ぶ。"
			var a=p.answer
			p.detail="%s は %s より先。%s は %s より先。%s は %s より先。"%[p.buttons[a[1]],p.buttons[a[2]],p.buttons[a[0]],p.buttons[a[1]],p.buttons[a[2]],p.buttons[a[3]]]
			p.hint="他の工程の後である必要がない工程から始め、一本の順序に並べる。"
		8:
			p.initial=[0,0,0]
			p.answer=[rng.randi_range(1,3),rng.randi_range(1,3),rng.randi_range(1,3)]
			p.mode="rotate"
			p.buttons=["偏向 A ↻","偏向 B ↻","偏向 C ↻"]
			p.target=[]
			var heading=0
			for v in p.answer:
				heading=posmod(heading+v,4)
				p.target.append(heading)
			p.prompt="北向きの光を A→B→C に通す。各段の出力を目標の向きに合わせる。"
			p.detail="0＝直進、1＝右折、2＝反転、3＝左折。前段の光をさらに曲げる。"
			p.hint="A を先に合わせる。B は A の出力から、C は B の出力から曲げる。"
		9:
			p.initial=[0,0,0,0,0,0]
			var offset=rng.randi_range(0,3)
			p.weights=[2+offset,3+offset,4+offset,5+offset,6+offset,7+offset]
			p.answer=[1,1,1,0,0,0] if rng.randi_range(0,1)==0 else [0,1,0,1,1,0]
			p.mode="toggle"
			for i in range(6):p.buttons.append(["S–A","A–B","B–G","S–B","A–G","S–G"][i]+"  %dΩ"%p.weights[i])
			p.target=weight_value(p.answer,p.weights)
			p.prompt="全4端子を通る S→G の一本道を作る。分岐なし、抵抗の合計は%dΩ。"%p.target
			p.detail="選ぶ配線は3本。選択した配線をもう一度押すと外れる。"
			p.hint="S→A→B→G と S→B→A→G の、2通りの合計を比べよう。"
	return p

static func initial(p:Dictionary) -> Array:
	return p.initial.duplicate()

static func change(p:Dictionary,controls:Array,index:int) -> Array:
	var result=controls.duplicate()
	if index<0 or index>=p.buttons.size():return result
	match p.mode:
		"toggle":result[index]=1-int(result[index])
		"rotate":result[index]=posmod(int(result[index])+1,4)
		"sequence":
			if result.size()<p.answer.size() and not index in result:result.append(index)
		_:result=[index]
	return result

static func mask_value(controls:Array,masks:Array) -> int:
	var value=0
	for i in range(controls.size()):
		if int(controls[i])==1:value=value^int(masks[i])
	return value

static func weight_value(controls:Array,weights:Array) -> int:
	var value=0
	for i in range(controls.size()):value+=int(controls[i])*int(weights[i])
	return value

static func correct(p:Dictionary,controls:Array) -> bool:
	return controls==p.answer

static func solution_text(p:Dictionary) -> String:
	var parts=[]
	if p.mode=="rotate":
		for i in range(p.answer.size()):parts.append(["A","B","C"][i]+"＝"+str(p.answer[i]))
		return "初期状態からの回転回数："+"、".join(parts)
	if p.mode=="toggle":
		for i in range(p.answer.size()):
			if p.answer[i]==1:parts.append(p.buttons[i])
		return "選択するもの："+"、".join(parts)
	for i in p.answer:parts.append(p.buttons[i])
	return " → ".join(parts)

static func digit(state:Dictionary,id:int) -> int:
	if not state.get("campaign",false):return {1:4,3:7,4:2}.get(id,0)
	var rng=RandomNumberGenerator.new()
	rng.seed=int(state.anomaly_seed)+id*311
	return rng.randi_range(1,9)

static func code(state:Dictionary) -> String:
	return str(digit(state,1))+str(digit(state,3))+str(digit(state,4))
