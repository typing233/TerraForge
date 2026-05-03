export const TimeOfDay = {
  MIDNIGHT: 'midnight',
  DAWN: 'dawn',
  MORNING: 'morning',
  NOON: 'noon',
  AFTERNOON: 'afternoon',
  SUNSET: 'sunset',
  DUSK: 'dusk',
  NIGHT: 'night'
};

export const TimePreset = {
  SUNRISE: 'sunrise',
  NOON: 'noon',
  SUNSET: 'sunset',
  STARRY_NIGHT: 'starry_night'
};

export class LightState {
  constructor(options = {}) {
    this.timeOfDay = options.timeOfDay || TimeOfDay.NOON;
    this.timeProgress = options.timeProgress !== undefined ? options.timeProgress : 0.5;
    
    this.sunPosition = options.sunPosition || { x: 50, y: 100, z: 50 };
    this.sunIntensity = options.sunIntensity !== undefined ? options.sunIntensity : 1.2;
    this.sunColor = options.sunColor || { r: 1, g: 1, b: 1 };
    
    this.ambientIntensity = options.ambientIntensity !== undefined ? options.ambientIntensity : 0.5;
    this.ambientColor = options.ambientColor || { r: 0.25, g: 0.25, b: 0.37 };
    
    this.fogDensity = options.fogDensity !== undefined ? options.fogDensity : 0.002;
    this.fogColor = options.fogColor || { r: 0.1, g: 0.1, b: 0.18 };
    
    this.skyColor = options.skyColor || { r: 0.53, g: 0.81, b: 0.92 };
    this.horizonColor = options.horizonColor || { r: 0.8, g: 0.9, b: 1.0 };
    
    this.starsEnabled = options.starsEnabled !== undefined ? options.starsEnabled : false;
    this.starsIntensity = options.starsIntensity !== undefined ? options.starsIntensity : 0.0;
    
    this.moonEnabled = options.moonEnabled !== undefined ? options.moonEnabled : false;
    this.moonIntensity = options.moonIntensity !== undefined ? options.moonIntensity : 0.0;
  }
  
  clone() {
    return new LightState({
      timeOfDay: this.timeOfDay,
      timeProgress: this.timeProgress,
      sunPosition: { ...this.sunPosition },
      sunIntensity: this.sunIntensity,
      sunColor: { ...this.sunColor },
      ambientIntensity: this.ambientIntensity,
      ambientColor: { ...this.ambientColor },
      fogDensity: this.fogDensity,
      fogColor: { ...this.fogColor },
      skyColor: { ...this.skyColor },
      horizonColor: { ...this.horizonColor },
      starsEnabled: this.starsEnabled,
      starsIntensity: this.starsIntensity,
      moonEnabled: this.moonEnabled,
      moonIntensity: this.moonIntensity
    });
  }
  
  toJSON() {
    return {
      timeOfDay: this.timeOfDay,
      timeProgress: this.timeProgress,
      sunPosition: { ...this.sunPosition },
      sunIntensity: this.sunIntensity,
      sunColor: { ...this.sunColor },
      ambientIntensity: this.ambientIntensity,
      ambientColor: { ...this.ambientColor },
      fogDensity: this.fogDensity,
      fogColor: { ...this.fogColor },
      skyColor: { ...this.skyColor },
      horizonColor: { ...this.horizonColor },
      starsEnabled: this.starsEnabled,
      starsIntensity: this.starsIntensity,
      moonEnabled: this.moonEnabled,
      moonIntensity: this.moonIntensity
    };
  }
  
  static fromJSON(json) {
    return new LightState(json);
  }
  
  static lerp(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    
    const lerpColor = (ca, cb, ct) => ({
      r: ca.r + (cb.r - ca.r) * ct,
      g: ca.g + (cb.g - ca.g) * ct,
      b: ca.b + (cb.b - ca.b) * ct
    });
    
    const lerpVec3 = (va, vb, vt) => ({
      x: va.x + (vb.x - va.x) * vt,
      y: va.y + (vb.y - va.y) * vt,
      z: va.z + (vb.z - va.z) * vt
    });
    
    return new LightState({
      timeProgress: a.timeProgress + (b.timeProgress - a.timeProgress) * t,
      sunPosition: lerpVec3(a.sunPosition, b.sunPosition, t),
      sunIntensity: a.sunIntensity + (b.sunIntensity - a.sunIntensity) * t,
      sunColor: lerpColor(a.sunColor, b.sunColor, t),
      ambientIntensity: a.ambientIntensity + (b.ambientIntensity - a.ambientIntensity) * t,
      ambientColor: lerpColor(a.ambientColor, b.ambientColor, t),
      fogDensity: a.fogDensity + (b.fogDensity - a.fogDensity) * t,
      fogColor: lerpColor(a.fogColor, b.fogColor, t),
      skyColor: lerpColor(a.skyColor, b.skyColor, t),
      horizonColor: lerpColor(a.horizonColor, b.horizonColor, t),
      starsEnabled: t > 0.5 ? b.starsEnabled : a.starsEnabled,
      starsIntensity: a.starsIntensity + (b.starsIntensity - a.starsIntensity) * t,
      moonEnabled: t > 0.5 ? b.moonEnabled : a.moonEnabled,
      moonIntensity: a.moonIntensity + (b.moonIntensity - a.moonIntensity) * t
    });
  }
}

