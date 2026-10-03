shader_type canvas_item;
uniform float strength = 0.32;
void fragment() {
 vec2 p = UV * 2.0 - 1.0;
 float vignette = smoothstep(0.35, 1.5, length(p)) * strength;
 float noise = fract(sin(dot(UV * 1300.0 + mod(TIME, 10.0), vec2(12.9898, 78.233))) * 43758.5453);
 COLOR = vec4(0.008, 0.014, 0.017, vignette + noise * 0.025);
}
