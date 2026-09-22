shader_type sky;
uniform sampler2D panorama : source_color, filter_linear_mipmap, repeat_enable;
void sky() {
 vec3 d = normalize(EYEDIR);
 vec2 uv = vec2(atan(d.x,d.z)/6.28318530718+0.5,acos(clamp(d.y,-1.0,1.0))/3.14159265359);
 vec3 room = texture(panorama,uv).rgb;
 float luminance = dot(room,vec3(0.2126,0.7152,0.0722));
 // Neutralize the room's warm cast so nickel remains silver, brass remains brass.
 COLOR = mix(vec3(luminance),room,0.18)*2.7 + vec3(0.11,0.12,0.14)*max(0.0,d.y);
}