export function getPresetLightStates() {
  const presetStates = {};
  
  presetStates[TimePreset.SUNRISE] = new LightState({
    timeOfDay: TimeOfDay.DAWN,
    timeProgress: 0.1,
    sunPosition: { x: -80, y: 20, z: 0 },
    sunIntensity: 0.6,
    sunColor: { r: 1.0, g: 0.6, b: 0.3 },
    ambientIntensity: 0.3,
    ambientColor: { r: 0.8, g: 0.5, b: 0.4 },
    fogDensity: 0.005,
    fogColor: { r: 1.0, g: 0.6, b: 0.4 },
    skyColor: { r: 1.0, g: 0.5, b: 0.3 },
    horizonColor: { r: 1.0, g: 0.8, b: 0.6 },
    starsEnabled: false,
    starsIntensity: 0.0,
    moonEnabled: false,
    moonIntensity: 0.0
  });
  
  presetStates[TimePreset.NOON] = new LightState({
    timeOfDay: TimeOfDay.NOON,
    timeProgress: 0.5,
    sunPosition: { x: 0, y: 150, z: 50 },
    sunIntensity: 1.5,
    sunColor: { r: 1.0, g: 0.98, b: 0.95 },
    ambientIntensity: 0.5,
    ambientColor: { r: 0.53, g: 0.81, b: 0.92 },
    fogDensity: 0.002,
    fogColor: { r: 0.53, g: 0.81, b: 0.92 },
    skyColor: { r: 0.33, g: 0.61, b: 0.85 },
    horizonColor: { r: 0.8, g: 0.9, b: 1.0 },
    starsEnabled: false,
    starsIntensity: 0.0,
    moonEnabled: false,
    moonIntensity: 0.0
  });
  
  presetStates[TimePreset.SUNSET] = new LightState({
    timeOfDay: TimeOfDay.SUNSET,
    timeProgress: 0.85,
    sunPosition: { x: 80, y: 25, z: 0 },
    sunIntensity: 0.7,
    sunColor: { r: 1.0, g: 0.4, b: 0.2 },
    ambientIntensity: 0.35,
    ambientColor: { r: 0.9, g: 0.4, b: 0.3 },
    fogDensity: 0.006,
    fogColor: { r: 0.8, g: 0.3, b: 0.2 },
    skyColor: { r: 0.8, g: 0.3, b: 0.1 },
    horizonColor: { r: 1.0, g: 0.6, b: 0.3 },
    starsEnabled: false,
    starsIntensity: 0.0,
    moonEnabled: false,
    moonIntensity: 0.0
  });
  
  presetStates[TimePreset.STARRY_NIGHT] = new LightState({
    timeOfDay: TimeOfDay.MIDNIGHT,
    timeProgress: 0.0,
    sunPosition: { x: 0, y: -100, z: 0 },
    sunIntensity: 0.0,
    sunColor: { r: 0.1, g: 0.1, b: 0.2 },
    ambientIntensity: 0.1,
    ambientColor: { r: 0.1, g: 0.1, b: 0.2 },
    fogDensity: 0.003,
    fogColor: { r: 0.05, g: 0.05, b: 0.1 },
    skyColor: { r: 0.02, g: 0.02, b: 0.08 },
    horizonColor: { r: 0.1, g: 0.1, b: 0.2 },
    starsEnabled: true,
    starsIntensity: 1.0,
    moonEnabled: true,
    moonIntensity: 0.3
  });
  
  return presetStates;
}

export class LightTimeline {
  constructor(options = {}) {
    this.keyframes = [];
    this.duration = options.duration !== undefined ? options.duration : 30.0;
    this.currentTime = 0;
    this.isPlaying = false;
    this.loop = options.loop !== undefined ? options.loop : true;
    this.speed = options.speed !== undefined ? options.speed : 1.0;
    
    this._lastUpdateTime = null;
    this._updateCallback = null;
    this._playbackId = null;
  }
  
  addKeyframe(time, lightState) {
    const state = lightState instanceof LightState ? lightState : new LightState(lightState);
    this.keyframes.push({ time, state });
    this.keyframes.sort((a, b) => a.time - b.time);
  }
  
  removeKeyframe(index) {
    if (index >= 0 && index < this.keyframes.length) {
      this.keyframes.splice(index, 1);
    }
  }
  
  clear() {
    this.keyframes = [];
  }
  
  getKeyframeCount() {
    return this.keyframes.length;
  }
  
  getKeyframe(index) {
    return index >= 0 && index < this.keyframes.length ? this.keyframes[index] : null;
  }
  
