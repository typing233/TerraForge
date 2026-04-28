// 水力侵蚀模拟
export class HydraulicErosion {
  constructor(options = {}) {
    this.inertia = options.inertia !== undefined ? options.inertia : 0.05;
    this.sedimentCapacity = options.sedimentCapacity !== undefined ? options.sedimentCapacity : 4;
    this.minSedimentCapacity = options.minSedimentCapacity !== undefined ? options.minSedimentCapacity : 0.01;
    this.erosionRate = options.erosionRate !== undefined ? options.erosionRate : 0.3;
    this.depositRate = options.depositRate !== undefined ? options.depositRate : 0.3;
    this.evaporateRate = options.evaporateRate !== undefined ? options.evaporateRate : 0.02;
    this.minSlope = options.minSlope !== undefined ? options.minSlope : 0.01;
    this.maxSteps = options.maxSteps !== undefined ? options.maxSteps : 80;
    this.dropletInertia = options.dropletInertia !== undefined ? options.dropletInertia : 0.1;
    this.erosionBrushRadius = options.erosionBrushRadius !== undefined ? options.erosionBrushRadius : 3;
  }
  
  // 从高度图获取高度（双线性插值）
  getHeight(heightmap, width, height, x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    
    const u = x - x0;
    const v = y - y0;
    
    const h00 = heightmap[Math.max(0, Math.min(y0, height - 1)) * width + Math.max(0, Math.min(x0, width - 1))];
    const h10 = heightmap[Math.max(0, Math.min(y0, height - 1)) * width + Math.max(0, Math.min(x1, width - 1))];
    const h01 = heightmap[Math.max(0, Math.min(y1, height - 1)) * width + Math.max(0, Math.min(x0, width - 1))];
    const h11 = heightmap[Math.max(0, Math.min(y1, height - 1)) * width + Math.max(0, Math.min(x1, width - 1))];
    
    // 双线性插值
    const h0 = h00 * (1 - u) + h10 * u;
    const h1 = h01 * (1 - u) + h11 * u;
    
    return h0 * (1 - v) + h1 * v;
  }
  
  // 计算梯度（双线性插值）
  getGradient(heightmap, width, height, x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    
    const u = x - x0;
    const v = y - y0;
    
    const h00 = heightmap[Math.max(0, Math.min(y0, height - 1)) * width + Math.max(0, Math.min(x0, width - 1))];
    const h10 = heightmap[Math.max(0, Math.min(y0, height - 1)) * width + Math.max(0, Math.min(x1, width - 1))];
    const h01 = heightmap[Math.max(0, Math.min(y1, height - 1)) * width + Math.max(0, Math.min(x0, width - 1))];
    const h11 = heightmap[Math.max(0, Math.min(y1, height - 1)) * width + Math.max(0, Math.min(x1, width - 1))];
    
    // 计算 x 方向梯度
    const gradX = (h10 - h00) * (1 - v) + (h11 - h01) * v;
    
    // 计算 y 方向梯度
    const gradY = (h01 - h00) * (1 - u) + (h11 - h10) * u;
    
    return { x: gradX, y: gradY };
  }
  
