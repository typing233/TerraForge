import { BrushConfig, BrushType, FalloffType } from './brushes';

export const BiomeType = {
  GRASSLAND: 'grassland',
  FOREST: 'forest',
  DESERT: 'desert',
  SNOW: 'snow',
  TUNDRA: 'tundra',
  TROPICAL: 'tropical',
  SWAMP: 'swamp',
  MOUNTAIN: 'mountain',
  VOLCANIC: 'volcanic',
  OCEAN: 'ocean',
  BEACH: 'beach'
};

export const BiomeBlendMode = {
  NONE: 'none',
  LINEAR: 'linear',
  SMOOTH: 'smooth',
  DISTANCE: 'distance'
};

export class BiomeColor {
  constructor(r = 100, g = 150, b = 80) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
  
  toHex() {
    return '#' + 
      ((1 << 24) + (this.r << 16) + (this.g << 8) + this.b)
        .toString(16)
        .slice(1);
  }
  
  toArray() {
    return [this.r / 255, this.g / 255, this.b / 255];
  }
  
  toFloatArray() {
    return [this.r / 255, this.g / 255, this.b / 255];
  }
  
  static fromHex(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? new BiomeColor(
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ) : new BiomeColor();
  }
  
  static lerp(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    return new BiomeColor(
      Math.round(a.r + (b.r - a.r) * t),
      Math.round(a.g + (b.g - a.g) * t),
      Math.round(a.b + (b.b - a.b) * t)
    );
  }
}

export class BiomeConfig {
  constructor(options = {}) {
    this.type = options.type || BiomeType.GRASSLAND;
    this.name = options.name || '草地';
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    
    this.color = options.color instanceof BiomeColor 
      ? options.color 
      : (options.color ? BiomeColor.fromHex(options.color) : new BiomeColor(100, 150, 80));
    
    this.secondaryColor = options.secondaryColor instanceof BiomeColor
      ? options.secondaryColor
      : (options.secondaryColor ? BiomeColor.fromHex(options.secondaryColor) : new BiomeColor(80, 120, 60));
    
    this.roughness = options.roughness !== undefined ? options.roughness : 0.9;
    this.metalness = options.metalness !== undefined ? options.metalness : 0.0;
    
    this.minHeight = options.minHeight !== undefined ? options.minHeight : 0.0;
    this.maxHeight = options.maxHeight !== undefined ? options.maxHeight : 1.0;
    this.minSlope = options.minSlope !== undefined ? options.minSlope : 0;
    this.maxSlope = options.maxSlope !== undefined ? options.maxSlope : 90;
    
    this.vegetationConfigs = options.vegetationConfigs || [];
    this.vegetationDensity = options.vegetationDensity !== undefined ? options.vegetationDensity : 0.5;
    
    this.noiseScale = options.noiseScale !== undefined ? options.noiseScale : 1.0;
    this.noiseInfluence = options.noiseInfluence !== undefined ? options.noiseInfluence : 0.2;
  }
  
  clone() {
    return new BiomeConfig({
      type: this.type,
      name: this.name,
      enabled: this.enabled,
      color: new BiomeColor(this.color.r, this.color.g, this.color.b),
      secondaryColor: new BiomeColor(this.secondaryColor.r, this.secondaryColor.g, this.secondaryColor.b),
      roughness: this.roughness,
      metalness: this.metalness,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      minSlope: this.minSlope,
      maxSlope: this.maxSlope,
      vegetationConfigs: [...this.vegetationConfigs],
      vegetationDensity: this.vegetationDensity,
      noiseScale: this.noiseScale,
      noiseInfluence: this.noiseInfluence
    });
  }
  
  toJSON() {
    return {
      type: this.type,
      name: this.name,
      enabled: this.enabled,
      color: this.color.toHex(),
      secondaryColor: this.secondaryColor.toHex(),
      roughness: this.roughness,
      metalness: this.metalness,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      minSlope: this.minSlope,
      maxSlope: this.maxSlope,
      vegetationConfigs: [...this.vegetationConfigs],
      vegetationDensity: this.vegetationDensity,
      noiseScale: this.noiseScale,
      noiseInfluence: this.noiseInfluence
    };
  }
  
  static fromJSON(json) {
    return new BiomeConfig(json);
  }
}

