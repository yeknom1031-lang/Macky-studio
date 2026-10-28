(() => {
  class Atmosphere {
    constructor(scene) {
      this.sunDirection = new THREE.Vector3();
      this.moonDirection = new THREE.Vector3();
      this.moonRight = new THREE.Vector3();
      this.moonUp = new THREE.Vector3();
      this.orbitAxis = new THREE.Vector3(0, 0, 1);
      this.horizon = new THREE.Color();
      this.zenith = new THREE.Color();
      this.duskHorizon = new THREE.Color(0.72, 0.36, 0.17);
      this.weatherHorizon = new THREE.Color();
      this.cloudTexture = new THREE.TextureLoader().load('assets/originals/cloud-panorama.png');
      this.cloudTexture.wrapS = THREE.RepeatWrapping; this.cloudTexture.anisotropy = 4;
      this.material = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        uniforms: { cloudLayer: { value: this.cloudTexture }, sunDirection: { value: this.sunDirection }, moonDirection: { value: this.moonDirection }, moonRight: { value: this.moonRight }, moonUp: { value: this.moonUp }, moonlight: { value: 0 }, night: { value: 0 }, daylight: { value: 1 }, dusk: { value: 0 }, cloudCover: { value: 0.35 }, weather: { value: 0 }, clock: { value: 0 }, observer: { value: new THREE.Vector3() } },
        vertexShader: 'varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: `
          varying vec3 vSky;
          uniform vec3 sunDirection;
          uniform vec3 moonDirection;
          uniform vec3 moonRight;
          uniform vec3 moonUp;
          uniform vec3 observer;
          uniform float daylight;
          uniform float dusk;
          uniform float night;
          uniform float moonlight;
          uniform float cloudCover;
          uniform float weather;
          uniform float clock;
          uniform sampler2D cloudLayer;
          vec4 sampleCloud(vec2 coordinate) {
            coordinate.x = fract(coordinate.x);
            vec4 primary = texture2D(cloudLayer,coordinate);
            vec4 overlap = texture2D(cloudLayer,vec2(fract(coordinate.x+0.5),coordinate.y));
            return mix(primary,overlap,smoothstep(0.88,1.0,abs(coordinate.x-0.5)*2.0));
          }
          float hashCloud(vec3 point) {
            point = fract(point * 0.1031); point += dot(point, point.yzx + 33.33);
            return fract((point.x + point.y) * point.z);
          }
          float cloudNoise(vec3 point) {
            vec3 cell = floor(point), fraction = fract(point); fraction = fraction * fraction * (3.0 - 2.0 * fraction);
            return mix(mix(mix(hashCloud(cell), hashCloud(cell + vec3(1,0,0)), fraction.x), mix(hashCloud(cell + vec3(0,1,0)), hashCloud(cell + vec3(1,1,0)), fraction.x), fraction.y), mix(mix(hashCloud(cell + vec3(0,0,1)), hashCloud(cell + vec3(1,0,1)), fraction.x), mix(hashCloud(cell + vec3(0,1,1)), hashCloud(cell + vec3(1,1,1)), fraction.x), fraction.y), fraction.z);
          }
          float cloudField(vec3 point) {
            float value = cloudNoise(point) * 0.58;
            point = point * 2.03 + vec3(7.2, 3.1, 4.9); value += cloudNoise(point) * 0.28;
            return value + cloudNoise(point * 2.01 + vec3(2.5, 6.7, 1.3)) * 0.14;
          }
          void main() {
            vec3 direction = normalize(vSky);
            float elevation = max(0.0, direction.y);
            float sunAngle = clamp(dot(direction, sunDirection), -1.0, 1.0);
            float airMass = exp(-elevation * 5.5);
            vec3 blue = vec3(0.12, 0.30, 0.56);
            vec3 haze = vec3(0.56, 0.67, 0.72);
            float rayleighPhase = 0.75 * (1.0 + sunAngle * sunAngle);
            vec3 sky = mix(blue * (0.8 + rayleighPhase * 0.2), haze, airMass * 0.83);
            float miePhase = 0.012 / pow(max(0.025, 1.0 + 0.82 * 0.82 - 1.64 * sunAngle), 1.5);
            sky += vec3(0.98, 0.83, 0.64) * miePhase * daylight * 0.4;
            vec3 sunset = mix(vec3(0.11,0.12,0.19), vec3(0.85,0.32,0.10), airMass * (0.35 + 0.65 * pow(max(0.0, sunAngle), 3.0)));
            sky = mix(sky, sunset, dusk * 0.85);
            vec3 nightSky = vec3(0.011,0.019,0.038) + vec3(0.016,0.023,0.031) * airMass;
            nightSky += vec3(0.013,0.017,0.026) * moonlight;
            float skyLight = smoothstep(-0.29,0.34,sunDirection.y);
            sky = mix(nightSky, sky, skyLight);
            sky = mix(sky, vec3(0.30,0.36,0.39) * (0.075 + skyLight * 0.925 + moonlight * 0.065), weather * 0.6);
            float solarDisc = smoothstep(0.999985, 0.999988, sunAngle) * smoothstep(-0.025, 0.02, sunDirection.y);
            sky += vec3(1.0,0.87,0.65) * solarDisc * 7.0;
            float moonAngle = clamp(dot(direction, moonDirection), -1.0, 1.0);
            float lunarHorizon = smoothstep(-0.025,0.035,moonDirection.y);
            float lunarHalo = exp((moonAngle-1.0)*1800.0)*0.034 + exp((moonAngle-1.0)*180.0)*0.006;
            sky += vec3(0.58,0.68,0.87)*lunarHalo*moonlight;
            if (moonAngle > 0.999982 && direction.y > -0.015) {
              vec2 lunarUv = vec2(dot(direction,moonRight),dot(direction,moonUp))/0.0052;
              float lunarRadius = length(lunarUv), lunarEdge = 1.0-smoothstep(0.94,1.04,lunarRadius);
              if (lunarRadius < 1.04) {
                float lunarDepth = sqrt(max(0.0,1.0-dot(lunarUv,lunarUv)));
                vec3 lunarNormal = moonRight*lunarUv.x + moonUp*lunarUv.y - moonDirection*lunarDepth;
                float lunarSun = smoothstep(-0.025,0.055,dot(lunarNormal,sunDirection));
                float mare = smoothstep(0.3,0.68,cloudField(vec3(lunarUv*4.6,lunarDepth*3.2)+vec3(13.1,7.2,3.8)));
                float craters = 1.0;
                for (int crater = 0; crater < 10; crater++) {
                  float seed = float(crater)+1.0;
                  vec2 center = vec2(hashCloud(vec3(seed,3.1,7.2)),hashCloud(vec3(seed,8.2,1.4)))*1.7-0.85;
                  float radius = 0.035+hashCloud(vec3(seed,2.7,5.1))*0.085;
                  float distance = length(lunarUv-center)/radius;
                  craters -= (1.0-smoothstep(0.35,0.8,distance))*0.12;
                  craters += (smoothstep(0.65,0.85,distance)-smoothstep(0.9,1.16,distance))*0.11;
                }
                vec3 lunarAlbedo = mix(vec3(0.36,0.39,0.42),vec3(0.86,0.84,0.78),mare)*craters;
                float limbLight = 0.63+0.37*lunarDepth;
                vec3 lunarColor = lunarAlbedo*limbLight*(lunarSun*1.65+night*0.028);
                float lunarOpacity = lunarEdge*lunarHorizon*mix(lunarSun*0.45,1.0,night);
                sky = mix(sky,lunarColor,lunarOpacity);
              }
            }
            if (direction.y > 0.008) {
              vec3 drift = vec3(clock*0.0008,clock*0.00017,clock*0.00043);
              float shape = cloudNoise(direction*3.8+drift+vec3(observer.x*0.00002,8.0,observer.z*0.00002));
              float detail = cloudNoise(direction*9.3+drift*0.61+vec3(9.2,3.7,6.4));
              float longitude = atan(direction.z,direction.x);
              float latitude = asin(clamp(direction.y,0.0,1.0))*0.63661977;
              vec2 distortion = vec2(shape-0.5,detail-0.5)*vec2(0.065,0.04);
              vec2 cloudUv = vec2(longitude*0.47746483+0.5+clock*0.000018+observer.x*0.0000008,clamp(latitude*1.3+distortion.y,0.0,1.0));
              cloudUv.x += distortion.x;
              vec4 cloud = sampleCloud(cloudUv);
              vec2 highUv = vec2(longitude*0.31830989+0.17-clock*0.000009+observer.z*0.0000005,clamp(latitude*0.9+0.09-distortion.y*0.45,0.0,1.0));
              highUv.x -= distortion.x*0.6;
              vec4 highCloud = sampleCloud(highUv);
              float highOpacity = highCloud.a*smoothstep(0.015,0.12,direction.y)*(0.04+cloudCover*0.26)*(0.65+detail*0.35);
              float highLight = dot(highCloud.rgb,vec3(0.22,0.70,0.08));
              vec3 highShade = mix(vec3(0.44,0.51,0.60),vec3(0.96,0.96,0.94),highLight);
              highShade = mix(highShade,highShade*vec3(1.25,0.79,0.57),dusk*0.55);
              highShade *= 0.03+daylight*(0.98-weather*0.27)+dusk*0.17+moonlight*0.1;
              sky = mix(sky,highShade,highOpacity);
              float photoLight = dot(cloud.rgb,vec3(0.22,0.70,0.08));
              vec3 cloudLightDirection = mix(sunDirection,moonDirection,night);
              vec2 lightOffset = vec2(dot(cloudLightDirection.xz,vec2(-direction.z,direction.x)),cloudLightDirection.y)*0.006;
              vec4 sunward = sampleCloud(cloudUv+lightOffset);
              float relief = clamp(cloud.a-sunward.a,-0.3,0.3);
              float formation = smoothstep(0.23,0.72,shape+cloudCover*0.72-0.28);
              float opacity = cloud.a*smoothstep(0.008,0.065,direction.y)*formation*(0.7+cloudCover*0.3);
              float illumination = clamp(pow(photoLight,1.4)+relief*0.35,0.0,1.0);
              vec3 shade = mix(vec3(0.22,0.28,0.36),vec3(0.98,0.97,0.93),illumination);
              shade += mix(vec3(0.7,0.58,0.39),vec3(0.42,0.52,0.68),night)*max(0.0,relief)*pow(max(0.0,dot(direction,cloudLightDirection)),6.0);
              shade = mix(shade,shade*vec3(1.5,0.72,0.37),dusk*0.65);
              shade *= 0.026+daylight*(1.05-weather*0.4)+dusk*0.14+moonlight*(0.075+pow(max(0.0,moonAngle),8.0)*0.07);
              sky = mix(sky,shade,opacity);
              if (weather > 0.01) {
                float overcast = smoothstep(0.18,0.65,shape*0.55+detail*0.45)*weather;
                sky = mix(sky,vec3(0.22,0.28,0.34)*(0.065+daylight*0.75+moonlight*0.11),overcast*0.82);
              }
            }
            gl_FragColor = vec4(max(sky, vec3(0.0)),1.0);
            #include <tonemapping_fragment>
            #include <encodings_fragment>
          }
        `
      });
      this.dome = new THREE.Mesh(new THREE.SphereGeometry(4800, 32, 20), this.material); this.dome.renderOrder = -10; this.dome.frustumCulled = false; scene.add(this.dome);
    }
    update(camera, day, time, weather, east, north, worldDays) {
      weather = THREE.MathUtils.clamp(weather, 0, 1);
      const phase = (day - 0.25) * Math.PI * 2;
      this.sunDirection.set(Math.cos(phase) * 0.94, Math.sin(phase) * 0.94, -0.34).normalize();
      const lunarDays = Number.isFinite(worldDays) ? worldDays : time / 720;
      const lunarPhase = ((lunarDays / 29.53 + 0.47) % 1 + 1) % 1 * Math.PI * 2;
      this.moonDirection.set(Math.cos(phase-lunarPhase)*0.94,Math.sin(phase-lunarPhase)*0.94,-0.34*Math.cos(lunarPhase)+0.06*Math.sin(lunarPhase)).normalize();
      this.moonRight.crossVectors(this.orbitAxis,this.moonDirection).normalize();
      this.moonUp.crossVectors(this.moonDirection,this.moonRight).normalize();
      const daylight = Math.max(0, this.sunDirection.y), dusk = (1-THREE.MathUtils.smoothstep(Math.abs(this.sunDirection.y-0.025),0.01,0.32))*THREE.MathUtils.smoothstep(this.sunDirection.y,-0.23,0.02);
      const skyLight = THREE.MathUtils.smoothstep(this.sunDirection.y,-0.29,0.34);
      const night = 1-THREE.MathUtils.smoothstep(this.sunDirection.y,-0.12,0.1);
      const cloudCover = THREE.MathUtils.clamp(weather+Math.sin(time/115+east*0.00005)*0.035+Math.sin(time/271+north*0.00005)*0.025,0.015,0.98);
      const moonPhase = THREE.MathUtils.clamp((1-this.sunDirection.dot(this.moonDirection))*0.5,0,1);
      const moonlight = night*THREE.MathUtils.smoothstep(this.moonDirection.y,0,0.42)*Math.pow(moonPhase,0.7)*(1-cloudCover*0.82)*(1-weather*0.25);
      this.material.uniforms.daylight.value = daylight; this.material.uniforms.dusk.value = dusk;
      this.material.uniforms.night.value = night; this.material.uniforms.moonlight.value = moonlight; this.material.uniforms.cloudCover.value = cloudCover;
      this.material.uniforms.weather.value = weather; this.material.uniforms.clock.value = time;
      this.material.uniforms.observer.value.set(east, camera.position.y, north); this.dome.position.copy(camera.position);
      this.horizon.setRGB(0.36, 0.49, 0.59).lerp(this.duskHorizon, dusk * 0.6).multiplyScalar(0.075 + skyLight * 0.925 + moonlight * 0.06 + dusk * 0.055);
      this.weatherHorizon.setRGB(0.22, 0.28, 0.31).multiplyScalar(0.11 + skyLight * 0.89 + moonlight * 0.06);
      this.horizon.lerp(this.weatherHorizon, weather * 0.5);
      this.zenith.setRGB(0.12, 0.30, 0.56).multiplyScalar(0.055 + skyLight * 0.945 + moonlight * 0.055);
      return { daylight, skyLight, dusk, moonlight, cloudCover, moonPhase };
    }
  }
  window.Atmosphere = Atmosphere;
})();
