export const PathType = {
  AUTOMATIC: 'automatic',
  CUSTOM: 'custom',
  CIRCULAR: 'circular',
  SPIRAL: 'spiral',
  FOLLOW_RIDGE: 'follow_ridge',
  FOLLOW_VALLEY: 'follow_valley',
  ORBIT: 'orbit'
};

export const PathSmoothMethod = {
  NONE: 'none',
  LINEAR: 'linear',
  SPLINE: 'spline',
  BEZIER: 'bezier'
};

export const LookAtMode = {
  FIXED: 'fixed',
  PATH_DIRECTION: 'path_direction',
  TERRAIN_CENTER: 'terrain_center',
  DYNAMIC: 'dynamic'
};

export class PathKeyframe {
  constructor(options = {}) {
    this.position = options.position || { x: 0, y: 50, z: 100 };
    this.rotation = options.rotation || { x: 0, y: 0, z: 0 };
    this.target = options.target || { x: 0, y: 0, z: 0 };
    this.time = options.time !== undefined ? options.time : 0;
    this.fov = options.fov !== undefined ? options.fov : 45;
    this.easeType = options.easeType || 'linear';
  }
  
  clone() {
    return new PathKeyframe({
      position: { ...this.position },
      rotation: { ...this.rotation },
      target: { ...this.target },
      time: this.time,
      fov: this.fov,
      easeType: this.easeType
    });
  }
  
  toJSON() {
    return {
      position: { ...this.position },
      rotation: { ...this.rotation },
      target: { ...this.target },
      time: this.time,
      fov: this.fov,
      easeType: this.easeType
    };
  }
  
  static fromJSON(json) {
    return new PathKeyframe(json);
  }
  
  static lerp(a, b, t, easeType = 'linear') {
    const easedT = PathKeyframe.ease(t, easeType);
    
    return new PathKeyframe({
      position: {
        x: a.position.x + (b.position.x - a.position.x) * easedT,
        y: a.position.y + (b.position.y - a.position.y) * easedT,
        z: a.position.z + (b.position.z - a.position.z) * easedT
      },
      rotation: {
        x: a.rotation.x + (b.rotation.x - a.rotation.x) * easedT,
        y: a.rotation.y + (b.rotation.y - a.rotation.y) * easedT,
        z: a.rotation.z + (b.rotation.z - a.rotation.z) * easedT
      },
      target: {
        x: a.target.x + (b.target.x - a.target.x) * easedT,
        y: a.target.y + (b.target.y - a.target.y) * easedT,
        z: a.target.z + (b.target.z - a.target.z) * easedT
      },
      fov: a.fov + (b.fov - a.fov) * easedT,
      easeType: easeType
    });
  }
  
  static ease(t, type) {
    switch (type) {
      case 'ease_in':
        return t * t * t;
      case 'ease_out':
        return 1 - Math.pow(1 - t, 3);
      case 'ease_in_out':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'ease_in_quad':
        return t * t;
      case 'ease_out_quad':
        return 1 - (1 - t) * (1 - t);
      default:
        return t;
    }
  }
}

export class FeaturePoint {
  constructor(x, y, z, type, strength = 1.0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.type = type;
    this.strength = strength;
    this.visited = false;
  }
}

export const FeatureType = {
  PEAK: 'peak',
  VALLEY: 'valley',
  RIDGE: 'ridge',
  CLIFF: 'cliff',
  FLAT_AREA: 'flat_area',
  WATER_EDGE: 'water_edge'
};

export class TerrainFeatureDetector {
  constructor(heightmap, width, height, terrainScale = 100, heightScale = 50) {
    this.heightmap = heightmap;
    this.width = width;
    this.height = height;
    this.terrainScale = terrainScale;
    this.heightScale = heightScale;
  }
  
  getHeight(x, y) {
    const ix = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    const iy = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    return this.heightmap[iy * this.width + ix];
  }
  
  toWorldCoords(gridX, gridY, heightValue) {
    return {
      x: (gridX / (this.width - 1) - 0.5) * this.terrainScale,
      y: heightValue * this.heightScale,
      z: (gridY / (this.height - 1) - 0.5) * this.terrainScale
    };
  }
  
  calculateSlope(x, y) {
    const h = this.getHeight(x, y);
    const hL = this.getHeight(x - 1, y);
    const hR = this.getHeight(x + 1, y);
    const hD = this.getHeight(x, y - 1);
    const hU = this.getHeight(x, y + 1);
    
    const gx = hR - hL;
    const gy = hU - hD;
    
    return Math.sqrt(gx * gx + gy * gy);
  }
  
