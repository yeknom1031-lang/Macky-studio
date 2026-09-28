shader_type spatial;
void fragment() {
 float grain=sin(UV.x*390.0+sin(UV.y*15.0)*2.0+sin(UV.x*28.0)*6.0)*0.012;
 ALBEDO=vec3(0.91,0.918,0.918)+grain;
 ROUGHNESS=0.59;
 SPECULAR=0.3;
}