export function getDefaultBiomes() {
  return [
    new BiomeConfig({
      type: BiomeType.GRASSLAND,
      name: '草地',
      color: BiomeColor.fromHex('#6a994e'),
      secondaryColor: BiomeColor.fromHex('#52793e'),
      roughness: 0.9,
      metalness: 0.0,
      minHeight: 0.2,
      maxHeight: 0.7,
      minSlope: 0,
      maxSlope: 45,
      vegetationDensity: 0.8
    }),
    new BiomeConfig({
      type: BiomeType.FOREST,
      name: '森林',
      color: BiomeColor.fromHex('#386641'),
      secondaryColor: BiomeColor.fromHex('#2d5234'),
      roughness: 0.85,
      metalness: 0.0,
      minHeight: 0.25,
      maxHeight: 0.75,
      minSlope: 0,
      maxSlope: 40,
      vegetationDensity: 1.0
    }),
    new BiomeConfig({
      type: BiomeType.DESERT,
      name: '沙漠',
      color: BiomeColor.fromHex('#f4a261'),
      secondaryColor: BiomeColor.fromHex('#e76f51'),
      roughness: 0.7,
      metalness: 0.0,
      minHeight: 0.15,
      maxHeight: 0.6,
      minSlope: 0,
      maxSlope: 30,
      vegetationDensity: 0.1
    }),
    new BiomeConfig({
      type: BiomeType.SNOW,
      name: '雪原',
      color: BiomeColor.fromHex('#f8f9fa'),
      secondaryColor: BiomeColor.fromHex('#e9ecef'),
      roughness: 0.6,
      metalness: 0.05,
      minHeight: 0.65,
      maxHeight: 1.0,
      minSlope: 0,
      maxSlope: 60,
      vegetationDensity: 0.05
    }),
    new BiomeConfig({
      type: BiomeType.MOUNTAIN,
      name: '山地',
      color: BiomeColor.fromHex('#6c757d'),
      secondaryColor: BiomeColor.fromHex('#495057'),
      roughness: 0.95,
      metalness: 0.0,
      minHeight: 0.55,
      maxHeight: 1.0,
      minSlope: 20,
      maxSlope: 90,
      vegetationDensity: 0.2
    }),
    new BiomeConfig({
      type: BiomeType.VOLCANIC,
      name: '火山',
      color: BiomeColor.fromHex('#4a4a4a'),
      secondaryColor: BiomeColor.fromHex('#2d2d2d'),
      roughness: 0.8,
      metalness: 0.1,
      minHeight: 0.4,
      maxHeight: 1.0,
      minSlope: 15,
      maxSlope: 90,
      vegetationDensity: 0.0
    }),
    new BiomeConfig({
      type: BiomeType.OCEAN,
      name: '海洋',
      color: BiomeColor.fromHex('#1a659e'),
      secondaryColor: BiomeColor.fromHex('#0f4c81'),
      roughness: 0.3,
      metalness: 0.2,
      minHeight: 0.0,
      maxHeight: 0.35,
      minSlope: 0,
      maxSlope: 20,
      vegetationDensity: 0.0
    }),
    new BiomeConfig({
      type: BiomeType.BEACH,
      name: '沙滩',
      color: BiomeColor.fromHex('#fff3b0'),
      secondaryColor: BiomeColor.fromHex('#e9d8a6'),
      roughness: 0.6,
      metalness: 0.0,
      minHeight: 0.3,
      maxHeight: 0.4,
      minSlope: 0,
      maxSlope: 15,
      vegetationDensity: 0.2
    }),
    new BiomeConfig({
      type: BiomeType.TROPICAL,
      name: '热带',
      color: BiomeColor.fromHex('#2d6a4f'),
      secondaryColor: BiomeColor.fromHex('#1b4332'),
      roughness: 0.9,
      metalness: 0.0,
      minHeight: 0.15,
      maxHeight: 0.55,
      minSlope: 0,
      maxSlope: 35,
      vegetationDensity: 1.0
    }),
    new BiomeConfig({
      type: BiomeType.SWAMP,
      name: '沼泽',
      color: BiomeColor.fromHex('#5c677d'),
      secondaryColor: BiomeColor.fromHex('#33415c'),
      roughness: 0.85,
      metalness: 0.0,
      minHeight: 0.1,
      maxHeight: 0.45,
      minSlope: 0,
      maxSlope: 10,
      vegetationDensity: 0.6
    }),
    new BiomeConfig({
      type: BiomeType.TUNDRA,
      name: '苔原',
      color: BiomeColor.fromHex('#9c6644'),
      secondaryColor: BiomeColor.fromHex('#7f5539'),
      roughness: 0.9,
      metalness: 0.0,
      minHeight: 0.5,
      maxHeight: 0.75,
      minSlope: 0,
      maxSlope: 30,
      vegetationDensity: 0.15
    })
  ];
}

