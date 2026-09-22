shader_type spatial;
render_mode specular_schlick_ggx;
uniform sampler2D face_texture : source_color, filter_linear_mipmap_anisotropic, repeat_disable;
varying vec3 local_p;
varying vec3 local_n;
void vertex() { local_p = VERTEX; local_n = NORMAL; }
void fragment() {
 vec2 uv = local_p.xz / 0.29 * 0.90 + 0.5;
 float face = smoothstep(0.70,0.9,abs(local_n.y));
 vec3 token = texture(face_texture,uv).rgb;
 float relief = dot(token,vec3(0.299,0.587,0.114));
 ALBEDO = mix(vec3(0.48,0.51,0.55),vec3(relief)*vec3(0.98,1.0,1.025),face);
 METALLIC = 0.88;
 ROUGHNESS = mix(0.28,0.36-relief*0.12,face);
}
