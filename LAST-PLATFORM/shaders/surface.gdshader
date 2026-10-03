shader_type spatial;
uniform vec4 base_color : source_color = vec4(0.25, 0.3, 0.3, 1.0);
uniform float tile = 1.0;
uniform float rough = 0.7;
uniform float metal = 0.0;
uniform bool grid = false;
varying vec3 world_pos;
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
void vertex() { world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
 float noise = hash(floor(world_pos * 140.0));
 vec3 c = base_color.rgb * (0.93 + noise * 0.14);
 if (grid) {
   vec2 f = abs(fract(world_pos.xz / tile) - 0.5);
   float line = smoothstep(0.487, 0.495, max(f.x, f.y));
   c *= mix(1.0, 0.58, line);
 }
 ALBEDO = c;
 ROUGHNESS = rough;
 METALLIC = metal;
}
