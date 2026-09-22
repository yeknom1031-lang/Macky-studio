shader_type sky;
void sky() {
 vec3 d = EYEDIR;
 vec3 c = mix(vec3(0.055,0.065,0.09),vec3(0.26,0.30,0.38),max(d.y,0.0));
 float left = smoothstep(0.965,0.98,dot(d,normalize(vec3(-0.9,0.5,0.3))));
 float right = smoothstep(0.97,0.985,dot(d,normalize(vec3(0.8,0.7,0.15))));
 float top = smoothstep(0.90,0.94,d.y) * smoothstep(0.02,0.0,abs(d.x)-0.20);
 c += left*vec3(3.7,2.7,1.6)+right*vec3(2.3,3.0,3.7)+top*vec3(1.5);
 COLOR = c;
}
