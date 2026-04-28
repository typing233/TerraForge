// 笔刷类型
export const BrushType = {
  RAISE: 'raise',
  LOWER: 'lower',
  SMOOTH: 'smooth',
  PINCH: 'pinch',
  SCULPT: 'sculpt',
  FLATTEN: 'flatten'
};

// 衰减类型
export const FalloffType = {
  LINEAR: 'linear',
  QUADRATIC: 'quadratic',
  SMOOTH: 'smooth',
  NONE: 'none'
};

// 笔刷配置类
export class BrushConfig {
  constructor(options = {}) {
    this.type = options.type || BrushType.RAISE;
    this.radius = options.radius !== undefined ? options.radius : 10;
    this.strength = options.strength !== undefined ? options.strength : 0.5;
    this.falloff = options.falloff || FalloffType.SMOOTH;
    this.falloffStart = options.falloffStart !== undefined ? options.falloffStart : 0.5;
  }
  
  clone() {
    return new BrushConfig({
      type: this.type,
      radius: this.radius,
      strength: this.strength,
      falloff: this.falloff,
      falloffStart: this.falloffStart
    });
  }
  
  toJSON() {
    return {
      type: this.type,
      radius: this.radius,
      strength: this.strength,
      falloff: this.falloff,
      falloffStart: this.falloffStart
    };
  }
  
  static fromJSON(json) {
    return new BrushConfig(json);
  }
}

// 笔刷系统
export class BrushSystem {
  constructor() {
    this.config = new BrushConfig();
    this.lastPosition = null;
    this.isActive = false;
  }
  
  setConfig(config) {
    this.config = config instanceof BrushConfig ? config : new BrushConfig(config);
  }
  
  getConfig() {
    return this.config;
  }
  
  // 计算笔刷衰减因子
  getFalloffFactor(dist, radius, falloffType, falloffStart) {
    if (radius <= 0) return 0;
    
    const t = dist / radius;
    if (t > 1) return 0;
    if (falloffType === FalloffType.NONE) return 1;
    
    const startT = falloffStart;
    if (t <= startT) return 1;
    
    const falloffT = (t - startT) / (1 - startT);
    
    switch (falloffType) {
      case FalloffType.LINEAR:
        return 1 - falloffT;
      case FalloffType.QUADRATIC:
        return 1 - falloffT * falloffT;
      case FalloffType.SMOOTH:
        // 平滑插值：3t² - 2t³
        const s = 1 - falloffT;
        return s * s * (3 - 2 * s);
      default:
        return 1;
    }
  }
  
