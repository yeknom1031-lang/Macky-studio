shader_type spatial;
uniform sampler2D surface_texture : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec4 tint : source_color = vec4(0.88,0.86,0.82,1.0);
uniform float texture_scale = 0.5;
uniform float roughness_base = 0.6;
uniform float relief = 0.16;
uniform bool floor_surface = false;
uniform float wetness = 0.0;
varying vec3 world_position;
varying vec3 world_normal;
void vertex() {
 world_position=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;
 world_normal=normalize(MODEL_NORMAL_MATRIX*NORMAL);
}
void fragment() {
 vec3 weights=pow(abs(world_normal),vec3(12.0));
 weights/=max(dot(weights,vec3(1.0)),0.0001);
 vec3 p=world_position*texture_scale;
 vec3 scan=texture(surface_texture,p.zy).rgb*weights.x+texture(surface_texture,p.xz).rgb*weights.y+texture(surface_texture,p.xy).rgb*weights.z;
 float mineral=dot(scan,vec3(0.333));
 float grout=0.0;
 if(floor_surface){
   vec2 cells=abs(fract(world_position.xz/2.5-0.5)-0.5)*2.5;
   float edge=min(cells.x,cells.y);
   float aa=max(fwidth(edge),0.001);
   grout=1.0-smoothstep(0.009-aa,0.009+aa,edge);
 }
 ALBEDO=mix(vec3(0.88),scan,0.65)*tint.rgb*(1.0-grout*0.32)*(1.0-wetness*0.12);
 ROUGHNESS=clamp(roughness_base+(mineral-0.7)*0.22+grout*0.3-wetness*0.38,0.09,0.9);
 SPECULAR=0.42;
 METALLIC=0.0;
 // Fine height variation from the scan catches grazing light without painted shadows.
 vec3 dpdx=dFdx(VERTEX), dpdy=dFdy(VERTEX);
 vec3 r1=cross(dpdy,NORMAL),r2=cross(NORMAL,dpdx);
 float det=dot(dpdx,r1);
 vec3 grad=sign(det)*(dFdx(mineral)*r1+dFdy(mineral)*r2);
 NORMAL=normalize(abs(det)*NORMAL-relief*0.0008*grad);
}
