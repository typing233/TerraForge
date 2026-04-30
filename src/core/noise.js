import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise';

export const NoiseType = {
  PERLIN: 'perlin',
  SIMPLEX: 'simplex'
};

// Perlin 噪声实现
class PerlinNoise {
  constructor(seed = Math.random()) {
    this.seed = seed;
    this.permutation = this.generatePermutation(seed);
    this.p = new Array(512);
    
    for (let i = 0; i < 512; i++) {
      this.p[i] = this.permutation[i & 255];
    }
  }
  
  generatePermutation(seed) {
    const permutation = [];
    for (let i = 0; i < 256; i++) {
      permutation[i] = i;
    }
    
    // 使用种子打乱数组
    const rng = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
    
    return permutation;
  }
  
  seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
  
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  lerp(t, a, b) {
    return a + t * (b - a);
  }
  
  grad(hash, x, y, z = 0) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  
  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;
    
    return this.lerp(v,
      this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
      this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
    );
  }
  
  noise3D(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;
    
    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z)),
        this.lerp(u, this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }
}

// 多重噪声层配置
export class NoiseLayerConfig {
  constructor(options = {}) {
    this.type = options.type || NoiseType.SIMPLEX;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.frequency = options.frequency || 1.0;
    this.amplitude = options.amplitude || 1.0;
    this.octaves = options.octaves || 4;
    this.persistence = options.persistence || 0.5;
    this.lacunarity = options.lacunarity || 2.0;
    this.weight = options.weight || 1.0;
  }
  
  clone() {
    return new NoiseLayerConfig({
      type: this.type,
      enabled: this.enabled,
      frequency: this.frequency,
      amplitude: this.amplitude,
      octaves: this.octaves,
      persistence: this.persistence,
      lacunarity: this.lacunarity,
      weight: this.weight
    });
  }
  
  toJSON() {
    return {
      type: this.type,
      enabled: this.enabled,
      frequency: this.frequency,
      amplitude: this.amplitude,
      octaves: this.octaves,
      persistence: this.persistence,
      lacunarity: this.lacunarity,
      weight: this.weight
    };
  }
  
  static fromJSON(json) {
    return new NoiseLayerConfig(json);
  }
}

// 多重噪声生成器
export class MultiNoiseGenerator {
  constructor(seed = Math.random()) {
    this.seed = seed;
    this.perlin = new PerlinNoise(seed);
    this.simplex2D = createNoise2D(this.createSeededRandom(seed));
    this.simplex3D = createNoise3D(this.createSeededRandom(seed));
    this.layers = [];
  }
  
  createSeededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
  
  setSeed(seed) {
    this.seed = seed;
    this.perlin = new PerlinNoise(seed);
    this.simplex2D = createNoise2D(this.createSeededRandom(seed));
    this.simplex3D = createNoise3D(this.createSeededRandom(seed));
  }
  
  addLayer(config) {
    this.layers.push(config instanceof NoiseLayerConfig ? config : new NoiseLayerConfig(config));
  }
  
  removeLayer(index) {
    if (index >= 0 && index < this.layers.length) {
      this.layers.splice(index, 1);
    }
  }
  
  setLayers(layers) {
    this.layers = layers.map(l => l instanceof NoiseLayerConfig ? l : new NoiseLayerConfig(l));
  }
  
  getLayers() {
    return this.layers;
  }
  
  // 单噪声层采样
  sampleLayer(layer, x, y) {
    if (!layer.enabled) return 0;
    
    let value = 0;
    let amplitude = layer.amplitude;
    let frequency = layer.frequency;
    let maxValue = 0;
    
    const noise2D = layer.type === NoiseType.PERLIN 
      ? (nx, ny) => this.perlin.noise2D(nx, ny)
      : (nx, ny) => this.simplex2D(nx, ny);
    
    for (let i = 0; i < layer.octaves; i++) {
      value += amplitude * noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= layer.persistence;
      frequency *= layer.lacunarity;
    }
    
    return (value / maxValue) * layer.weight;
  }
  
  // 多重噪声叠加采样
  sample(x, y) {
    if (this.layers.length === 0) return 0;
    
    let totalValue = 0;
    let totalWeight = 0;
    
    for (const layer of this.layers) {
      if (layer.enabled && layer.weight > 0) {
        totalValue += this.sampleLayer(layer, x, y);
        totalWeight += layer.weight;
      }
    }
    
    return totalWeight > 0 ? totalValue / totalWeight : 0;
  }
  
  // 生成完整的高度图
  generateHeightmap(width, height, normalize = true) {
    const heightmap = new Float32Array(width * height);
    
    // 先采样所有值
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / (width - 1);
        const ny = y / (height - 1);
        heightmap[y * width + x] = this.sample(nx, ny);
      }
    }
    
    // 归一化到 0-1 范围
    if (normalize) {
      let min = Infinity;
      let max = -Infinity;
      
      for (let i = 0; i < heightmap.length; i++) {
        min = Math.min(min, heightmap[i]);
        max = Math.max(max, heightmap[i]);
      }
      
      const range = max - min || 1;
      for (let i = 0; i < heightmap.length; i++) {
        heightmap[i] = (heightmap[i] - min) / range;
      }
    }
    
    return heightmap;
  }
  
  // 生成网格顶点
  generateMeshVertices(width, height, scale = 100, heightScale = 50) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    
    // 先生成高度图
    const heightmap = this.generateHeightmap(width, height, true);
    
    // 生成顶点位置、UV
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const h = heightmap[idx] * heightScale;
        
        // 位置 (X, Y, Z) - Y 是高度
        positions.push(
          (x / (width - 1) - 0.5) * scale,
          h,
          (y / (height - 1) - 0.5) * scale
        );
        
        // UV
        uvs.push(x / (width - 1), y / (height - 1));
      }
    }
    
    // 计算法线
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        // 获取相邻点高度
        const getH = (px, py) => {
          if (px < 0) px = 0;
          if (py < 0) py = 0;
          if (px >= width) px = width - 1;
          if (py >= height) py = height - 1;
          return heightmap[py * width + px] * heightScale;
        };
        
        const hL = getH(x - 1, y);
        const hR = getH(x + 1, y);
        const hD = getH(x, y - 1);
        const hU = getH(x, y + 1);
        
        // 计算切线和副切线
        const stepX = scale / (width - 1);
        const stepZ = scale / (height - 1);
        
        const tx = 1, ty = (hR - hL) / (2 * stepX), tz = 0;
        const bx = 0, by = (hU - hD) / (2 * stepZ), bz = 1;
        
        // 叉积求法线：b × t 确保法线朝上
        let nx = by * tz - bz * ty;
        let ny = bz * tx - bx * tz;
        let nz = bx * ty - by * tx;
        
        // 归一化
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;
        
        normals.push(nx, ny, nz);
      }
    }
    
    // 生成索引 (三角形)
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const a = y * width + x;
        const b = y * width + x + 1;
        const c = (y + 1) * width + x;
        const d = (y + 1) * width + x + 1;
        
        // 两个三角形
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    
    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices),
      heightmap,
      width,
      height
    };
  }
}

export default MultiNoiseGenerator;