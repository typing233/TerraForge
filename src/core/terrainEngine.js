import MultiNoiseGenerator, { NoiseLayerConfig, NoiseType } from './noise';
import BrushSystem, { BrushConfig, BrushType, FalloffType } from './brushes';
import ErosionSystem, { HydraulicErosion, ThermalErosion } from './erosion';
import VegetationSystem, { VegetationConfig, VegetationType } from './vegetation';
import TerrainRenderer, { RenderMode } from './terrainRenderer';
import TerrainConfig, { HeightmapExporter, ExportConfig } from './terrainConfig';
import LLMService, { LLMConfig } from './llmService';

export class TerrainEngine {
  constructor(container) {
    this.config = new TerrainConfig();
    this.renderer = null;
    
    // 核心系统
    this.noiseGenerator = new MultiNoiseGenerator(this.config.seed);
    this.brushSystem = new BrushSystem();
    this.erosionSystem = new ErosionSystem();
    this.vegetationSystem = new VegetationSystem();
    this.llmService = new LLMService();
    
    // 当前地形数据
    this.currentHeightmap = null;
    this.currentMeshData = null;
    this.currentWidth = 0;
    this.currentHeight = 0;
    
    // 回调
    this.onTerrainChanged = null;
    this.onBrushActive = null;
    this.onVegetationGenerated = null;
    
    // 初始化渲染器
    if (container) {
      this.initRenderer(container);
    }
  }
  
  initRenderer(container) {
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.renderer = new TerrainRenderer(container);
  }
  
  getConfig() {
    return this.config;
  }
  
  setConfig(config) {
    this.config = config instanceof TerrainConfig ? config : new TerrainConfig(config);
    
    // 更新各系统的配置
    this.noiseGenerator.setSeed(this.config.seed);
    this.noiseGenerator.setLayers(this.config.noiseLayers);
    this.brushSystem.setConfig(this.config.brushConfig);
    this.vegetationSystem.setConfigs(this.config.vegetationConfigs);
    this.llmService.setConfig(new LLMConfig(this.config.llmConfig));
  }
  
