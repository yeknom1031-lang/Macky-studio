shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
uniform float phase=0.0;
uniform float opacity=1.0;
void fragment() {
	vec2 p=UV-vec2(0.5,0.5);
	float edge=sin(p.y*39.0+phase*2.0)*0.025+sin(p.y*87.0-phase)*0.01;
	float width=mix(0.09,0.28,smoothstep(-0.25,0.4,p.y));
	float body=(1.0-smoothstep(width+edge,width+edge+0.07,abs(p.x)))*smoothstep(-0.4,-0.2,p.y);
	float head=1.0-smoothstep(0.07,0.115,length((p-vec2(0.0,-0.28))*vec2(1.0,0.7)));
	float shape=max(body,head)*(1.0-smoothstep(0.35,0.5,p.y));
	ALBEDO=vec3(0.006,0.009,0.013)+vec3(0.09,0.105,0.12)*pow(1.0-shape,4.0);
	ALPHA=shape*opacity;
}
