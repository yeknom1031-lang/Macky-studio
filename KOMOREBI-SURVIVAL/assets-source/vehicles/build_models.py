"""Blender 4.5 LTS: editable vehicle models plus lightweight grouped mesh exports."""
import bpy, math, json, os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'dist/assets/survival/vehicles'; OUT.mkdir(parents=True,exist_ok=True)
M={}; META={}; PART='body'; ORIGINS={}
def xyz(p):return Vector((p[0],-p[2],p[1]))
def game(p):return (p.x,p.z,-p.y)
def mat(name,color,rough=.5,metal=0,alpha=1,texture=None,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(int(color[i:i+2],16)/255 for i in (1,3,5))+(alpha,);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');rgb=m.diffuse_color[:3];linear=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb);p.inputs['Base Color'].default_value=(*linear,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
 if emission:p.inputs['Emission Color'].default_value=(*linear,1);p.inputs['Emission Strength'].default_value=emission
 if alpha<1:m.surface_render_method='DITHERED'
 M[name]=m;META[name]={'color':color,'roughness':rough,'metalness':metal,'opacity':alpha,'texture':texture,'emission':emission};return m
def finish(o,name,material,bevel=0):
 o.name=name;o['part']=PART;o.data.materials.append(M[material]);
 if bevel:mod=o.modifiers.new('manufactured rounded edges','BEVEL');mod.width=bevel;mod.segments=3
 return o
def box(name,p,size,material,bevel=.025,rx=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler.x=rx;return finish(o,name,material,bevel)
def cyl(name,p,r,depth,material,axis='y',verts=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=xyz(p));o=bpy.context.object
 if axis=='x':o.rotation_euler.y=math.pi/2
 if axis=='z':o.rotation_euler.x=math.pi/2
 return finish(o,name,material,.008)
def torus(name,p,major,minor,material,axis='x'):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=32,minor_segments=10,location=xyz(p));o=bpy.context.object
 if axis=='x':o.rotation_euler.y=math.pi/2
 if axis=='z':o.rotation_euler.x=math.pi/2
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,material)
def rod(name,a,b,r,material):
 a,b=xyz(a),xyz(b);v=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return finish(o,name,material,.006)
