import { NoiseLayerConfig } from './noise';
import { BrushConfig } from './brushes';
import { VegetationConfig } from './vegetation';

// 地形全局配置
export class TerrainConfig {
  constructor(options = {}) {
    this.version = '1.0.0';
    
    // 地形尺寸
    this.gridWidth = options.gridWidth || 128;
    this.gridHeight = options.gridHeight || 128;
    this.terrainScale = options.terrainScale || 100;
    this.heightScale = options.heightScale || 50;
    
    // 噪声种子
    this.seed = options.seed !== undefined ? options.seed : Math.floor(Math.random() * 1000000);
    
    // 噪声层配置
    this.noiseLayers = options.noiseLayers ? 
      options.noiseLayers.map(l => NoiseLayerConfig.fromJSON(l)) : 
      this.getDefaultNoiseLayers();
    
    // 水面配置
    this.waterEnabled = options.waterEnabled !== undefined ? options.waterEnabled : false;
    this.waterLevel = options.waterLevel !== undefined ? options.waterLevel : 0.3;
    
    // 侵蚀配置
    this.hydraulicEnabled = options.hydraulicEnabled !== undefined ? options.hydraulicEnabled : false;
    this.hydraulicParams = options.hydraulicParams || {
      inertia: 0.05,
      sedimentCapacity: 4,
      erosionRate: 0.3,
      depositRate: 0.3,
      evaporateRate: 0.02,
      maxSteps: 80,
      erosionBrushRadius: 3,
      numDroplets: 50000
    };
    
    this.thermalEnabled = options.thermalEnabled !== undefined ? options.thermalEnabled : false;
    this.thermalParams = options.thermalParams || {
      angleOfRepose: 30,
      erosionRate: 0.5,
      iterations: 10
    };
    
    // 笔刷配置
    this.brushConfig = options.brushConfig ? 
      BrushConfig.fromJSON(options.brushConfig) : 
      new BrushConfig();
    
    // 植被配置
    this.vegetationEnabled = options.vegetationEnabled !== undefined ? options.vegetationEnabled : false;
    this.vegetationConfigs = options.vegetationConfigs ? 
      options.vegetationConfigs.map(v => VegetationConfig.fromJSON(v)) : 
      this.getDefaultVegetationConfigs();
    
    // LLM 配置
    this.llmConfig = options.llmConfig || {
      enabled: false,
      baseUrl: '',
      apiKey: '',
      modelName: ''
    };
  }
  
  // 默认噪声层
  getDefaultNoiseLayers() {
    return [
      // 基础地形层（低频，大尺度）
      new NoiseLayerConfig({
        type: 'simplex',
        enabled: true,
        frequency: 0.5,
        amplitude: 1.0,
        octaves: 6,
        persistence: 0.5,
        lacunarity: 2.0,
        weight: 1.0
      }),
      // 细节层（中频）
      new NoiseLayerConfig({
        type: 'simplex',
        enabled: true,
        frequency: 2.0,
        amplitude: 0.5,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2.0,
        weight: 0.6
      }),
      // 高频细节
      new NoiseLayerConfig({
        type: 'perlin',
        enabled: true,
        frequency: 8.0,
        amplitude: 0.2,
        octaves: 3,
        persistence: 0.5,
        lacunarity: 2.0,
        weight: 0.3
      })
    ];
  }
  
  // 默认植被配置
  getDefaultVegetationConfigs() {
    return [
      // 草丛
      new VegetationConfig({
        type: 'grass',
        enabled: true,
        density: 0.8,
        minHeight: 0.2,
        maxHeight: 0.8,
        minSlope: 0,
        maxSlope: 30,
        scaleMin: 0.6,
        scaleMax: 1.2,
        seed: 12345
      }),
      // 灌木
      new VegetationConfig({
        type: 'bush',
        enabled: true,
        density: 0.3,
        minHeight: 0.3,
        maxHeight: 0.9,
        minSlope: 0,
        maxSlope: 40,
        scaleMin: 0.8,
        scaleMax: 1.5,
        seed: 23456
      }),
      // 低树
      new VegetationConfig({
        type: 'tree_low',
        enabled: true,
        density: 0.15,
        minHeight: 0.3,
        maxHeight: 0.85,
        minSlope: 0,
        maxSlope: 35,
        scaleMin: 0.9,
        scaleMax: 1.3,
        seed: 34567
      }),
      // 中树
      new VegetationConfig({
        type: 'tree_medium',
        enabled: true,
        density: 0.1,
        minHeight: 0.4,
        maxHeight: 0.9,
        minSlope: 0,
        maxSlope: 30,
        scaleMin: 1.0,
        scaleMax: 1.4,
        seed: 45678
      }),
      // 高树
      new VegetationConfig({
        type: 'tree_high',
        enabled: false,
        density: 0.05,
        minHeight: 0.5,
        maxHeight: 0.95,
        minSlope: 0,
        maxSlope: 25,
        scaleMin: 1.1,
        scaleMax: 1.5,
        seed: 56789
      })
    ];
  }
  
  clone() {
    return new TerrainConfig(this.toJSON());
  }
  
