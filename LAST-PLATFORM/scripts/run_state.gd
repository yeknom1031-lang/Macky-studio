extends RefCounted

const GOAL = 7
const CATALOG = [
	["帰れ", "駅名標の『宵凪』が『帰れ』に変わっていた。"],
	["視線を売る", "自動販売機の中で、飲み物が眼に変わっていた。"],
	["浮遊するベンチ", "ベンチが床を離れて浮かんでいた。"],
	["巻き戻る時刻", "ホームの時計の針が逆向きに回っていた。"],
	["背の高い人", "ホームで待つ乗客の背丈が異様に伸びていた。"],
	["天井を歩く", "天井に足跡が続いていた。"],
	["消えた黄色", "線路沿いの黄色い点字ブロックが消えていた。"],
	["こちらを見る人たち", "普段は一人の乗客が増え、こちらを見つめていた。"],
	["満員の終電", "無人のはずの電車の窓に、人影が並んでいた。"],
	["ホームに落ちた月", "大きな月がホームの中に浮いていた。"],
	["見返す広告", "旅のポスターが大きな眼の絵に変わっていた。"],
	["存在しない時刻", "発車案内に『25:99』という時刻が表示されていた。"]
]
var progress = 0
var mistakes = 0
var tutorial = true
var current = -1
var found: Array = []
var bag: Array = []
var rounds = 0
var seconds = 0.0
var rng = RandomNumberGenerator.new()

func _init() -> void:
	rng.randomize()
	refill()

func refill() -> void:
	bag = range(CATALOG.size())
	for i in range(bag.size() - 1, 0, -1):
		var j = rng.randi_range(0, i)
		var old = bag[i]
		bag[i] = bag[j]
		bag[j] = old

func draw() -> int:
	# Every four rounds include a normal platform; surprises do not repeat
	# until the anomaly bag has been used up.
	if rounds % 4 == 3 or (rounds > 0 and rng.randf() < 0.20):
		return -1
	if bag.is_empty():
		refill()
	return int(bag.pop_back())

func decide(returned: bool) -> Dictionary:
	if tutorial:
		if returned:
			return {"accepted": false, "correct": false, "message": "最初は正常なホームです。奥の出口まで歩いて、いつもの風景を覚えましょう。", "won": false}
		tutorial = false
		current = draw()
		rounds += 1
		return {"accepted": true, "correct": true, "message": "風景を覚えました。ここから、異変を見極めてください。", "won": false}
	var correct = returned == (current >= 0)
	var message = "異変はありませんでした。判断は正しい。"
	if correct:
		progress += 1
		if current >= 0:
			if current not in found:
				found.append(current)
			message = "見抜いた異変：" + str(CATALOG[current][0])
	else:
		progress = 0
		mistakes += 1
		message = str(CATALOG[current][1]) if current >= 0 else "今回は正常なホームでした。奥へ進むのが正解です。"
	var won = progress >= GOAL
	if not won:
		current = draw()
		rounds += 1
	return {"accepted": true, "correct": correct, "message": message, "won": won}

func serialize() -> Dictionary:
	return {"version": 1, "progress": progress, "mistakes": mistakes, "tutorial": tutorial,
		"current": current, "found": found, "bag": bag, "rounds": rounds, "seconds": seconds}

func restore(data: Dictionary) -> bool:
	if data.get("version") != 1:
		return false
	for key in ["progress", "mistakes", "current", "rounds", "seconds"]:
		if not (data.get(key) is int or data.get(key) is float):
			return false
	if not data.get("tutorial") is bool or not data.get("found") is Array or not data.get("bag") is Array:
		return false
	if int(data.progress) < 0 or int(data.progress) > GOAL or int(data.current) < -1 or int(data.current) >= CATALOG.size():
		return false
	for ids in [data.found, data.bag]:
		for id in ids:
			if not (id is int or id is float) or int(id) < 0 or int(id) >= CATALOG.size():
				return false
	progress = int(data.progress)
	mistakes = maxi(0, int(data.mistakes))
	tutorial = data.tutorial
	current = int(data.current)
	found = data.found.map(func(v): return int(v))
	bag = data.bag.map(func(v): return int(v))
	rounds = maxi(0, int(data.rounds))
	seconds = maxf(0.0, float(data.seconds))
	return true