  // 从高度图重新计算网格数据
  heightmapToMeshData(heightmap, width, height) {
    const scale = this.config.terrainScale;
    const heightScale = this.config.heightScale;
    
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    
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
    const getH = (px, py) => {
      px = Math.max(0, Math.min(px, width - 1));
      py = Math.max(0, Math.min(py, height - 1));
      return heightmap[py * width + px] * heightScale;
    };
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const hL = getH(x - 1, y);
        const hR = getH(x + 1, y);
        const hD = getH(x, y - 1);
        const hU = getH(x, y + 1);
        
        const stepX = scale / (width - 1);
        const stepZ = scale / (height - 1);
        
        const tx = 1, ty = (hR - hL) / (2 * stepX), tz = 0;
        const bx = 0, by = (hU - hD) / (2 * stepZ), bz = 1;
        
        let nx = ty * bz - tz * by;
        let ny = tz * bx - tx * bz;
        let nz = tx * by - ty * bx;
        
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
        
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    
    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices),
      heightmap: heightmap,
      width,
      height
    };
  }
  
  // 生成地形
  generateTerrain() {
    const width = this.config.gridWidth;
    const height = this.config.gridHeight;
    
    // 设置噪声配置
    this.noiseGenerator.setSeed(this.config.seed);
    this.noiseGenerator.setLayers(this.config.noiseLayers);
    
    // 生成基础高度图
    let heightmap = this.noiseGenerator.generateHeightmap(width, height, true);
    
    // 应用水力侵蚀
    if (this.config.hydraulicEnabled) {
      this.erosionSystem.setHydraulicParams(this.config.hydraulicParams);
      heightmap = this.erosionSystem.applyHydraulic(
        heightmap, 
        width, 
        height, 
        this.config.hydraulicParams.numDroplets || 50000,
        this.config.seed
      );
    }
    
    // 应用热力侵蚀
    if (this.config.thermalEnabled) {
      this.erosionSystem.setThermalParams(this.config.thermalParams);
      heightmap = this.erosionSystem.applyThermal(heightmap, width, height);
    }
    
    this.currentHeightmap = heightmap;
    this.currentWidth = width;
    this.currentHeight = height;
    
    // 生成网格数据
    this.currentMeshData = this.heightmapToMeshData(heightmap, width, height);
    
    // 更新渲染器
    if (this.renderer) {
      this.renderer.updateTerrain(
        this.currentMeshData, 
        this.config.terrainScale, 
        this.config.heightScale
      );
      
      // 更新水面
      if (this.config.waterEnabled) {
        this.renderer.updateWater(
          this.config.waterLevel,
          this.config.terrainScale,
          this.config.heightScale
        );
        this.renderer.showWater();
      } else {
        this.renderer.hideWater();
      }
    }
    
    // 触发回调
    if (this.onTerrainChanged) {
      this.onTerrainChanged(this.currentMeshData);
    }
    
    return this.currentMeshData;
  }
  
  // 重新渲染（不重新生成地形）
  rerender() {
    if (!this.currentHeightmap || !this.renderer) return;
    
    this.currentMeshData = this.heightmapToMeshData(
      this.currentHeightmap, 
      this.currentWidth, 
      this.currentHeight
    );
    
    this.renderer.updateTerrain(
      this.currentMeshData, 
      this.config.terrainScale, 
      this.config.heightScale
    );
    
    // 更新水面
    if (this.config.waterEnabled) {
      this.renderer.updateWater(
        this.config.waterLevel,
        this.config.terrainScale,
        this.config.heightScale
      );
      this.renderer.showWater();
    } else {
      this.renderer.hideWater();
    }
    
    if (this.onTerrainChanged) {
      this.onTerrainChanged(this.currentMeshData);
    }
  }
  
  // 应用笔刷编辑
  applyBrush(worldX, worldZ, isStart = false) {
    if (!this.currentHeightmap || !this.renderer) return;
    
    // 转换世界坐标到高度图坐标
    const width = this.currentWidth;
    const height = this.currentHeight;
    const scale = this.config.terrainScale;
    
    // 世界坐标范围: -scale/2 到 scale/2
    // 转换到 0 到 width-1 范围
    const hx = ((worldX / scale) + 0.5) * (width - 1);
    const hy = ((worldZ / scale) + 0.5) * (height - 1);
    
    // 更新笔刷配置
    this.brushSystem.setConfig(this.config.brushConfig);
    
    if (isStart) {
      this.brushSystem.startBrush(hx, hy);
    }
    
    // 应用笔刷
    this.currentHeightmap = this.brushSystem.updateBrush(
      this.currentHeightmap,
      width,
      height,
      hx,
      hy
    );
    
    // 更新渲染
    this.rerender();
  }
  
  // 结束笔刷
  endBrush() {
    this.brushSystem.endBrush();
  }
  
  // 生成植被
  generateVegetation() {
    if (!this.currentHeightmap) return [];
    
    this.vegetationSystem.setConfigs(this.config.vegetationConfigs);
    
    const instances = this.vegetationSystem.generate(
      this.currentHeightmap,
      this.currentWidth,
      this.currentHeight,
      this.config.terrainScale,
      this.config.heightScale,
      this.config.waterEnabled ? this.config.waterLevel : 0
    );
    
    // 更新渲染器
    if (this.renderer && this.config.vegetationEnabled) {
      this.renderer.updateVegetation(instances, this.config.terrainScale);
    }
    
    if (this.onVegetationGenerated) {
      this.onVegetationGenerated(instances);
    }
    
    return instances;
  }
  
  // 清除植被
  clearVegetation() {
    this.vegetationSystem.clear();
    if (this.renderer) {
      this.renderer.clearVegetation();
    }
  }
  
  // 应用水力侵蚀
  applyHydraulicErosion(numDroplets = 50000) {
    if (!this.currentHeightmap) return;
    
    this.erosionSystem.setHydraulicParams(this.config.hydraulicParams);
    this.currentHeightmap = this.erosionSystem.applyHydraulic(
      this.currentHeightmap,
      this.currentWidth,
      this.currentHeight,
      numDroplets,
      this.config.seed
    );
    
    this.rerender();
  }
  
  // 应用热力侵蚀
  applyThermalErosion() {
    if (!this.currentHeightmap) return;
    
    this.erosionSystem.setThermalParams(this.config.thermalParams);
    this.currentHeightmap = this.erosionSystem.applyThermal(
      this.currentHeightmap,
      this.currentWidth,
      this.currentHeight
    );
    
    this.rerender();
  }
  
  // 设置渲染模式
  setRenderMode(mode) {
    if (this.renderer) {
      this.renderer.setRenderMode(mode);
    }
  }
  
  // 更新笔刷指示器
  updateBrushIndicator(worldX, worldZ, visible = true) {
    if (this.renderer) {
      const radius = (this.config.brushConfig.radius / (this.currentWidth - 1)) * this.config.terrainScale;
      this.renderer.updateBrushIndicator(worldX, worldZ, radius, visible);
    }
  }
  
  // 隐藏笔刷指示器
  hideBrushIndicator() {
    if (this.renderer) {
      this.renderer.hideBrush();
    }
  }
  
  // 屏幕坐标转地形坐标
  screenToTerrain(screenX, screenY) {
    if (this.renderer) {
      return this.renderer.screenToTerrain(screenX, screenY);
    }
    return null;
  }
  
  // 导出高度图
  exportHeightmap(format = 'png', options = {}) {
    if (!this.currentHeightmap) {
      throw new Error('没有可用的地形数据');
    }
    
    const exportConfig = new ExportConfig(options);
    
    // 可选：包含水面
    let exportHeightmap = this.currentHeightmap;
    if (exportConfig.includeWater && this.config.waterEnabled) {
      exportHeightmap = new Float32Array(this.currentHeightmap);
      for (let i = 0; i < exportHeightmap.length; i++) {
        if (exportHeightmap[i] < this.config.waterLevel) {
          exportHeightmap[i] = this.config.waterLevel;
        }
      }
    }
    
    const exportOptions = {
      normalize: exportConfig.normalize,
      minValue: exportConfig.scaleToRange ? exportConfig.minHeight : undefined,
      maxValue: exportConfig.scaleToRange ? exportConfig.maxHeight : undefined
    };
    
    if (format === 'raw') {
      HeightmapExporter.downloadRAW(
        exportHeightmap,
        this.currentWidth,
        this.currentHeight,
        `heightmap_${this.currentWidth}x${this.currentHeight}.raw`,
        exportOptions
      );
    } else {
      HeightmapExporter.downloadPNG(
        exportHeightmap,
        this.currentWidth,
        this.currentHeight,
        `heightmap_${this.currentWidth}x${this.currentHeight}.png`,
        exportOptions
      );
    }
  }
  
  // 获取当前高度图数据（用于导出）
  getHeightmapData() {
    if (!this.currentHeightmap) return null;
    return {
      heightmap: new Float32Array(this.currentHeightmap),
      width: this.currentWidth,
      height: this.currentHeight
    };
  }
  
  // 保存配置
  async saveConfig(filePath = null) {
    const configData = this.config.toJSON();
    
    // 保存当前地形状态（如果有）
    if (this.currentHeightmap) {
      // 注意：高度图数据太大，不保存到 JSON
      // 只保存配置，用户可以重新生成
    }
    
    if (window.electronAPI && window.electronAPI.saveConfig) {
      const result = await window.electronAPI.saveConfig(configData, filePath);
      return result;
    }
    
    // 浏览器环境下下载
    const dataStr = JSON.stringify(configData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'terrain_config.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    return { success: true };
  }
  
  // 加载配置
  async loadConfig() {
    if (window.electronAPI && window.electronAPI.loadConfig) {
      const result = await window.electronAPI.loadConfig();
      if (result.success && result.config) {
        const loadedConfig = new TerrainConfig(result.config);
        this.setConfig(loadedConfig);
        return { success: true, config: loadedConfig };
      }
      return result;
    }
    
    // 浏览器环境下使用文件选择
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const json = JSON.parse(event.target.result);
              const loadedConfig = new TerrainConfig(json);
              this.setConfig(loadedConfig);
              resolve({ success: true, config: loadedConfig });
            } catch (error) {
              resolve({ success: false, error: error.message });
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    });
  }
  
  // 测试 LLM 连接
  async testLLMConnection() {
    return this.llmService.testConnection();
  }
  
  // 获取 LLM 建议
  async getLLMSuggestions() {
    return this.llmService.generateTerrainSuggestions(this.config);
  }
  
  // 解析自然语言
  async parseNaturalLanguage(description) {
    return this.llmService.parseNaturalLanguage(description);
  }
  
  // 销毁
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}

export default TerrainEngine;