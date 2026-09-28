shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never;
void fragment(){
 vec2 p=abs(UV-vec2(0.5));
 float a=(1.0-smoothstep(0.35,0.5,p.x))*(1.0-smoothstep(0.38,0.5,p.y));
 ALBEDO=vec3(0.012,0.018,0.022);
 ALPHA=a*0.75;
}