def mesh(name,points,faces,material,bevel=0):
 me=bpy.data.meshes.new(name);me.from_pydata([xyz(p) for p in points],[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return finish(o,name,material,bevel)
def reset():
 global PART,ORIGINS
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);PART='body';ORIGINS={'body':(0,0,0)}
def wheel(name,p,r=.54,width=.33):
 global PART
 PART=name;ORIGINS[name]=p;torus('pneumatic tire',p,r*.74,r*.26,'rubber');cyl('alloy rim',p,r*.55,width*.95,'alloy','x');cyl('dark hub',p,r*.29,width*1.08,'black','x')
 for side in[-1,1]:
  for n in range(6):
   a=n*math.tau/6;cyl('wheel lug',(p[0]+side*width*.55,p[1]+math.cos(a)*r*.18,p[2]+math.sin(a)*r*.18),.024,.025,'alloy','x',8)
 for n in range(28):
  a=n*math.tau/28;box('tread block',(p[0],p[1]+math.cos(a)*r,p[2]+math.sin(a)*r),(width,.065,r*.22),'rubber',.015,rx=a)
 PART='body'
def car():
 reset();box('ladder chassis',(0,.55,0),(1.65,.22,4.25),'black');box('body tub',(0,.96,.05),(2,.57,4.35),'paint',.1);box('bonnet',(0,1.32,-1.45),(1.97,.25,1.65),'paint',.065)
 for side in[-1,1]:
  box('front wing',(side*1.02,1.1,-1.45),(.22,.3,1.3),'paint',.08);box('rear wing',(side*1.02,1.1,1.45),(.22,.3,1.3),'paint',.08);box('side step',(side*1.13,.64,.1),(.26,.12,1.8),'black');box('door handle',(side*1.025,1.35,.62),(.07,.06,.24),'alloy');box('mirror housing',(side*1.22,1.73,-.65),(.27,.24,.12),'black');box('mirror glass',(side*1.22,1.73,-.578),(.22,.19,.018),'mirror');rod('mirror stalk',(side*.97,1.6,-.5),(side*1.2,1.7,-.64),.028,'black')
  for z in[-1.43,1.47]:wheel(('wheel_fl' if side<0 else 'wheel_fr') if z<0 else ('wheel_rl' if side<0 else 'wheel_rr'),(side*1.02,.55,z))
 # Enclosed framed cabin with real interior visible through glazing.
 for side in[-1,1]:
  x=side*.96
  mesh('side glazing',[(x,1.4,-.78),(x,2.13,-.4),(x,2.13,1.55),(x,1.4,1.75)],[(0,1,2,3)],'glass')
  for a,b in[((x,1.4,-.78),(x,2.18,-.4)),((x,1.35,1.75),(x,2.18,1.55)),((x,1.37,.5),(x,2.18,.5))]:rod('cabin pillar',a,b,.045,'paint')
  rod('window sill',(x,1.39,-.8),(x,1.39,1.75),.04,'paint');box('door seam',(side*1.007,1.1,.78),(.016,.49,.018),'black',.004)
 mesh('windscreen',[(-.91,1.4,-.8),(.91,1.4,-.8),(.91,2.12,-.42),(-.91,2.12,-.42)],[(0,1,2,3)],'glass');mesh('rear glass',[(-.91,1.4,1.77),(.91,1.4,1.77),(.91,2.12,1.58),(-.91,2.12,1.58)],[(0,1,2,3)],'glass');box('cream roof',(0,2.23,.57),(2.04,.17,2.35),'cream',.09)
 box('dashboard',(0,1.45,-.48),(1.7,.2,.35),'black',.06)
 for x in[-.48,.48]:
  box('seat cushion',(x,1.28,.2),(.65,.16,.7),'seat',.09);box('seat back',(x,1.65,.55),(.65,.73,.18),'seat',.09);box('headrest',(x,2.02,.58),(.38,.23,.15),'seat',.06)
 torus('steering wheel',(-.48,1.68,-.22),.2,.022,'black','z');rod('steering column',(-.48,1.42,-.48),(-.48,1.68,-.22),.025,'black')
 for x in[-.68,.68]:cyl('round headlight',(x,1.22,-2.3),.17,.09,'lamp','z');cyl('lamp surround',(x,1.22,-2.26),.2,.06,'black','z')
 box('grille',(0,1.18,-2.29),(.88,.34,.06),'black');
 for x in range(-5,6):box('grille slat',(x*.075,1.18,-2.33),(.024,.27,.025),'alloy',.004)
 for z in[-2.34,2.34]:box('bumper',(0,.76,z),(2.15,.2,.2),'black',.05)
 for x in[-.85,.85]:box('tail lamp',(x,1.18,2.25),(.18,.28,.06),'redlamp',.025)
 for x in[-.8,.8]:rod('brushguard', (x,.76,-2.5),(x,1.5,-2.5),.045,'black')
 rod('brushguard crossbar',(-.8,1.5,-2.5),(.8,1.5,-2.5),.045,'black')
 for x in[-.87,.87]:rod('roof rack rail',(x,2.48,-.42),(x,2.48,1.55),.035,'black');rod('rack mount',(x,2.24,-.35),(x,2.48,-.35),.025,'black');rod('rack mount',(x,2.24,1.45),(x,2.48,1.45),.025,'black')
 for z in[-.35,.2,.75,1.45]:rod('roof rack crossbar',(-.87,2.43,z),(.87,2.43,z),.025,'black')
 box('cargo case',(.23,2.63,1.0),(1.1,.32,.6),'canvas',.08);torus('rear spare tire',(0,1.39,2.48),.4,.14,'rubber','z');cyl('spare rim',(0,1.39,2.58),.27,.24,'alloy','z')
 for x in[-.36,.36]:rod('windscreen wiper',(x,1.45,-.83),(x+.25,1.75,-.67),.012,'black')
 # Boolean wheel wells leave actual clearance around the moving tires.
 for z in[-1.43,1.47]:
  bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.65,depth=3.4,location=xyz((0,.55,z)));cut=bpy.context.object;cut.rotation_euler.y=math.pi/2
  for obj in list(bpy.context.scene.objects):
   if obj.name.startswith(('body tub','front wing','rear wing')):
    bpy.context.view_layer.objects.active=obj;mod=obj.modifiers.new('wheel arch cutout','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name)
  bpy.data.objects.remove(cut,do_unlink=True)
 export('car')
def wing(name,span,y,z,chord,material):
 pts=[];sections=[(-span/2,.72),(-span*.34,.92),(0,1),(span*.34,.92),(span/2,.72)];profile=[]
 for side in[1,-1]:
  us=[i/12 for i in range(13)];us=us if side==1 else us[::-1]
  for u in us:
   th=5*.12*(.2969*math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1015*u**4);profile.append((u,.025*math.sin(math.pi*u)+side*th))
 for x,scale in sections:
  for u,h in profile:pts.append((x,y+h*chord*scale,z+(u-.5)*chord*scale+abs(x/span)*.24))
 n=len(profile);faces=[]
 for j in range(len(sections)-1):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.extend([tuple(range(n-1,-1,-1)),tuple((len(sections)-1)*n+i for i in range(n))]);o=mesh(name,pts,faces,material,.015)
 for f in o.data.polygons:f.use_smooth=True
 return o
def airplane():
 global PART
 reset();sections=[(-3,.28,.32,1.45),(-2.6,.6,.6,1.4),(-1.5,.73,.66,1.35),(.1,.7,.65,1.35),(1.4,.43,.44,1.45),(2.7,.18,.23,1.6),(3.35,.08,.13,1.65)];pts=[]
 for z,rx,ry,cy in sections:
  for n in range(20):a=n*math.tau/20;pts.append((math.cos(a)*rx,cy+math.sin(a)*ry,z))
 faces=[]
 for j in range(len(sections)-1):
  for n in range(20):faces.append((j*20+n,j*20+(n+1)%20,(j+1)*20+(n+1)%20,(j+1)*20+n))
 faces.extend([tuple(range(19,-1,-1)),tuple(120+i for i in range(20))]);o=mesh('riveted fuselage',pts,faces,'cream');
 for f in o.data.polygons:f.use_smooth=True
 for side in[-1,1]:
  mesh('cabin glazing',[(side*.69,1.72,-1.25),(side*.65,2.45,-.95),(side*.62,2.45,.45),(side*.66,1.72,.7)],[(0,1,2,3)],'glass');rod('front cabin frame',(side*.69,1.72,-1.25),(side*.65,2.45,-.95),.035,'paint');rod('rear cabin frame',(side*.66,1.72,.7),(side*.62,2.45,.45),.035,'paint');rod('door frame',(side*.67,1.72,-.05),(side*.63,2.45,-.05),.025,'cream');box('door handle',(side*.72,1.68,.35),(.035,.04,.18),'alloy',.01);rod('wing strut',(side*.55,.95,.3),(side*3.6,2.58,-.05),.045,'alloy');rod('gear strut',(side*.45,1.0,.3),(side*1.18,.42,.35),.055,'black');wheel('wheel_left' if side<0 else 'wheel_right',(side*1.18,.43,.35),.42,.25)
  for n in range(18):cyl('rivet',(side*.74,1.52,-1.4+n*.12),.012,.018,'alloy','x',6)
 mesh('front glass',[(-.69,1.72,-1.25),(.69,1.72,-1.25),(.65,2.45,-.95),(-.65,2.45,-.95)],[(0,1,2,3)],'glass');box('cabin roof',(0,2.47,-.25),(1.35,.1,1.5),'cream',.04)
 wing('airfoil main wing',10.2,2.61,-.18,1.75,'cream');wing('horizontal tail',3.1,1.8,2.7,.9,'paint')
 mesh('vertical tail',[(-.07,1.65,2.2),(-.07,3.1,2.65),(-.07,3.16,3.15),(-.07,1.65,3.35),(.07,1.65,2.2),(.07,3.1,2.65),(.07,3.16,3.15),(.07,1.65,3.35)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'paint',.035)
 for side in[-1,1]:box('wing tip accent',(side*4.8,2.62,.05),(.48,.06,1.2),'paint',.04);cyl('navigation lamp',(side*5.05,2.66,-.28),.04,.04,'redlamp' if side<0 else 'greenlamp','y',12)
 rod('nose landing gear',(0,1.0,-2.05),(0,.3,-2.05),.06,'alloy');wheel('wheel_nose',(0,.3,-2.05),.29,.18)
 for x in[-.33,.33]:box('pilot seat',(x,1.65,-.2),(.52,.2,.62),'seat',.07);box('seat back',(x,1.95,.1),(.52,.58,.15),'seat',.07)
 box('instrument panel',(0,1.87,-.96),(1.1,.3,.12),'black',.05)
 for x in[-.34,0,.34]:cyl('flight instrument',(x,1.9,-.88),.09,.02,'instrument','z',24)
 PART='prop';ORIGINS[PART]=(0,1.46,-3.16);cyl('propeller hub',(0,1.46,-3.16),.19,.25,'alloy','z');box('propeller blade',(0,1.46,-3.28),(.13,2.5,.07),'black',.04)
 for side in[-1,1]:box('propeller safety tip',(0,1.46+side*1.1,-3.28),(.13,.24,.075),'yellow',.025)
 PART='body';export('airplane')
def export(kind):
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();groups={}
 for obj in list(bpy.context.scene.objects):
  if obj.type!='MESH':continue
  ev=obj.evaluated_get(dg);me=ev.to_mesh();me.calc_loop_triangles();normal_matrix=ev.matrix_world.to_3x3().inverted().transposed();part=obj.get('part','body');origin=ORIGINS[part]
  for tri in me.loop_triangles:
   material=me.materials[tri.material_index].name;key=part+'|'+material;g=groups.setdefault(key,{'part':part,'origin':origin,'material':material,'positions':[],'normals':[],'uv':[]})
   for li in tri.loops:
    v=me.vertices[me.loops[li].vertex_index];pt=game(ev.matrix_world@v.co);nn=game((normal_matrix@me.corner_normals[li].vector).normalized());g['positions'].extend(round(pt[i]-origin[i],5) for i in range(3));g['normals'].extend(round(a,5) for a in nn);g['uv'].extend(round(a,5) for a in (me.uv_layers.active.data[li].uv if me.uv_layers.active else (pt[0],pt[2])))
  ev.to_mesh_clear()
 (OUT/(kind+'.json')).write_text(json.dumps({'materials':META,'groups':list(groups.values())},separators=(',',':')))
 bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).parent/(kind+'.blend')))
 print(kind,'triangles',sum(len(g['positions'])//9 for g in groups.values()),'draw groups',len(groups))
mat('paint','#6c795b',.34,.28,texture='paint.png');mat('cream','#dddcc9',.38,.2);mat('rubber','#202320',.92);mat('alloy','#bfc4c5',.3,.7);mat('black','#252e2a',.52,.15);mat('glass','#9fc7c3',.15,.1,.42);mat('mirror','#8baba9',.12,.8);mat('seat','#68645b',.95,texture='seat.png');mat('canvas','#8e886b',.85);mat('lamp','#fff2cb',.25,emission=.5);mat('redlamp','#c6422e',.3,emission=.4);mat('greenlamp','#4cb57a',.3,emission=.4);mat('yellow','#e6c766',.42);mat('instrument','#263c42',.6)
car();airplane()