  // 模拟单个水滴的侵蚀过程
  simulateDroplet(heightmap, width, height, posX, posY, delta) {
    let dirX = 0;
    let dirY = 0;
    let speed = 1;
    let water = 1;
    let sediment = 0;
    
    const cellSizeX = width;
    const cellSizeY = height;
    
    for (let step = 0; step < this.maxSteps; step++) {
      const cellX = Math.floor(posX);
      const cellY = Math.floor(posY);
      const offsetX = posX - cellX;
      const offsetY = posY - cellY;
      
      // 检查边界
      if (cellX < 0 || cellX >= width - 1 || cellY < 0 || cellY >= height - 1) {
        break;
      }
      
      // 计算新方向（基于地形梯度）
      const gradient = this.getGradient(heightmap, width, height, posX, posY);
      
      // 更新方向：惯性 + 梯度
      dirX = dirX * this.inertia - gradient.x * (1 - this.inertia);
      dirY = dirY * this.inertia - gradient.y * (1 - this.inertia);
      
      // 归一化方向
      const len = Math.sqrt(dirX * dirX + dirY * dirY);
      if (len > 0.0001) {
        dirX /= len;
        dirY /= len;
      } else {
        // 随机方向
        const angle = Math.random() * Math.PI * 2;
        dirX = Math.cos(angle);
        dirY = Math.sin(angle);
      }
      
      // 计算新位置
      const newPosX = posX + dirX;
      const newPosY = posY + dirY;
      
      // 检查新位置边界
      if (newPosX < 0 || newPosX >= width - 1 || newPosY < 0 || newPosY >= height - 1) {
        break;
      }
      
      // 获取当前位置和新位置的高度
      const oldHeight = this.getHeight(heightmap, width, height, posX, posY);
      const newHeight = this.getHeight(heightmap, width, height, newPosX, newPosY);
      const deltaHeight = newHeight - oldHeight;
      
      // 计算水滴能携带的沉积物容量
      const capacity = Math.max(-deltaHeight * speed * water * this.sedimentCapacity, this.minSedimentCapacity);
      
      if (sediment > capacity || deltaHeight > 0) {
        // 沉积
        const amountToDeposit = deltaHeight > 0 
          ? Math.min(deltaHeight, sediment) 
          : (sediment - capacity) * this.depositRate;
        
        sediment -= amountToDeposit;
        
        // 双线性沉积
        this.deposit(heightmap, width, height, posX, posY, amountToDeposit);
      } else {
        // 侵蚀
        const amountToErode = Math.min((capacity - sediment) * this.erosionRate, -deltaHeight);
        
        // 刷状侵蚀
        this.erode(heightmap, width, height, posX, posY, amountToErode);
        sediment += amountToErode;
      }
      
      // 更新速度：重力影响
      speed = Math.sqrt(Math.max(0, speed * speed + deltaHeight * 4));
      
      // 蒸发
      water *= (1 - this.evaporateRate);
      
      // 移动到新位置
      posX = newPosX;
      posY = newPosY;
      
      if (water < 0.01) {
        break;
      }
    }
  }
  
  // 双线性沉积
  deposit(heightmap, width, height, x, y, amount) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const u = x - x0;
    const v = y - y0;
    
    if (x0 < 0 || x0 >= width - 1 || y0 < 0 || y0 >= height - 1) return;
    
    const idx00 = y0 * width + x0;
    const idx10 = y0 * width + x0 + 1;
    const idx01 = (y0 + 1) * width + x0;
    const idx11 = (y0 + 1) * width + x0 + 1;
    
    heightmap[idx00] += amount * (1 - u) * (1 - v);
    heightmap[idx10] += amount * u * (1 - v);
    heightmap[idx01] += amount * (1 - u) * v;
    heightmap[idx11] += amount * u * v;
  }
  
  // 刷状侵蚀
  erode(heightmap, width, height, x, y, amount) {
    const radius = this.erosionBrushRadius;
    const weights = [];
    let totalWeight = 0;
    
    // 计算权重
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const weight = Math.max(0, 1 - dist / radius);
          weights.push({ dx, dy, weight });
          totalWeight += weight;
        }
      }
    }
    
    // 应用侵蚀
    for (const { dx, dy, weight } of weights) {
      const px = Math.floor(x) + dx;
      const py = Math.floor(y) + dy;
      
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = py * width + px;
        const erodeAmount = amount * (weight / totalWeight);
        heightmap[idx] = Math.max(0, heightmap[idx] - erodeAmount);
      }
    }
  }
  
  // 应用水力侵蚀
  apply(heightmap, width, height, numDroplets = 50000, randomSeed = 12345) {
    // 创建副本以避免修改原数组
    const result = new Float32Array(heightmap);
    
    // 初始化随机数生成器
    let seed = randomSeed;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    // 模拟水滴
    for (let i = 0; i < numDroplets; i++) {
      const posX = rng() * (width - 2) + 1;
      const posY = rng() * (height - 2) + 1;
      this.simulateDroplet(result, width, height, posX, posY, 1);
    }
    
    return result;
  }
}

