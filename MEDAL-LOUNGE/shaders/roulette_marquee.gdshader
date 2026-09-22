shader_type spatial;
render_mode unshaded;
uniform float phase = 0.0;
uniform float energy = 0.2;
uniform float celebration = 0.0;
varying vec3 local_vertex;
void vertex() { local_vertex = VERTEX; }
void fragment() {
	float angle = atan(local_vertex.x, local_vertex.z);
	float bulb = smoothstep(0.1,0.4,abs(sin(angle*32.0)));
	float chase = pow(0.5+0.5*cos(angle-phase),7.0);
	vec3 warm = mix(vec3(1.0,0.61,0.17),vec3(1.0,0.86,0.44),celebration);
	ALBEDO = warm*(0.06+bulb*0.15);
	EMISSION = warm*bulb*energy*(0.28+chase*1.8+celebration*0.8);
}
