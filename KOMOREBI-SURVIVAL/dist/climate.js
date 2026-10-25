(() => {
  const clamp = (value, lower, upper) => Math.max(lower, Math.min(upper, value));
  const smooth = (value) => { const amount = clamp(value, 0, 1); return amount * amount * (3 - 2 * amount); };
  class WorldClimate {
    constructor(saved = {}) { this.restore(saved); }
    restore(saved = {}) {
      this.worldTime = Number.isFinite(saved.worldTime) && saved.worldTime >= 0 ? saved.worldTime : (Number.isFinite(saved.day) ? ((saved.day % 1) + 1) % 1 : 0.36) * 720;
      this.dayLength = [240, 720, 1440].includes(saved.dayLength) ? saved.dayLength : 720;
      this.automatic = saved.automaticTime !== false;
      this.weatherMode = ['clear', 'cloudy', 'rain'].includes(saved.weatherMode) ? saved.weatherMode : 'auto';
    }
    get worldDays() { return this.worldTime / 720; }
    get day() { return this.worldDays % 1; }
    advance(seconds) {
      if (this.automatic && Number.isFinite(seconds) && seconds > 0) this.worldTime += seconds * 720 / this.dayLength;
    }
    setDay(day) {
      if (Number.isFinite(day)) this.worldTime = (Math.floor(this.worldDays) + clamp(day, 0, 0.999999)) * 720;
    }
    snapshot() {
      return { worldTime: this.worldTime, day: this.day, dayLength: this.dayLength, automaticTime: this.automatic, weatherMode: this.weatherMode };
    }
    sample(east = 0, north = 0) {
      const fronts = [0.05, 0.24, 0.90, 0.58, 0.09, 0.36, 0.97, 0.28];
      const phase = (this.worldTime - 259.2) / 113;
      const step = Math.floor(phase), index = ((step % fronts.length) + fronts.length) % fronts.length;
      const blend = smooth(phase - step);
      const spatial = (Math.sin(east / 4700 + north / 6200) + Math.sin(north / 3500 - east / 5800)) * 0.035;
      const cloudCover = this.weatherMode === 'clear' ? 0.06 : this.weatherMode === 'cloudy' ? 0.58 : this.weatherMode === 'rain' ? 0.96 : clamp(fronts[index] * (1 - blend) + fronts[(index + 1) % fronts.length] * blend + spatial, 0, 1);
      const rainfall = smooth((cloudCover - 0.63) / 0.32);
      const night = 1 - smooth((Math.sin((this.day - 0.25) * Math.PI * 2) + 0.08) / 0.28);
      const dawn = Math.exp(-Math.pow((this.day - 0.25) / 0.055, 2));
      return {
        cloudCover, rainfall, night,
        wind: 0.16 + cloudCover * 0.6 + rainfall * 0.24,
        fog: 0.00042 + cloudCover * 0.00016 + rainfall * 0.00065 + dawn * 0.00016,
        label: rainfall > 0.6 ? '雨' : rainfall > 0.04 ? '小雨' : cloudCover > 0.48 ? '曇り' : cloudCover > 0.22 ? '晴れ間' : '晴れ',
        period: this.day < 0.21 || this.day >= 0.8 ? '夜' : this.day < 0.3 ? '夜明け' : this.day < 0.68 ? '昼' : '夕暮れ'
      };
    }
  }
  window.WorldClimate = WorldClimate;
})();