  toJSON() {
    return {
      version: this.version,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      terrainScale: this.terrainScale,
      heightScale: this.heightScale,
      seed: this.seed,
      noiseLayers: this.noiseLayers.map(l => l.toJSON()),
      waterEnabled: this.waterEnabled,
      waterLevel: this.waterLevel,
      hydraulicEnabled: this.hydraulicEnabled,
      hydraulicParams: { ...this.hydraulicParams },
      thermalEnabled: this.thermalEnabled,
      thermalParams: { ...this.thermalParams },
      brushConfig: this.brushConfig.toJSON(),
      vegetationEnabled: this.vegetationEnabled,
      vegetationConfigs: this.vegetationConfigs.map(v => v.toJSON()),
      llmConfig: { ...this.llmConfig }
    };
  }
  
  static fromJSON(json) {
    return new TerrainConfig(json);
  }
}

// 导出配置
export class ExportConfig {
  constructor(options = {}) {
    this.format = options.format || 'png'; // 'png', 'raw'
    this.width = options.width || 1024;
    this.height = options.height || 1024;
    this.bitDepth = options.bitDepth || 16;
    this.normalize = options.normalize !== undefined ? options.normalize : true;
    this.includeWater = options.includeWater !== undefined ? options.includeWater : false;
    this.scaleToRange = options.scaleToRange || false;
    this.minHeight = options.minHeight || 0;
    this.maxHeight = options.maxHeight || 1;
  }
  
  clone() {
    return new ExportConfig(this.toJSON());
  }
  
  toJSON() {
    return {
      format: this.format,
      width: this.width,
      height: this.height,
      bitDepth: this.bitDepth,
      normalize: this.normalize,
      includeWater: this.includeWater,
      scaleToRange: this.scaleToRange,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight
    };
  }
  
  static fromJSON(json) {
    return new ExportConfig(json);
  }
}

// 高度图导出工具
export class HeightmapExporter {
  constructor() {}
  
  // 将高度图数据转换为 16 位整数数组
  static toUint16Array(heightmap, width, height, options = {}) {
    const {
      normalize = true,
      minValue = 0,
      maxValue = 1,
      invert = false
    } = options;
    
    const result = new Uint16Array(width * height);
    
    let min = Infinity;
    let max = -Infinity;
    
    if (normalize) {
      for (const h of heightmap) {
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    } else {
      min = minValue;
      max = maxValue;
    }
    
    const range = max - min || 1;
    
    for (let i = 0; i < heightmap.length; i++) {
      let value = (heightmap[i] - min) / range;
      
      if (invert) {
        value = 1 - value;
      }
      
      // 限制在 0-1 范围内
      value = Math.max(0, Math.min(1, value));
      
      // 转换为 16 位无符号整数 (0-65535)
      result[i] = Math.floor(value * 65535);
    }
    
    return result;
  }
  
  // 生成 PNG 图像数据
  static generatePNGData(uint16Data, width, height) {
    // 创建 canvas 来生成 PNG
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(width, height);
    
    for (let i = 0; i < uint16Data.length; i++) {
      const value = uint16Data[i];
      const pixelIndex = i * 4;
      
      // 将 16 位值拆分为高 8 位和低 8 位
      // 这里我们使用 RGB 通道来存储高 8 位，alpha 存储低 8 位
      // 这样可以保持 16 位精度
      const highByte = (value >> 8) & 0xFF;
      const lowByte = value & 0xFF;
      
      // 简单方法：使用灰度 8 位显示（精度会损失，但视觉上可看）
      // 更好的方法是使用 RGB 来存储完整 16 位值供引擎读取
      
      // 这里我们使用标准的 8 位灰度，同时保持数据可以转换回 16 位
      const gray8 = Math.floor((value / 65535) * 255);
      
      imageData.data[pixelIndex] = gray8;     // R
      imageData.data[pixelIndex + 1] = gray8; // G
      imageData.data[pixelIndex + 2] = gray8; // B
      imageData.data[pixelIndex + 3] = 255;   // A (不透明)
      
      // 注意：如果需要真正的 16 位 PNG，需要使用专用库
      // 这里的实现是兼容主流引擎的 8 位灰度（视觉效果）
      // 实际导出时应该使用 16 位模式
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return canvas.toDataURL('image/png');
  }
  
  // 生成 RAW 文件数据
  static generateRAWData(uint16Data, littleEndian = true) {
    const buffer = new ArrayBuffer(uint16Data.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < uint16Data.length; i++) {
      view.setUint16(i * 2, uint16Data[i], littleEndian);
    }
    
    return buffer;
  }
  
  // 导出为 PNG 数据 URL
  static exportToPNG(heightmap, width, height, options = {}) {
    const uint16Data = this.toUint16Array(heightmap, width, height, options);
    return this.generatePNGData(uint16Data, width, height);
  }
  
  // 导出为 RAW 数据
  static exportToRAW(heightmap, width, height, options = {}) {
    const { littleEndian = true, ...uint16Options } = options;
    const uint16Data = this.toUint16Array(heightmap, width, height, uint16Options);
    return this.generateRAWData(uint16Data, littleEndian);
  }
  
  // 下载文件
  static downloadFile(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // 下载 PNG
  static downloadPNG(heightmap, width, height, filename = 'heightmap.png', options = {}) {
    const dataUrl = this.exportToPNG(heightmap, width, height, options);
    this.downloadFile(dataUrl, filename);
  }
  
  // 下载 RAW
  static downloadRAW(heightmap, width, height, filename = 'heightmap.raw', options = {}) {
    const buffer = this.exportToRAW(heightmap, width, height, options);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const dataUrl = URL.createObjectURL(blob);
    this.downloadFile(dataUrl, filename);
    URL.revokeObjectURL(dataUrl);
  }
}

export default TerrainConfig;