  isPeak(x, y, neighborhood = 3) {
    const h = this.getHeight(x, y);
    const half = Math.floor(neighborhood / 2);
    
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.getHeight(x + dx, y + dy) > h) {
          return false;
        }
      }
    }
    return true;
  }
  
  isValley(x, y, neighborhood = 3) {
    const h = this.getHeight(x, y);
    const half = Math.floor(neighborhood / 2);
    
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.getHeight(x + dx, y + dy) < h) {
          return false;
        }
      }
    }
    return true;
  }
  
  findPeaks(minHeight = 0.6, minSpacing = 8) {
    const peaks = [];
    
    for (let y = 2; y < this.height - 2; y += 2) {
      for (let x = 2; x < this.width - 2; x += 2) {
        const h = this.getHeight(x, y);
        if (h >= minHeight && this.isPeak(x, y, 5)) {
          const tooClose = peaks.some(p => {
            const dist = Math.sqrt((p.x - x) * (p.x - x) + (p.z - y) * (p.z - y));
            return dist < minSpacing;
          });
          
          if (!tooClose) {
            const worldPos = this.toWorldCoords(x, y, h);
            peaks.push(new FeaturePoint(
              worldPos.x, worldPos.y, worldPos.z,
              FeatureType.PEAK,
              h
            ));
          }
        }
      }
    }
    
    peaks.sort((a, b) => b.strength - a.strength);
    return peaks;
  }
  
  findValleys(maxHeight = 0.4, minSpacing = 8) {
    const valleys = [];
    
    for (let y = 2; y < this.height - 2; y += 2) {
      for (let x = 2; x < this.width - 2; x += 2) {
        const h = this.getHeight(x, y);
        if (h <= maxHeight && this.isValley(x, y, 5)) {
          const tooClose = valleys.some(v => {
            const dist = Math.sqrt((v.x - x) * (v.x - x) + (v.z - y) * (v.z - y));
            return dist < minSpacing;
          });
          
          if (!tooClose) {
            const worldPos = this.toWorldCoords(x, y, h);
            valleys.push(new FeaturePoint(
              worldPos.x, worldPos.y, worldPos.z,
              FeatureType.VALLEY,
              1 - h
            ));
          }
        }
      }
    }
    
    valleys.sort((a, b) => b.strength - a.strength);
    return valleys;
  }
  
  findCliffs(minSlope = 0.15) {
    const cliffs = [];
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const slope = this.calculateSlope(x, y);
        if (slope >= minSlope) {
          const h = this.getHeight(x, y);
          const worldPos = this.toWorldCoords(x, y, h);
          cliffs.push(new FeaturePoint(
            worldPos.x, worldPos.y, worldPos.z,
            FeatureType.CLIFF,
            slope
          ));
        }
      }
    }
    
    cliffs.sort((a, b) => b.strength - a.strength);
    return cliffs.slice(0, Math.min(cliffs.length, 50));
  }
  
  findAllFeatures() {
    return {
      peaks: this.findPeaks(),
      valleys: this.findValleys(),
      cliffs: this.findCliffs()
    };
  }
}

export class CameraPath {
  constructor(options = {}) {
    this.keyframes = [];
    this.pathType = options.pathType || PathType.AUTOMATIC;
    this.smoothMethod = options.smoothMethod || PathSmoothMethod.SPLINE;
    this.lookAtMode = options.lookAtMode || LookAtMode.TERRAIN_CENTER;
    this.duration = options.duration !== undefined ? options.duration : 10.0;
    this.speed = options.speed !== undefined ? options.speed : 1.0;
    this.name = options.name || '未命名路径';
    
    this.loop = options.loop !== undefined ? options.loop : false;
    this.pingPong = options.pingPong !== undefined ? options.pingPong : false;
    
    this.currentTime = 0;
    this.isPlaying = false;
  }
  
  addKeyframe(keyframe) {
    const kf = keyframe instanceof PathKeyframe ? keyframe : new PathKeyframe(keyframe);
    this.keyframes.push(kf);
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
  
  updateKeyframe(index, updates) {
    if (index >= 0 && index < this.keyframes.length) {
      this.keyframes[index] = { ...this.keyframes[index], ...updates };
    }
  }
  
  findKeyframeIndices(time) {
    if (this.keyframes.length === 0) return { prev: -1, next: -1 };
    if (this.keyframes.length === 1) return { prev: 0, next: 0 };
    
    if (time <= this.keyframes[0].time) {
      return { prev: 0, next: 1 };
    }
    
    if (time >= this.keyframes[this.keyframes.length - 1].time) {
      return { prev: this.keyframes.length - 2, next: this.keyframes.length - 1 };
    }
    
    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (time >= this.keyframes[i].time && time <= this.keyframes[i + 1].time) {
        return { prev: i, next: i + 1 };
      }
    }
    
    return { prev: 0, next: 1 };
  }
  
