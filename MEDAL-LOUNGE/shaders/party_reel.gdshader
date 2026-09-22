shader_type spatial;
render_mode unshaded;
uniform sampler2D symbols : source_color, filter_linear_mipmap;
uniform float offset = -0.3;
uniform float winning = 0.0;
void fragment() {
	float y = UV.y * 1.6 + offset;
	float icon = mod(floor(y),6.0);
	vec2 cell = vec2(mod(icon,3.0),floor(icon/3.0));
	vec2 atlas_uv = (cell + vec2(UV.x,clamp(fract(y),0.003,0.997))) / vec2(3.0,2.0);
	vec3 tex = texture(symbols,atlas_uv).rgb;
	float curve = 0.42 + 0.58 * pow(sin(UV.y * 3.14159265),0.5);
	ALBEDO = tex * curve;
	EMISSION = tex * (0.15 + winning * 0.7);
}
