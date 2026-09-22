shader_type spatial;
render_mode specular_schlick_ggx;
varying vec3 local_p;
varying vec3 local_n;
void vertex() { local_p = VERTEX; local_n = NORMAL; }
void fragment() {
 vec2 p = local_p.xz / 0.145;
 float r = length(p);
 float a = atan(p.y, p.x);
 float face = step(0.7, abs(local_n.y));
 float rings = exp(-pow((r-0.83)*150.0,2.0)) + exp(-pow((r-0.68)*180.0,2.0));
 float wreath = step(0.90, sin(a*42.0)) * smoothstep(0.70,0.73,r) * (1.0-smoothstep(0.79,0.82,r));
 float star_radius = mix(0.24,0.51,pow(0.5+0.5*cos(a*5.0-1.57),2.0));
 float star = 1.0-smoothstep(star_radius-0.018,star_radius+0.018,r);
 float grain = 0.5+0.5*sin(p.x*150.0+p.y*87.0);
 float scratch = pow(0.5+0.5*sin(p.x*200.0+p.y*21.0),36.0)*0.014;
 float ridges = 0.5+0.5*sin(a*110.0);
 float engraved = clamp(rings+star+wreath,0.0,1.0)*face;
 ALBEDO = vec3(0.62,0.65,0.69)*(0.78+0.22*face) - engraved*0.34 + grain*0.008 + scratch;
 METALLIC = 0.91;
 ROUGHNESS = mix(0.27,0.40,engraved) + grain*0.008 + (1.0-face)*ridges*0.06;
}