export class BiomeBrushConfig extends BrushConfig {
  constructor(options = {}) {
    super(options);
    this.biomeType = options.biomeType || BiomeType.GRASSLAND;
    this.blendRadius = options.blendRadius !== undefined ? options.blendRadius : 3;
    this.blendMode = options.blendMode || BiomeBlendMode.SMOOTH;
    this.opacity = options.opacity !== undefined ? options.opacity : 1.0;
  }
  
  clone() {
    return new BiomeBrushConfig({
      ...super.clone().toJSON(),
      biomeType: this.biomeType,
      blendRadius: this.blendRadius,
      blendMode: this.blendMode,
      opacity: this.opacity
    });
  }
  
  toJSON() {
    return {
      ...super.toJSON(),
      biomeType: this.biomeType,
      blendRadius: this.blendRadius,
      blendMode: this.blendMode,
      opacity: this.opacity
    };
  }
  
  static fromJSON(json) {
    return new BiomeBrushConfig(json);
  }
}

export class BiomeCanvas {
  constructor(width = 128, height = 128) {
    this.width = width;
    this.height = height;
    
    this.biomeMap = new Int8Array(width * height);
    this.biomeWeights = new Float32Array(width * height);
    this.blendWeights = new Float32Array(width * height * 16);
    
    this.defaultBiome = BiomeType.GRASSLAND;
    this.dirty = true;
  }
  
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.biomeMap = new Int8Array(width * height);
    this.biomeWeights = new Float32Array(width * height);
    this.blendWeights = new Float32Array(width * height * 16);
    this.dirty = true;
  }
  
  getIndex(x, y) {
    return y * this.width + x;
  }
  
  getBiomeAt(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return this.defaultBiome;
    }
    const idx = this.getIndex(x, y);
    return this.biomeMap[idx];
  }
  
  getWeightAt(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return 1.0;
    }
    const idx = this.getIndex(x, y);
    return this.biomeWeights[idx];
  }
  
  setBiomeAt(x, y, biomeType, weight = 1.0) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const idx = this.getIndex(x, y);
    this.biomeMap[idx] = biomeType;
    this.biomeWeights[idx] = weight;
    this.dirty = true;
  }
  
  fill(biomeType) {
    this.biomeMap.fill(biomeType);
    this.biomeWeights.fill(1.0);
    this.dirty = true;
  }
  
  clear() {
    this.biomeMap.fill(this.defaultBiome);
    this.biomeWeights.fill(1.0);
    this.dirty = true;
  }
  
  applyBrush(centerX, centerY, brushConfig, biomeConfigs) {
    const radius = brushConfig.radius;
    const biomeType = brushConfig.biomeType;
    const opacity = brushConfig.opacity;
    const blendRadius = brushConfig.blendRadius;
    const blendMode = brushConfig.blendMode;
    
    const minX = Math.max(0, Math.floor(centerX - radius - blendRadius));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radius + blendRadius));
    const minY = Math.max(0, Math.floor(centerY - radius - blendRadius));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radius + blendRadius));
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > radius + blendRadius) continue;
        
        let factor = 1.0;
        
        if (dist <= radius) {
          factor = 1.0;
        } else if (blendRadius > 0) {
          const blendDist = dist - radius;
          const blendT = 1 - (blendDist / blendRadius);
          
          switch (blendMode) {
            case BiomeBlendMode.LINEAR:
              factor = blendT;
              break;
            case BiomeBlendMode.SMOOTH:
              factor = blendT * blendT * (3 - 2 * blendT);
              break;
            case BiomeBlendMode.DISTANCE:
              factor = Math.sqrt(blendT);
              break;
            default:
              factor = 0;
          }
        }
        
        factor *= opacity;
        
        const idx = this.getIndex(x, y);
        const currentWeight = this.biomeWeights[idx];
        
        if (factor > 0.5) {
          this.biomeMap[idx] = biomeType;
        }
        
        const newWeight = currentWeight * (1 - factor) + factor;
        this.biomeWeights[idx] = Math.min(1, Math.max(0, newWeight));
      }
    }
    
    this.dirty = true;
  }
  
  sampleBlendedBiomes(x, y, biomeConfigs, blendRange = 2) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    
    const results = [];
    const totalWeights = new Map();
    
    for (let dy = -blendRange; dy <= blendRange; dy++) {
      for (let dx = -blendRange; dx <= blendRange; dx++) {
        const sx = fx + dx;
        const sy = fy + dy;
        
        if (sx < 0 || sx >= this.width || sy < 0 || sy >= this.height) {
          continue;
        }
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > blendRange) continue;
        
        const idx = this.getIndex(sx, sy);
        const biomeType = this.biomeMap[idx];
        const weight = this.biomeWeights[idx];
        
        const distFactor = 1 - (dist / (blendRange + 1));
        const finalWeight = weight * distFactor;
        
        if (totalWeights.has(biomeType)) {
          totalWeights.set(biomeType, totalWeights.get(biomeType) + finalWeight);
        } else {
          totalWeights.set(biomeType, finalWeight);
        }
      }
    }
    
    let totalSum = 0;
    for (const [type, weight] of totalWeights) {
      totalSum += weight;
      results.push({ type, weight });
    }
    
    if (totalSum > 0) {
      results.forEach(r => r.weight /= totalSum);
    }
    
    results.sort((a, b) => b.weight - a.weight);
    
    return results;
  }
  
  generateColorMap(biomeConfigs, blendEnabled = true) {
    const colorMap = new Uint8ClampedArray(this.width * this.height * 4);
    const biomeMap = new Map();
    
    for (const config of biomeConfigs) {
      biomeMap.set(config.type, config);
    }
    
    const defaultConfig = biomeConfigs[0] || new BiomeConfig();
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (y * this.width + x) * 4;
        
        let r, g, b;
        
        if (blendEnabled) {
          const blended = this.sampleBlendedBiomes(x, y, biomeConfigs, 2);
          let finalR = 0, finalG = 0, finalB = 0;
          
          for (const { type, weight } of blended) {
            const config = biomeMap.get(type) || defaultConfig;
            const color = config.color;
            finalR += color.r * weight;
            finalG += color.g * weight;
            finalB += color.b * weight;
          }
          
          r = Math.round(finalR);
          g = Math.round(finalG);
          b = Math.round(finalB);
        } else {
          const biomeType = this.getBiomeAt(x, y);
          const config = biomeMap.get(biomeType) || defaultConfig;
          const color = config.color;
          r = color.r;
          g = color.g;
          b = color.b;
        }
        
        colorMap[idx] = r;
        colorMap[idx + 1] = g;
        colorMap[idx + 2] = b;
        colorMap[idx + 3] = 255;
      }
    }
    
    return colorMap;
  }
  
  generateBiomeIdMap() {
    const idMap = new Uint8Array(this.width * this.height);
    
    for (let i = 0; i < this.biomeMap.length; i++) {
      idMap[i] = this.biomeMap[i] + 1;
    }
    
    return idMap;
  }
  
  toJSON() {
    return {
      width: this.width,
      height: this.height,
      biomeMap: Array.from(this.biomeMap),
      biomeWeights: Array.from(this.biomeWeights),
      defaultBiome: this.defaultBiome
    };
  }
  
  static fromJSON(json) {
    const canvas = new BiomeCanvas(json.width, json.height);
    canvas.biomeMap = new Int8Array(json.biomeMap);
    canvas.biomeWeights = new Float32Array(json.biomeWeights);
    canvas.defaultBiome = json.defaultBiome;
    return canvas;
  }
}