  // 获取笔刷影响区域的掩码
  getBrushMask(centerX, centerY, width, height) {
    const radius = this.config.radius;
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
    
    const mask = [];
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= radius) {
          const factor = this.getFalloffFactor(
            dist, 
            radius, 
            this.config.falloff, 
            this.config.falloffStart
          );
          
          mask.push({ x, y, index: y * width + x, factor, dist });
        }
      }
    }
    
    return mask;
  }
  
  // 抬升笔刷
  applyRaise(heightmap, mask, strength, width, height) {
    const result = new Float32Array(heightmap);
    
    for (const { index, factor } of mask) {
      const amount = strength * factor * 0.01;
      result[index] = Math.min(1, result[index] + amount);
    }
    
    return result;
  }
  
  // 下压笔刷
  applyLower(heightmap, mask, strength, width, height) {
    const result = new Float32Array(heightmap);
    
    for (const { index, factor } of mask) {
      const amount = strength * factor * 0.01;
      result[index] = Math.max(0, result[index] - amount);
    }
    
    return result;
  }
  
  // 平滑笔刷
  applySmooth(heightmap, mask, strength, width, height) {
    const result = new Float32Array(heightmap);
    const temp = new Float32Array(heightmap);
    
    const getH = (x, y) => {
      x = Math.max(0, Math.min(x, width - 1));
      y = Math.max(0, Math.min(y, height - 1));
      return temp[y * width + x];
    };
    
    for (const { x, y, index, factor } of mask) {
      // 3x3 平均值
      let sum = 0;
      let count = 0;
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += getH(x + dx, y + dy);
          count++;
        }
      }
      
      const avg = sum / count;
      const blend = strength * factor * 0.5;
      
      result[index] = result[index] * (1 - blend) + avg * blend;
    }
    
    return result;
  }
  
  // 收缩笔刷（向中心拉近）
  applyPinch(heightmap, mask, strength, width, height, centerX, centerY) {
    const result = new Float32Array(heightmap);
    const temp = new Float32Array(heightmap);
    
    const radius = this.config.radius;
    
    // 先计算所有需要的位置
    for (const { x, y, index, factor, dist } of mask) {
      // 收缩：越靠近中心，越高
      const pinchStrength = (1 - dist / radius) * strength * factor * 0.1;
      
      // 简单实现：中心位置升高
      if (dist > 0.1) {
        // 向中心方向拉取
        const dirX = (centerX - x) / dist;
        const dirY = (centerY - y) / dist;
        
        const sampleX = x + dirX * (dist * 0.3);
        const sampleY = y + dirY * (dist * 0.3);
        
        const sx = Math.floor(sampleX);
        const sy = Math.floor(sampleY);
        const u = sampleX - sx;
        const v = sampleY - sy;
        
        // 双线性采样
        const h00 = temp[Math.max(0, Math.min(sy, height - 1)) * width + Math.max(0, Math.min(sx, width - 1))];
        const h10 = temp[Math.max(0, Math.min(sy, height - 1)) * width + Math.max(0, Math.min(sx + 1, width - 1))];
        const h01 = temp[Math.max(0, Math.min(sy + 1, height - 1)) * width + Math.max(0, Math.min(sx, width - 1))];
        const h11 = temp[Math.max(0, Math.min(sy + 1, height - 1)) * width + Math.max(0, Math.min(sx + 1, width - 1))];
        
        const sampledH = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;
        
        result[index] = result[index] * (1 - pinchStrength) + sampledH * pinchStrength;
      }
    }
    
    return result;
  }
  
  // 雕刻笔刷（自定义形状，这里实现为带方向的抬升）
  applySculpt(heightmap, mask, strength, width, height, direction) {
    const result = new Float32Array(heightmap);
    
    // 简单实现：根据方向修改
    for (const { index, factor } of mask) {
      const amount = strength * factor * 0.01;
      if (direction === 'up') {
        result[index] = Math.min(1, result[index] + amount);
      } else {
        result[index] = Math.max(0, result[index] - amount);
      }
    }
    
    return result;
  }
  
  // 平坦笔刷（取平均值）
  applyFlatten(heightmap, mask, strength, width, height) {
    const result = new Float32Array(heightmap);
    
    // 计算掩码区域的平均高度
    let totalHeight = 0;
    let totalWeight = 0;
    
    for (const { index, factor } of mask) {
      totalHeight += result[index] * factor;
      totalWeight += factor;
    }
    
    const targetHeight = totalWeight > 0 ? totalHeight / totalWeight : 0.5;
    
    // 向平均高度平滑过渡
    for (const { index, factor } of mask) {
      const blend = strength * factor * 0.3;
      result[index] = result[index] * (1 - blend) + targetHeight * blend;
    }
    
    return result;
  }
  
  // 应用笔刷到高度图
  apply(heightmap, width, height, centerX, centerY, direction = 'up') {
    const mask = this.getBrushMask(centerX, centerY, width, height);
    
    if (mask.length === 0) return heightmap;
    
    const strength = this.config.strength;
    
    switch (this.config.type) {
      case BrushType.RAISE:
        return this.applyRaise(heightmap, mask, strength, width, height);
      case BrushType.LOWER:
        return this.applyLower(heightmap, mask, strength, width, height);
      case BrushType.SMOOTH:
        return this.applySmooth(heightmap, mask, strength, width, height);
      case BrushType.PINCH:
        return this.applyPinch(heightmap, mask, strength, width, height, centerX, centerY);
      case BrushType.SCULPT:
        return this.applySculpt(heightmap, mask, strength, width, height, direction);
      case BrushType.FLATTEN:
        return this.applyFlatten(heightmap, mask, strength, width, height);
      default:
        return heightmap;
    }
  }
  
  // 开始笔刷
  startBrush(x, y) {
    this.isActive = true;
    this.lastPosition = { x, y };
  }
  
  // 更新笔刷（用于连续绘制）
  updateBrush(heightmap, width, height, x, y) {
    if (!this.isActive) return heightmap;
    
    let result = heightmap;
    
    // 如果有上一个位置，在两点之间插值
    if (this.lastPosition) {
      const dx = x - this.lastPosition.x;
      const dy = y - this.lastPosition.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 步长基于半径的一半，确保连续性
      const stepSize = Math.max(1, this.config.radius * 0.5);
      const steps = Math.ceil(dist / stepSize);
      
      for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const ix = this.lastPosition.x + dx * t;
        const iy = this.lastPosition.y + dy * t;
        
        result = this.apply(result, width, height, ix, iy);
      }
    } else {
      result = this.apply(result, width, height, x, y);
    }
    
    this.lastPosition = { x, y };
    return result;
  }
  
  // 结束笔刷
  endBrush() {
    this.isActive = false;
    this.lastPosition = null;
  }
}

export default BrushSystem;