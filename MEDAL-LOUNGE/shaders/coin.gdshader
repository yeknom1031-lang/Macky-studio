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
 float engraving = clamp((relief-0.22)*2.3+0.38,0.12,0.88);
 // Derivative bump mapping uses the generated relief without another texture fetch.
 vec3 dp1 = dFdx(VERTEX);
 vec3 dp2 = dFdy(VERTEX);
 vec3 r1 = cross(dp2,NORMAL);
 vec3 r2 = cross(NORMAL,dp1);
 float determinant = dot(dp1,r1);
 vec3 gradient = dFdx(relief)*r1+dFdy(relief)*r2;
 NORMAL = normalize(abs(determinant)*NORMAL-sign(determinant)*gradient*0.002*face);
 ALBEDO = mix(vec3(0.52,0.55,0.59),vec3(engraving)*vec3(0.97,1.0,1.035),face);
 METALLIC = 0.86;
 ROUGHNESS = mix(0.23,0.40-relief*0.10,face);
}