export class BiomeSystem {
  constructor() {
    this.biomes = getDefaultBiomes();
    this.canvas = null;
    this.brushConfig = new BiomeBrushConfig();
    this.blendEnabled = true;
    this.blendRange = 2;
  }
  
  init(width, height) {
    this.canvas = new BiomeCanvas(width, height);
    this.canvas.fill(this.biomes[0]?.type || BiomeType.GRASSLAND);
  }
  
  resize(width, height) {
    if (this.canvas) {
      this.canvas.resize(width, height);
    } else {
      this.init(width, height);
    }
  }
  
  getBiomes() {
    return this.biomes;
  }
  
  getEnabledBiomes() {
    return this.biomes.filter(b => b.enabled);
  }
  
  getBiomeByType(type) {
    return this.biomes.find(b => b.type === type);
  }
  
  setBiomes(biomes) {
    this.biomes = biomes;
  }
  
  updateBiome(index, updates) {
    if (index >= 0 && index < this.biomes.length) {
      this.biomes[index] = { ...this.biomes[index], ...updates };
    }
  }
  
  getCanvas() {
    return this.canvas;
  }
  
  setBrushConfig(config) {
    this.brushConfig = config instanceof BiomeBrushConfig 
      ? config 
      : new BiomeBrushConfig(config);
  }
  