  findKeyframeIndices(time) {
    if (this.keyframes.length === 0) return { prev: -1, next: -1 };
    if (this.keyframes.length === 1) return { prev: 0, next: 0 };
    
    if (time <= this.keyframes[0].time) {
      return { prev: 0, next: 0 };
    }
    
    if (time >= this.keyframes[this.keyframes.length - 1].time) {
      return { prev: this.keyframes.length - 1, next: this.keyframes.length - 1 };
    }
    
    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (time >= this.keyframes[i].time && time <= this.keyframes[i + 1].time) {
        return { prev: i, next: i + 1 };
      }
    }
    
    return { prev: 0, next: 0 };
  }
  
  evaluate(time) {
    if (this.keyframes.length === 0) {
      return new LightState();
    }
    
    if (this.keyframes.length === 1) {
      return this.keyframes[0].state.clone();
    }
    
    const { prev, next } = this.findKeyframeIndices(time);
    
    if (prev === next) {
      return this.keyframes[prev].state.clone();
    }
    
    const prevKf = this.keyframes[prev];
    const nextKf = this.keyframes[next];
    
    const timeRange = nextKf.time - prevKf.time;
    const t = timeRange > 0 ? (time - prevKf.time) / timeRange : 0;
    
    return LightState.lerp(prevKf.state, nextKf.state, t);
  }
  
  evaluateAtProgress(progress) {
    const normalizedProgress = Math.max(0, Math.min(1, progress));
    const totalDuration = this.getTotalDuration();
    const time = normalizedProgress * totalDuration;
    return this.evaluate(time);
  }
  
  getTotalDuration() {
    if (this.keyframes.length === 0) return 0;
    return this.keyframes[this.keyframes.length - 1].time;
  }
  
  setUpdateCallback(callback) {
    this._updateCallback = callback;
  }
  
  play() {
    if (this.isPlaying) return;
    if (this.keyframes.length < 2) return;
    
    this.isPlaying = true;
    this._lastUpdateTime = performance.now();
    
    const animate = () => {
      if (!this.isPlaying) return;
      
      const now = performance.now();
      const delta = (now - this._lastUpdateTime) / 1000;
      this._lastUpdateTime = now;
      
      this.currentTime += delta * this.speed;
      
      const totalDuration = this.getTotalDuration();
      if (this.currentTime >= totalDuration) {
        if (this.loop) {
          this.currentTime = 0;
        } else {
          this.currentTime = totalDuration;
          this.stop();
        }
      }
      
      const currentState = this.evaluate(this.currentTime);
      if (this._updateCallback) {
        this._updateCallback(currentState, this.currentTime);
      }
      
      this._playbackId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  pause() {
    this.isPlaying = false;
    if (this._playbackId) {
      cancelAnimationFrame(this._playbackId);
      this._playbackId = null;
    }
  }
  
  stop() {
    this.isPlaying = false;
    if (this._playbackId) {
      cancelAnimationFrame(this._playbackId);
      this._playbackId = null;
    }
    this.currentTime = 0;
  }
  
  seek(time) {
    this.currentTime = Math.max(0, Math.min(this.getTotalDuration(), time));
    const currentState = this.evaluate(this.currentTime);
    if (this._updateCallback) {
      this._updateCallback(currentState, this.currentTime);
    }
    return currentState;
  }
  
  seekToProgress(progress) {
    const totalDuration = this.getTotalDuration();
    return this.seek(progress * totalDuration);
  }
  
  initDefaultTimeline() {
    const presets = getPresetLightStates();
    
    this.clear();
    this.addKeyframe(0, presets[TimePreset.STARRY_NIGHT]);
    this.addKeyframe(5, presets[TimePreset.SUNRISE]);
    this.addKeyframe(10, presets[TimePreset.NOON]);
    this.addKeyframe(20, presets[TimePreset.SUNSET]);
    this.addKeyframe(25, presets[TimePreset.STARRY_NIGHT]);
    
    this.duration = 25;
  }
  
  toJSON() {
    return {
      keyframes: this.keyframes.map(kf => ({
        time: kf.time,
        state: kf.state.toJSON()
      })),
      duration: this.duration,
      currentTime: this.currentTime,
      loop: this.loop,
      speed: this.speed
    };
  }
  
  static fromJSON(json) {
    const timeline = new LightTimeline({
      duration: json.duration,
      loop: json.loop,
      speed: json.speed
    });
    
    timeline.currentTime = json.currentTime || 0;
    
    if (json.keyframes) {
      json.keyframes.forEach(kf => {
        timeline.addKeyframe(kf.time, LightState.fromJSON(kf.state));
      });
    }
    
    return timeline;
  }
}

export function createDayNightCycle(duration = 30) {
  const timeline = new LightTimeline({ duration, loop: true });
  timeline.initDefaultTimeline();
  return timeline;
}

export default {
  TimeOfDay,
  TimePreset,
  LightState,
  LightTimeline,
  getPresetLightStates,
  createDayNightCycle
};
