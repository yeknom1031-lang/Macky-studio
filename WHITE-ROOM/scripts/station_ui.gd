extends RefCounted

const Puzzles=preload("res://scripts/puzzle_catalog.gd")
const View=preload("res://scripts/puzzle_view.gd")
var game
var puzzle={}
var controls=[]
var buttons=[]
var view
var feedback:Label
var hint:Label

func open(owner_game,id:int) -> void:
	game=owner_game
	if id in game.profile.state.solved_stations:
		if id in [1,3,4]:game.read_clue(id)
		else:game.toast("この観測器は校正済み。境界への給電が安定している。")
		return
	puzzle=Puzzles.make(game.profile.state,id)
	controls=game.profile.state.station_controls.get(str(id),Puzzles.initial(puzzle)).duplicate()
	var box=game.dialog("CALIBRATION / 観測器 %02d"%id,puzzle.title,puzzle.prompt,"station")
	game.paragraph(box,puzzle.detail,16)
	view=View.new()
	view.puzzle=puzzle
	view.controls=controls
	box.add_child(view)
	var grid=GridContainer.new()
	grid.columns=3 if puzzle.buttons.size()>5 else puzzle.buttons.size()
	grid.add_theme_constant_override("h_separation",8)
	grid.add_theme_constant_override("v_separation",6)
	box.add_child(grid)
	buttons=[]
	for i in range(puzzle.buttons.size()):
		var index=i
		buttons.append(game.button(grid,puzzle.buttons[i],func():change(index),false,Vector2(570.0/grid.columns,40)))
	feedback=game.text_label("装置は何度でも試せます。危険を増やすのは誤った扉です。",15)
	box.add_child(feedback)
	hint=game.paragraph(box,"",15)
	var row=HBoxContainer.new()
	row.add_theme_constant_override("separation",8)
	box.add_child(row)
	game.button(row,"校正を実行",submit,true,Vector2(186,44))
	game.button(row,"初期状態へ",reset,false,Vector2(186,44))
	game.button(row,"ヒント",next_hint,false,Vector2(186,44))
	game.button(box,"操作を保存して戻る",game.resume_game)
	refresh()
	show_hint()

func refresh() -> void:
	view.controls=controls
	view.queue_redraw()
	for i in range(buttons.size()):
		var selected=(puzzle.mode=="toggle" and int(controls[i])==1) or (puzzle.mode=="select" and controls[0]==i) or (puzzle.mode=="sequence" and i in controls)
		buttons[i].text=("● " if selected else "")+str(puzzle.buttons[i])
		if puzzle.mode=="rotate":buttons[i].text+="  "+str(controls[i])
	game.profile.state.station_controls[str(puzzle.id)]=controls.duplicate()
	game.save_game()

func change(index:int) -> void:
	if game.mode!="station":return
	controls=Puzzles.change(puzzle,controls,index)
	feedback.text="入力中。確認できたら校正を実行。"
	refresh()

func reset() -> void:
	if game.mode!="station":return
	controls=Puzzles.initial(puzzle)
	feedback.text="初期状態に戻した。確定する前の操作は安全。"
	refresh()

func next_hint() -> void:
	if game.mode!="station":return
	var key=str(puzzle.id)
	game.profile.state.station_hints[key]=mini(2,int(game.profile.state.station_hints.get(key,0))+1)
	show_hint()
	game.save_game()

func show_hint() -> void:
	var level=int(game.profile.state.station_hints.get(str(puzzle.id),0))
	hint.text="ヒントは2段階。最後は操作の答えまで確認できます。" if level==0 else (puzzle.hint if level==1 else Puzzles.solution_text(puzzle))

func submit() -> bool:
	if game.mode!="station" or game.failure_busy():return false
	if (puzzle.mode=="sequence" and controls.size()<puzzle.answer.size()) or (puzzle.mode=="select" and controls[0]<0):
		feedback.text="選択を完成させてから確定しよう。危険度は増えていない。"
		return false
	if not Puzzles.correct(puzzle,controls):
		feedback.text="基準と一致しない。手掛かりを確認しよう。"
		return false
	return game.finish_station(int(puzzle.id),controls)