  evaluate(time) {
    if (this.keyframes.length === 0) {
      return new PathKeyframe();
    }
    
    if (this.keyframes.length === 1) {
      return this.keyframes[0].clone();
    }
    
    const { prev, next } = this.findKeyframeIndices(time);
    
    if (prev === next) {
      return this.keyframes[prev].clone();
    }
    
    const prevKf = this.keyframes[prev];
    const nextKf = this.keyframes[next];
    
    const timeRange = nextKf.time - prevKf.time;
    const t = timeRange > 0 ? (time - prevKf.time) / timeRange : 0;
    
    return PathKeyframe.lerp(prevKf, nextKf, t, prevKf.easeType);
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
  
  toJSON() {
    return {
      name: this.name,
      pathType: this.pathType,
      smoothMethod: this.smoothMethod,
      lookAtMode: this.lookAtMode,
      duration: this.duration,
      speed: this.speed,
      loop: this.loop,
      pingPong: this.pingPong,
      keyframes: this.keyframes.map(kf => kf.toJSON())
    };
  }
  
  static fromJSON(json) {
    const path = new CameraPath({
      name: json.name,
      pathType: json.pathType,
      smoothMethod: json.smoothMethod,
      lookAtMode: json.lookAtMode,
      duration: json.duration,
      speed: json.speed,
      loop: json.loop,
      pingPong: json.pingPong
    });
    
    if (json.keyframes) {
      json.keyframes.forEach(kf => path.addKeyframe(PathKeyframe.fromJSON(kf)));
    }
    
    return path;
  }
}

export class PathGenerator {
  constructor(heightmap, width, height, terrainScale = 100, heightScale = 50) {
    this.heightmap = heightmap;
    this.width = width;
    this.height = height;
    this.terrainScale = terrainScale;
    this.heightScale = heightScale;
    this.detector = new TerrainFeatureDetector(heightmap, width, height, terrainScale, heightScale);
  }
  
  toWorldCoords(gridX, gridY, heightValue) {
    return {
      x: (gridX / (this.width - 1) - 0.5) * this.terrainScale,
      y: heightValue * this.heightScale,
      z: (gridY / (this.height - 1) - 0.5) * this.terrainScale
    };
  }
  
  getHeight(x, y) {
    const ix = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    const iy = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    return this.heightmap[iy * this.width + ix];
  }
  
  generateCircularPath(centerX = 0, centerZ = 0, radius = 80, heightOffset = 30, numPoints = 30) {
    const path = new CameraPath({
      pathType: PathType.CIRCULAR,
      lookAtMode: LookAtMode.TERRAIN_CENTER,
      name: '环形飞行路径'
    });
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      
      const gridX = (x / this.terrainScale + 0.5) * (this.width - 1);
      const gridY = (z / this.terrainScale + 0.5) * (this.height - 1);
      const terrainHeight = this.getHeight(gridX, gridY) * this.heightScale;
      
      const keyframe = new PathKeyframe({
        position: { x, y: terrainHeight + heightOffset, z },
        target: { x: centerX, y: terrainHeight * 0.5, z: centerZ },
        time: i * (10.0 / numPoints),
        easeType: 'linear'
      });
      
      path.addKeyframe(keyframe);
    }
    
    return path;
  }
  
  generateSpiralPath(centerX = 0, centerZ = 0, startRadius = 100, endRadius = 20, 
                      startHeight = 60, endHeight = 20, rotations = 3, numPoints = 50) {
    const path = new CameraPath({
      pathType: PathType.SPIRAL,
      lookAtMode: LookAtMode.TERRAIN_CENTER,
      name: '螺旋飞行路径'
    });
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const radius = startRadius + (endRadius - startRadius) * t;
      const height = startHeight + (endHeight - startHeight) * t;
      const angle = t * Math.PI * 2 * rotations;
      
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      
      const keyframe = new PathKeyframe({
        position: { x, y: height, z },
        target: { x: centerX, y: startHeight * 0.3, z: centerZ },
        time: i * (15.0 / numPoints),
        easeType: 'ease_in_out'
      });
      
      path.addKeyframe(keyframe);
    }
    