  getBrushConfig() {
    return this.brushConfig;
  }
  
  applyBrush(centerX, centerY) {
    if (!this.canvas) return;
    this.canvas.applyBrush(centerX, centerY, this.brushConfig, this.biomes);
  }
  
  fillWithBiome(biomeType) {
    if (this.canvas) {
      this.canvas.fill(biomeType);
    }
  }
  
  generateColorData() {
    if (!this.canvas) return null;
    return this.canvas.generateColorMap(this.biomes, this.blendEnabled);
  }
  
  generateBiomeIdData() {
    if (!this.canvas) return null;
    return this.canvas.generateBiomeIdMap();
  }
  
  getBlendedColorAt(x, y) {
    if (!this.canvas) return new BiomeColor();
    
    const blended = this.canvas.sampleBlendedBiomes(x, y, this.biomes, this.blendRange);
    let finalR = 0, finalG = 0, finalB = 0;
    
    for (const { type, weight } of blended) {
      const config = this.getBiomeByType(type);
      if (config) {
        finalR += config.color.r * weight;
        finalG += config.color.g * weight;
        finalB += config.color.b * weight;
      }
    }
    
    return new BiomeColor(Math.round(finalR), Math.round(finalG), Math.round(finalB));
  }
  
  getMaterialParamsAt(x, y, height = 0.5, slope = 0) {
    if (!this.canvas) {
      return {
        color: new BiomeColor(100, 150, 80),
        roughness: 0.9,
        metalness: 0.0
      };
    }
    
    const blended = this.canvas.sampleBlendedBiomes(x, y, this.biomes, this.blendRange);
    
    let colorR = 0, colorG = 0, colorB = 0;
    let roughness = 0, metalness = 0;
    
    for (const { type, weight } of blended) {
      const config = this.getBiomeByType(type);
      if (config) {
        colorR += config.color.r * weight;
        colorG += config.color.g * weight;
        colorB += config.color.b * weight;
        roughness += config.roughness * weight;
        metalness += config.metalness * weight;
      }
    }
    
    return {
      color: new BiomeColor(Math.round(colorR), Math.round(colorG), Math.round(colorB)),
      roughness,
      metalness
    };
  }
  
  exportBiomeTexture(format = 'png') {
    if (!this.canvas) return null;
    
    const colorData = this.generateColorData();
    
    const canvas = document.createElement('canvas');
    canvas.width = this.canvas.width;
    canvas.height = this.canvas.height;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(this.canvas.width, this.canvas.height);
    imageData.data.set(colorData);
    ctx.putImageData(imageData, 0, 0);
    
    return {
      canvas,
      dataUrl: canvas.toDataURL('image/png'),
      width: this.canvas.width,
      height: this.canvas.height
    };
  }
  
  exportBiomeIdTexture() {
    if (!this.canvas) return null;
    
    const idData = this.generateBiomeIdData();
    
    const canvas = document.createElement('canvas');
    canvas.width = this.canvas.width;
    canvas.height = this.canvas.height;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(this.canvas.width, this.canvas.height);
    
    for (let i = 0; i < idData.length; i++) {
      const idx = i * 4;
      const id = idData[i];
      imageData.data[idx] = id;
      imageData.data[idx + 1] = id;
      imageData.data[idx + 2] = id;
      imageData.data[idx + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return {
      canvas,
      dataUrl: canvas.toDataURL('image/png'),
      width: this.canvas.width,
      height: this.canvas.height
    };
  }
  
  toJSON() {
    return {
      biomes: this.biomes.map(b => b.toJSON()),
      canvas: this.canvas ? this.canvas.toJSON() : null,
      brushConfig: this.brushConfig.toJSON(),
      blendEnabled: this.blendEnabled,
      blendRange: this.blendRange
    };
  }
  
  static fromJSON(json) {
    const system = new BiomeSystem();
    
    if (json.biomes) {
      system.biomes = json.biomes.map(b => BiomeConfig.fromJSON(b));
    }
    
    if (json.canvas) {
      system.canvas = BiomeCanvas.fromJSON(json.canvas);
    }
    
    if (json.brushConfig) {
      system.brushConfig = BiomeBrushConfig.fromJSON(json.brushConfig);
    }
    
    if (json.blendEnabled !== undefined) {
      system.blendEnabled = json.blendEnabled;
    }
    
    if (json.blendRange !== undefined) {
      system.blendRange = json.blendRange;
    }
    
    return system;
  }
}

export default BiomeSystem;
