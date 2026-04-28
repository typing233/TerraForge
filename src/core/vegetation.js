// 植被类型
export const VegetationType = {
  GRASS: 'grass',
  BUSH: 'bush',
  TREE_LOW: 'tree_low',
  TREE_MEDIUM: 'tree_medium',
  TREE_HIGH: 'tree_high'
};

// 植被配置
export class VegetationConfig {
  constructor(options = {}) {
    this.type = options.type || VegetationType.GRASS;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.density = options.density !== undefined ? options.density : 0.5;
    this.minHeight = options.minHeight !== undefined ? options.minHeight : 0.0;
    this.maxHeight = options.maxHeight !== undefined ? options.maxHeight : 1.0;
    this.minSlope = options.minSlope !== undefined ? options.minSlope : 0.0;
    this.maxSlope = options.maxSlope !== undefined ? options.maxSlope : 45.0;
    this.scaleMin = options.scaleMin !== undefined ? options.scaleMin : 0.8;
    this.scaleMax = options.scaleMax !== undefined ? options.scaleMax : 1.2;
    this.seed = options.seed || Math.random() * 10000;
  }
  
  clone() {
    return new VegetationConfig({
      type: this.type,
      enabled: this.enabled,
      density: this.density,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      minSlope: this.minSlope,
      maxSlope: this.maxSlope,
      scaleMin: this.scaleMin,
      scaleMax: this.scaleMax,
      seed: this.seed
    });
  }
  
  toJSON() {
    return {
      type: this.type,
      enabled: this.enabled,
      density: this.density,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      minSlope: this.minSlope,
      maxSlope: this.maxSlope,
      scaleMin: this.scaleMin,
      scaleMax: this.scaleMax,
      seed: this.seed
    };
  }
  
  static fromJSON(json) {
    return new VegetationConfig(json);
  }
}

// 植被实例
export class VegetationInstance {
  constructor(type, x, y, z, rotation, scale) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotation = rotation;
    this.scale = scale;
  }
  
  toJSON() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      z: this.z,
      rotation: this.rotation,
      scale: this.scale
    };
  }
  
  static fromJSON(json) {
    return new VegetationInstance(
      json.type,
      json.x,
      json.y,
      json.z,
      json.rotation,
      json.scale
    );
  }
}

// 植被系统
export class VegetationSystem {
  constructor() {
    this.configs = [];
    this.instances = [];
  }
  
  addConfig(config) {
    this.configs.push(config instanceof VegetationConfig ? config : new VegetationConfig(config));
  }
  
  removeConfig(index) {
    if (index >= 0 && index < this.configs.length) {
      this.configs.splice(index, 1);
    }
  }
  
  setConfigs(configs) {
    this.configs = configs.map(c => c instanceof VegetationConfig ? c : new VegetationConfig(c));
  }
  
  getConfigs() {
    return this.configs;
  }
  
  getInstances() {
    return this.instances;
  }
  
  // 计算坡度
  calculateSlope(heightmap, width, height, x, y) {
    const getH = (px, py) => {
      px = Math.max(0, Math.min(px, width - 1));
      py = Math.max(0, Math.min(py, height - 1));
      return heightmap[py * width + px];
    };
    
    // 使用 Sobel 算子
    const gx = (-getH(x-1, y-1) - 2 * getH(x-1, y) - getH(x-1, y+1) +
                getH(x+1, y-1) + 2 * getH(x+1, y) + getH(x+1, y+1)) / 8;
    const gy = (-getH(x-1, y-1) - 2 * getH(x, y-1) - getH(x+1, y-1) +
                getH(x-1, y+1) + 2 * getH(x, y+1) + getH(x+1, y+1)) / 8;
    
    const slopeRadians = Math.atan(Math.sqrt(gx * gx + gy * gy));
    return slopeRadians * (180 / Math.PI);
  }
  
  // 生成随机数（带种子）
  seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
  
  // 检查位置是否适合特定植被
  isSuitable(config, height, slope, waterLevel) {
    // 检查高度范围
    if (height < config.minHeight || height > config.maxHeight) {
      return false;
    }
    
    // 检查坡度范围
    if (slope < config.minSlope || slope > config.maxSlope) {
      return false;
    }
    
    // 不能在水下
    if (height < waterLevel) {
      return false;
    }
    
    return true;
  }
  
  // 生成植被
  generate(heightmap, width, height, terrainScale = 100, heightScale = 50, waterLevel = 0.3) {
    this.instances = [];
    
    for (const config of this.configs) {
      if (!config.enabled || config.density <= 0) continue;
      
      const rng = this.seededRandom(config.seed);
      
      // 基于密度计算采样点数
      const numSamples = Math.floor(width * height * config.density * 0.1);
      
      for (let i = 0; i < numSamples; i++) {
        // 随机采样位置
        const px = rng() * (width - 1);
        const py = rng() * (height - 1);
        
        const ix = Math.floor(px);
        const iy = Math.floor(py);
        
        // 双线性插值获取高度
        const u = px - ix;
        const v = py - iy;
        
        const getH = (x, y) => {
          x = Math.max(0, Math.min(x, width - 1));
          y = Math.max(0, Math.min(y, height - 1));
          return heightmap[y * width + x];
        };
        
        const h00 = getH(ix, iy);
        const h10 = getH(ix + 1, iy);
        const h01 = getH(ix, iy + 1);
        const h11 = getH(ix + 1, iy + 1);
        
        const h = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;
        
        // 计算坡度
        const slope = this.calculateSlope(heightmap, width, height, ix, iy);
        
        // 检查是否适合
        if (!this.isSuitable(config, h, slope, waterLevel)) {
          continue;
        }
        
        // 计算世界坐标
        const worldX = (px / (width - 1) - 0.5) * terrainScale;
        const worldZ = (py / (height - 1) - 0.5) * terrainScale;
        const worldY = h * heightScale;
        
        // 随机旋转（Y轴）
        const rotation = rng() * Math.PI * 2;
        
        // 随机缩放
        const scale = config.scaleMin + rng() * (config.scaleMax - config.scaleMin);
        
        this.instances.push(new VegetationInstance(
          config.type,
          worldX,
          worldY,
          worldZ,
          rotation,
          scale
        ));
      }
    }
    
    return this.instances;
  }
  
  // 清除所有植被实例
  clear() {
    this.instances = [];
  }
  
  toJSON() {
    return {
      configs: this.configs.map(c => c.toJSON()),
      instances: this.instances.map(i => i.toJSON())
    };
  }
  
  static fromJSON(json) {
    const system = new VegetationSystem();
    if (json.configs) {
      system.setConfigs(json.configs.map(c => VegetationConfig.fromJSON(c)));
    }
    if (json.instances) {
      system.instances = json.instances.map(i => VegetationInstance.fromJSON(i));
    }
    return system;
  }
}

export default VegetationSystem;