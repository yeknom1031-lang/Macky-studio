shader_type spatial;
uniform float phase=0.0;
varying vec3 p;
void vertex(){p=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;}
void fragment(){
 float a=sin(p.x*4.0+p.z*2.7+phase)*0.012;
 float b=sin(p.z*6.1-p.x*1.9-phase*0.7)*0.009;
 NORMAL_MAP=vec3(0.5+a,0.5+b,1.0);
 ALBEDO=vec3(0.22,0.27,0.29);
 METALLIC=0.65;
 ROUGHNESS=0.075;
 SPECULAR=0.85;
}
