/* 60 generated flame drawings, shared atlas, continuous 45 fps loop. */
(()=>{'use strict';const T=THREE,P=EmberWorld.prototype;
const frameAt=t=>((t*45)%60+60)%60;
P.fireVisual=function(s){if(!this.fireMaterial){const map=this.loader.load('assets/survival/fire/flame-atlas.png?v=2');map.encoding=T.sRGBEncoding;map.minFilter=T.LinearFilter;map.magFilter=T.LinearFilter;map.generateMipmaps=false;this.firePhase={value:0};this.fireMaterial=new T.SpriteMaterial({map,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:true,opacity:.95});const phase=this.firePhase;this.fireMaterial.onBeforeCompile=shader=>{shader.uniforms.flamePhase=phase;shader.fragmentShader='uniform float flamePhase;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
#ifdef USE_MAP
float a=floor(flamePhase),b=mod(a+1.0,60.0);
vec2 uv=(vec2(2.0)+clamp(vUv,0.0,1.0)*160.0)/164.0;
vec2 ca=vec2(mod(a,10.0),5.0-floor(a/10.0));
vec2 cb=vec2(mod(b,10.0),5.0-floor(b/10.0));
vec4 first=mapTexelToLinear(texture2D(map,(ca+uv)/vec2(10.0,6.0)));
vec4 next=mapTexelToLinear(texture2D(map,(cb+uv)/vec2(10.0,6.0)));
vec4 texelColor=mix(first,next,smoothstep(0.0,1.0,fract(flamePhase)));
diffuseColor*=texelColor;
#endif
`);};this.fireMaterial.customProgramCacheKey=()=> 'generated-campfire-60-v2';}
const flame=new T.Sprite(this.fireMaterial);flame.position.y=.99;flame.scale.set(1.65,1.65,1);flame.visible=!!s.lit;flame.userData.frameCount=60;return flame;};
P.updateFires=function(t){if(this.firePhase)this.firePhase.value=frameAt(t);for(const g of this.dynamic.children){const light=g.userData.light;if(!g.userData.flame||!light)continue;const flicker=Math.sin(t*12.15+g.position.x)*.11+Math.sin(t*25.95+g.position.z)*.06;light.intensity=1.65+flicker;light.distance=14+flicker;}};
window.SurvivalFire={frameAt,frames:60,fps:45};
})();
