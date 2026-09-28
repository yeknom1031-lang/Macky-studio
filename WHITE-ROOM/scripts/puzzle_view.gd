extends Control

var puzzle={}
var controls=[]
var font:Font
const INK=Color(0.16,0.24,0.29)
const DIM=Color(0.61,0.68,0.71)
const GLOW=Color(0.22,0.66,0.74)
const DIR=["N","E","S","W"]

func _ready() -> void:
	custom_minimum_size=Vector2(580,146)
	font=SystemFont.new()
	font.font_names=PackedStringArray(["Hiragino Sans","Arial"])

func caption(at:Vector2,text:String,size:int=17) -> void:
	draw_string(font,at,text,HORIZONTAL_ALIGNMENT_LEFT,-1,size,INK)

func arrow(at:Vector2,direction:int,color:Color=GLOW) -> void:
	var d=[Vector2.UP,Vector2.RIGHT,Vector2.DOWN,Vector2.LEFT][posmod(direction,4)]
	draw_line(at-d*20,at+d*22,color,3)
	draw_line(at+d*22,at+d*12+d.orthogonal()*8,color,3)
	draw_line(at+d*22,at+d*12-d.orthogonal()*8,color,3)

func _draw() -> void:
	if puzzle.is_empty() or not font:return
	draw_style_box(panel_style(),Rect2(Vector2.ZERO,size))
	match int(puzzle.kind):
		0:
			var current=preload("res://scripts/puzzle_catalog.gd").mask_value(controls,puzzle.masks)
			caption(Vector2(15,45),"目標")
			caption(Vector2(15,107),"現在")
			for i in range(5):
				var x=140+i*85
				draw_circle(Vector2(x,40),14,GLOW if (int(puzzle.target)&(1<<i)) else DIM)
				draw_circle(Vector2(x,102),14,GLOW if (current&(1<<i)) else DIM)
				caption(Vector2(x-4,73),str(i+1),12)
		1:
			for i in range(3):
				var x=100+i*190
				caption(Vector2(x-52,27),"入口 "+DIR[puzzle.inputs[i]])
				arrow(Vector2(x,72),controls[i])
				caption(Vector2(x-46,129),"出口 "+DIR[controls[i]])
		2:
			var amount=preload("res://scripts/puzzle_catalog.gd").weight_value(controls,puzzle.weights)
			var tilt=clampf((amount-puzzle.target)*0.003,-0.16,0.16)
			var center=Vector2(285,65)
			draw_line(Vector2(285,65),Vector2(285,127),INK,4)
			draw_line(center+Vector2(-165,-tilt*150),center+Vector2(165,tilt*150),INK,4)
			caption(Vector2(72,35),"基準 %d g"%puzzle.target)
			caption(Vector2(360,35),"選択 %d g"%amount)
			for x in [120,450]:draw_line(Vector2(x,84),Vector2(x,115),INK,2)
			draw_line(Vector2(68,115),Vector2(172,115),INK,3)
			draw_line(Vector2(398,115),Vector2(502,115),INK,3)
		3:
			for i in range(4):
				var x=105+i*120
				draw_circle(Vector2(x,57),20,GLOW if int(controls[i])==1 else DIM)
				caption(Vector2(x-8,104),str(puzzle.weights[i]),22)
		4:
			for i in range(4):
				var center=Vector2(78+i*141,58)
				var mins=int(puzzle.times[i])
				draw_arc(center,37,0,TAU,48,INK,2)
				var minute=mins%60*TAU/60-PI/2
				var hour=mins*TAU/720-PI/2
				draw_line(center,center+Vector2(cos(minute),sin(minute))*30,INK,2)
				draw_line(center,center+Vector2(cos(hour),sin(hour))*20,INK,3)
				caption(center+Vector2(-42,64),"%s  %02d:%02d"%[["A","B","C","D"][i],mins/60,mins%60],14)
		5:
			caption(Vector2(25,55),puzzle.detail,22)
			caption(Vector2(210,108),"○ ＋ □ ＝ ?",27)
		6:
			for i in range(9):
				var rect=Rect2(170+(i%3)*75,10+int(i/3)*42,68,36)
				draw_rect(rect,GLOW if controls[0]==i else Color(0.83,0.88,0.9))
				caption(rect.position+Vector2(20,24),puzzle.buttons[i])
			caption(Vector2(85,28),"↑ N")
			caption(Vector2(412,128),"開始 B3",14)
		7:
			for i in range(4):
				var rect=Rect2(18+i*143,38,122,64)
				draw_rect(rect,Color(0.82,0.89,0.92))
				caption(rect.position+Vector2(10,38),puzzle.buttons[int(controls[i])] if i<controls.size() else "—",18)
		8:
			var heading=0
			for i in range(3):
				var x=97+i*190
				heading=posmod(heading+int(controls[i]),4)
				caption(Vector2(x-46,27),"目標 "+DIR[puzzle.target[i]])
				arrow(Vector2(x,75),heading)
				caption(Vector2(x-36,130),"偏向 "+str(controls[i]))
		9:
			var points=[Vector2(55,73),Vector2(232,28),Vector2(355,117),Vector2(520,73)]
			var edges=[[0,1],[1,2],[2,3],[0,2],[1,3],[0,3]]
			for i in range(6):
				var a=points[edges[i][0]]
				var b=points[edges[i][1]]
				draw_line(a,b,GLOW if int(controls[i])==1 else DIM,3 if int(controls[i])==1 else 1)
				var offset=Vector2(14,20) if i==1 else (Vector2(-60,-8) if i==5 else Vector2(0,-4))
				caption((a+b)/2+offset,str(puzzle.weights[i]),13)
			for i in range(4):
				draw_circle(points[i],16,Color(0.94,0.97,0.98))
				caption(points[i]+Vector2(-6,6),["S","A","B","G"][i])

func panel_style() -> StyleBoxFlat:
	var style=StyleBoxFlat.new()
	style.bg_color=Color(0.91,0.94,0.95)
	style.set_corner_radius_all(5)
	return style