// 热力侵蚀（风化/冻融）模拟
export class ThermalErosion {
  constructor(options = {}) {
    this.angleOfRepose = options.angleOfRepose !== undefined ? options.angleOfRepose : 30;
    this.erosionRate = options.erosionRate !== undefined ? options.erosionRate : 0.5;
    this.iterations = options.iterations !== undefined ? options.iterations : 10;
  }
  
  // 计算坡度（度）
  getSlope(heightmap, width, height, x, y) {
    const getH = (px, py) => {
      px = Math.max(0, Math.min(px, width - 1));
      py = Math.max(0, Math.min(py, height - 1));
      return heightmap[py * width + px];
    };
    
    // 使用 Sobel 算子计算梯度
    const gx = (-getH(x-1, y-1) - 2 * getH(x-1, y) - getH(x-1, y+1) +
                getH(x+1, y-1) + 2 * getH(x+1, y) + getH(x+1, y+1)) / 8;
    const gy = (-getH(x-1, y-1) - 2 * getH(x, y-1) - getH(x+1, y-1) +
                getH(x-1, y+1) + 2 * getH(x, y+1) + getH(x+1, y+1)) / 8;
    
    const slopeRadians = Math.atan(Math.sqrt(gx * gx + gy * gy));
    return slopeRadians * (180 / Math.PI);
  }
  
  // 应用单次热力侵蚀
  applySinglePass(heightmap, width, height) {
    const result = new Float32Array(heightmap);
    const tanRepose = Math.tan(this.angleOfRepose * Math.PI / 180);
    
    // 8 方向邻居
    const directions = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },                      { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
    ];
    
    // 计算每个点的沉积物移动
    const delta = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const currentH = result[idx];
        
        // 检查所有邻居
        for (const dir of directions) {
          const nx = x + dir.dx;
          const ny = y + dir.dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            const neighborH = result[nIdx];
            
            // 计算水平距离
            const dist = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy);
            
            // 计算高差和允许的最大高差
            const heightDiff = currentH - neighborH;
            const maxAllowedDiff = tanRepose * dist;
            
            if (heightDiff > maxAllowedDiff) {
              // 超过休止角，需要移动物质
              const excess = heightDiff - maxAllowedDiff;
              const moveAmount = excess * this.erosionRate * 0.5;
              
              delta[idx] -= moveAmount;
              delta[nIdx] += moveAmount;
            }
          }
        }
      }
    }
    
    // 应用变化
    for (let i = 0; i < result.length; i++) {
      result[i] = Math.max(0, result[i] + delta[i]);
    }
    
    return result;
  }
  
  // 应用热力侵蚀
  apply(heightmap, width, height) {
    let result = new Float32Array(heightmap);
    
    for (let i = 0; i < this.iterations; i++) {
      result = this.applySinglePass(result, width, height);
    }
    
    return result;
  }
}

// 组合侵蚀系统
export class ErosionSystem {
  constructor() {
    this.hydraulic = new HydraulicErosion();
    this.thermal = new ThermalErosion();
  }
  
  setHydraulicParams(params) {
    Object.assign(this.hydraulic, params);
  }
  
  setThermalParams(params) {
    Object.assign(this.thermal, params);
  }
  
  applyHydraulic(heightmap, width, height, numDroplets = 50000, seed = 12345) {
    return this.hydraulic.apply(heightmap, width, height, numDroplets, seed);
  }
  
  applyThermal(heightmap, width, height) {
    return this.thermal.apply(heightmap, width, height);
  }
  
  applyCombined(heightmap, width, height, hydraulicIterations = 1, thermalIterations = 1, numDroplets = 50000, seed = 12345) {
    let result = new Float32Array(heightmap);
    
    for (let i = 0; i < hydraulicIterations; i++) {
      result = this.applyHydraulic(result, width, height, numDroplets, seed + i);
    }
    
    for (let i = 0; i < thermalIterations; i++) {
      result = this.applyThermal(result, width, height);
    }
    
    return result;
  }
}

export default ErosionSystem;