    return path;
  }
  
  generateOrbitPath(centerX = 0, centerZ = 0, radius = 80, minHeight = 25, maxHeight = 60, numPoints = 40) {
    const path = new CameraPath({
      pathType: PathType.ORBIT,
      lookAtMode: LookAtMode.FIXED,
      name: '环绕飞行路径'
    });
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const heightT = (Math.sin(angle * 2) + 1) / 2;
      const camHeight = minHeight + (maxHeight - minHeight) * heightT;
      
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      
      const gridX = (x / this.terrainScale + 0.5) * (this.width - 1);
      const gridY = (z / this.terrainScale + 0.5) * (this.height - 1);
      const terrainHeight = this.getHeight(gridX, gridY) * this.heightScale;
      
      const keyframe = new PathKeyframe({
        position: { x, y: terrainHeight + camHeight, z },
        target: { x: centerX, y: terrainHeight * 0.5, z: centerZ },
        time: i * (12.0 / numPoints),
        easeType: 'linear'
      });
      
      path.addKeyframe(keyframe);
    }
    
    return path;
  }
  
  generatePathFromFeatures(maxKeyframes = 15) {
    const features = this.detector.findAllFeatures();
    const allPoints = [];
    
    features.peaks.slice(0, Math.min(features.peaks.length, 5)).forEach(p => {
      allPoints.push({ ...p, priority: 1 });
    });
    
    features.valleys.slice(0, Math.min(features.valleys.length, 4)).forEach(v => {
      allPoints.push({ ...v, priority: 2 });
    });
    
    features.cliffs.slice(0, Math.min(features.cliffs.length, 6)).forEach(c => {
      allPoints.push({ ...c, priority: 3 });
    });
    
    if (allPoints.length === 0) {
      return this.generateCircularPath();
    }
    
    const path = new CameraPath({
      pathType: PathType.AUTOMATIC,
      lookAtMode: LookAtMode.DYNAMIC,
      name: '自动特征路径'
    });
    
    const centerX = 0, centerZ = 0;
    allPoints.sort((a, b) => {
      const angleA = Math.atan2(a.z - centerZ, a.x - centerX);
      const angleB = Math.atan2(b.z - centerZ, b.x - centerX);
      return angleA - angleB;
    });
    
    const selectedPoints = allPoints.slice(0, Math.min(allPoints.length, maxKeyframes));
    
    const durationPerPoint = 8.0 / Math.max(1, selectedPoints.length);
    
    for (let i = 0; i < selectedPoints.length; i++) {
      const point = selectedPoints[i];
      const nextPoint = selectedPoints[(i + 1) % selectedPoints.length];
      
      const camHeight = point.y + 25;
      
      const keyframe = new PathKeyframe({
        position: { 
          x: point.x, 
          y: camHeight, 
          z: point.z 
        },
        target: { 
          x: nextPoint.x, 
          y: nextPoint.y * 0.7, 
          z: nextPoint.z 
        },
        time: i * durationPerPoint,
        easeType: 'ease_in_out'
      });
      
      path.addKeyframe(keyframe);
    }
    
    return path;
  }
  
  generatePath(type, options = {}) {
    switch (type) {
      case PathType.CIRCULAR:
        return this.generateCircularPath(
          options.centerX || 0,
          options.centerZ || 0,
          options.radius || 80,
          options.heightOffset || 30,
          options.numPoints || 30
        );
        
      case PathType.SPIRAL:
        return this.generateSpiralPath(
          options.centerX || 0,
          options.centerZ || 0,
          options.startRadius || 100,
          options.endRadius || 20,
          options.startHeight || 60,
          options.endHeight || 20,
          options.rotations || 3,
          options.numPoints || 50
        );
        
      case PathType.ORBIT:
        return this.generateOrbitPath(
          options.centerX || 0,
          options.centerZ || 0,
          options.radius || 80,
          options.minHeight || 25,
          options.maxHeight || 60,
          options.numPoints || 40
        );
        
      case PathType.AUTOMATIC:
      default:
        return this.generatePathFromFeatures(options.maxKeyframes || 15);
    }
  }
}

export default {
  PathType,
  PathSmoothMethod,
  LookAtMode,
  PathKeyframe,
  FeaturePoint,
  FeatureType,
  TerrainFeatureDetector,
  CameraPath,
  PathGenerator
};
