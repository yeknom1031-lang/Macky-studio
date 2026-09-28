shader_type spatial;
uniform vec4 tint : source_color = vec4(0.82,0.85,0.87,1.0);
uniform float tile_size = 3.0;
uniform float grain_amount = 0.015;
uniform bool floor_surface = false;
varying vec3 local_pos;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void vertex() { local_pos = (MODEL_MATRIX * vec4(VERTEX,1.0)).xyz; }
void fragment() {
 vec2 p = floor_surface ? local_pos.xz : UV * 22.0;
 vec2 cells = abs(fract(p/tile_size-0.5)-0.5)*tile_size;
 float distance_to_line = min(cells.x,cells.y);
 float antialias = max(fwidth(distance_to_line),0.003);
 float grid = floor_surface ? 1.0-smoothstep(0.012-antialias,0.012+antialias,distance_to_line) : 0.0;
 float grain=(hash(floor(p*260.0))-0.5)*grain_amount;
 float broad=sin(p.x*2.1)*sin(p.y*3.7)*0.005;
 ALBEDO=tint.rgb*(1.0-grid*0.14)+grain+broad;
 ROUGHNESS=floor_surface ? 0.3 : 0.71;
 METALLIC=0.04;
 SPECULAR=0.4;
}
