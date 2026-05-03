import React, { useEffect, useRef, useState, useCallback } from 'react';
import TerrainEngine from './core/terrainEngine';
import { NoiseLayerConfig, NoiseType } from './core/noise';
import { BrushType, FalloffType } from './core/brushes';
import { RenderMode } from './core/terrainRenderer';
import TerrainConfig from './core/terrainConfig';
import { BiomeType } from './core/biomeSystem';
import { PathType } from './core/cameraPath';
import { TimePreset } from './core/lightTimeline';
import './App.css';

const App = () => {
  const viewportRef = useRef(null);
  const engineRef = useRef(null);
  const notificationTimerRef = useRef(null);
  
  const [leftPanelTab, setLeftPanelTab] = useState('noise');
  const [rightPanelTab, setRightPanelTab] = useState('export');
  const [renderMode, setRenderMode] = useState(RenderMode.SOLID);
  
  const [config, setConfig] = useState(() => new TerrainConfig());
  const [hasTerrain, setHasTerrain] = useState(false);
  const [vegetationCount, setVegetationCount] = useState(0);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  const [llmStatus, setLlmStatus] = useState('未配置');
  const [llmSuggestion, setLlmSuggestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [notification, setNotification] = useState(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  // ============ AI 地形生成状态 ============
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  
  // ============ 群系画布状态 ============
  const [selectedBiome, setSelectedBiome] = useState(BiomeType.GRASSLAND);
  const [biomeBrushRadius, setBiomeBrushRadius] = useState(10);
  const [biomeBrushStrength, setBiomeBrushStrength] = useState(0.8);
  const [biomeBlendRadius, setBiomeBlendRadius] = useState(5);
  
  // ============ 相机路径状态 ============
  const [pathType, setPathType] = useState(PathType.AUTOMATIC);
  const [isPathPlaying, setIsPathPlaying] = useState(false);
  const [pathProgress, setPathProgress] = useState(0);
  const [pathKeyframeCount, setPathKeyframeCount] = useState(0);
  
  // ============ 光照时间轴状态 ============
  const [lightPreset, setLightPreset] = useState(TimePreset.NOON);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [timelineProgress, setTimelineProgress] = useState(0.25);
  const [timelineSpeed, setTimelineSpeed] = useState(1);
  
  const [currentEditMode, setCurrentEditMode] = useState('height');
  
  useEffect(() => {
    const initEngine = () => {
      try {
        if (viewportRef.current && !engineRef.current) {
          console.log('Initializing TerrainEngine...');
          engineRef.current = new TerrainEngine(viewportRef.current);
          console.log('TerrainEngine initialized, getting config...');
          const newConfig = engineRef.current.getConfig();
          console.log('Config loaded:', newConfig);
          setConfig(newConfig);
          setIsEngineReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize TerrainEngine:', error);
        setIsEngineReady(true);
      }
    };
    
    const timer = setTimeout(initEngine, 100);
    
    return () => {
      clearTimeout(timer);
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);
  
  const showNotification = useCallback((message, type = 'success') => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setNotification({ message, type });
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimerRef.current = null;
    }, 3000);
  }, []);
  
  const updateConfig = useCallback((updates) => {
    if (!engineRef.current) return;
    
    const currentConfig = engineRef.current.getConfig();
    const newConfig = { ...currentConfig, ...updates };
    engineRef.current.setConfig(newConfig);
    setConfig({ ...newConfig });
  }, []);
  
  const updateNoiseLayer = useCallback((index, updates) => {
    if (!engineRef.current) return;
    
    const currentConfig = engineRef.current.getConfig();
    const newLayers = [...currentConfig.noiseLayers];
    newLayers[index] = { ...newLayers[index], ...updates };
    
    updateConfig({ noiseLayers: newLayers });
  }, [updateConfig]);
  
  const addNoiseLayer = useCallback(() => {
    if (!engineRef.current) return;
    
    const currentConfig = engineRef.current.getConfig();
    const newLayer = new NoiseLayerConfig({
      type: NoiseType.SIMPLEX,
      enabled: true,
      frequency: 1.0,
      amplitude: 1.0,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2.0,
      weight: 0.5
    });
    
    const newLayers = [...currentConfig.noiseLayers, newLayer];
    updateConfig({ noiseLayers: newLayers });
  }, [updateConfig]);
  
  const removeNoiseLayer = useCallback((index) => {
    if (!engineRef.current) return;
    
    const currentConfig = engineRef.current.getConfig();
    if (currentConfig.noiseLayers.length <= 1) {
      showNotification('至少需要保留一个噪声层', 'warning');
      return;
    }
    
    const newLayers = currentConfig.noiseLayers.filter((_, i) => i !== index);
    updateConfig({ noiseLayers: newLayers });
  }, [updateConfig, showNotification]);
  
  const generateTerrain = useCallback(() => {
    if (!engineRef.current) return;
    
    setIsGenerating(true);
    setTimeout(() => {
      if (!engineRef.current) {
        setIsGenerating(false);
        return;
      }
      try {
        engineRef.current.generateTerrain();
        setHasTerrain(true);
        setVegetationCount(0);
        showNotification('地形生成成功！');
      } catch (error) {
        showNotification('地形生成失败: ' + error.message, 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  }, [showNotification]);
  
  const applyHydraulicErosion = useCallback(() => {
    if (!engineRef.current || !hasTerrain) return;
    
    setIsGenerating(true);
    setTimeout(() => {
      if (!engineRef.current) {
        setIsGenerating(false);
        return;
      }
      try {
        engineRef.current.applyHydraulicErosion(50000);
        showNotification('水力侵蚀应用成功！');
      } catch (error) {
        showNotification('侵蚀应用失败: ' + error.message, 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  }, [hasTerrain, showNotification]);
  
  const applyThermalErosion = useCallback(() => {
    if (!engineRef.current || !hasTerrain) return;
    
    setIsGenerating(true);
    setTimeout(() => {
      if (!engineRef.current) {
        setIsGenerating(false);
        return;
      }
      try {
        engineRef.current.applyThermalErosion();
        showNotification('热力侵蚀应用成功！');
      } catch (error) {
        showNotification('侵蚀应用失败: ' + error.message, 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  }, [hasTerrain, showNotification]);
  
  const generateVegetation = useCallback(() => {
    if (!engineRef.current || !hasTerrain) return;
    
    try {
      const instances = engineRef.current.generateVegetation();
      setVegetationCount(instances.length);
      showNotification(`生成了 ${instances.length} 个植被实例！`);
    } catch (error) {
      showNotification('植被生成失败: ' + error.message, 'error');
    }
  }, [hasTerrain, showNotification]);
  
  const exportHeightmap = useCallback(async (format) => {
    if (!engineRef.current || !hasTerrain) {
      showNotification('请先生成地形', 'warning');
      return;
    }
    
    try {
      const result = await engineRef.current.exportHeightmap(format);
      if (result.success) {
        if (result.path) {
          showNotification(`高度图导出成功: ${result.path} (${format.toUpperCase()} 格式)`);
        } else {
          showNotification(`高度图导出成功 (${format.toUpperCase()} 格式)`);
        }
      }
    } catch (error) {
      if (error.message !== '用户取消了导出') {
        showNotification('导出失败: ' + error.message, 'error');
      }
    }
  }, [hasTerrain, showNotification]);
  
  const saveConfig = useCallback(async () => {
    if (!engineRef.current) return;
    
    try {
      const result = await engineRef.current.saveConfig();
      if (result.success) {
        showNotification('配置保存成功！');
      }
    } catch (error) {
      showNotification('保存失败: ' + error.message, 'error');
    }
  }, [showNotification]);
  
  const loadConfig = useCallback(async () => {
    if (!engineRef.current) return;
    
    try {
      const result = await engineRef.current.loadConfig();
      if (result.success) {
        setConfig(engineRef.current.getConfig());
        showNotification('配置加载成功！点击"生成地形"应用新配置。');
      }
    } catch (error) {
      showNotification('加载失败: ' + error.message, 'error');
    }
  }, [showNotification]);
  
  const handleRenderModeChange = useCallback((mode) => {
    setRenderMode(mode);
    if (engineRef.current) {
      engineRef.current.setRenderMode(mode);
    }
  }, []);
  
  const handleMouseDown = useCallback((e) => {
    if (!engineRef.current || !hasTerrain || e.button !== 0) return;
    
    const terrainPoint = engineRef.current.screenToTerrain(e.clientX, e.clientY);
    if (terrainPoint) {
      engineRef.current.applyBrush(terrainPoint.x, terrainPoint.z, true);
      setIsBrushActive(true);
    }
  }, [hasTerrain]);
  
  const handleMouseMove = useCallback((e) => {
    if (!engineRef.current || !hasTerrain) return;
    
    const terrainPoint = engineRef.current.screenToTerrain(e.clientX, e.clientY);
    
    if (terrainPoint) {
      if (isBrushActive) {
        engineRef.current.applyBrush(terrainPoint.x, terrainPoint.z, false);
      } else {
        engineRef.current.updateBrushIndicator(terrainPoint.x, terrainPoint.z, true);
      }
    } else {
      engineRef.current.hideBrushIndicator();
    }
  }, [hasTerrain, isBrushActive]);
  
  const handleMouseUp = useCallback(() => {
    if (!engineRef.current) return;
    
    if (isBrushActive) {
      engineRef.current.endBrush();
      setIsBrushActive(false);
    }
  }, [isBrushActive]);
  
  const handleMouseLeave = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.hideBrushIndicator();
    if (isBrushActive) {
      engineRef.current.endBrush();
      setIsBrushActive(false);
    }
  }, [isBrushActive]);
  
  const testLLMConnection = useCallback(async () => {
    if (!engineRef.current) return;
    
    try {
      const result = await engineRef.current.testLLMConnection();
      if (result.success) {
        setLlmStatus('已连接');
        showNotification(`连接成功！模型: ${result.model}`);
      } else {
        setLlmStatus('连接失败');
        showNotification('连接失败: ' + result.error, 'error');
      }
    } catch (error) {
      setLlmStatus('连接失败');
      showNotification('连接失败: ' + error.message, 'error');
    }
  }, [showNotification]);
  
  const getLLMSuggestions = useCallback(async () => {
    if (!engineRef.current || !config) return;
    
    try {
      const result = await engineRef.current.getLLMSuggestions();
      if (result.success) {
        setLlmSuggestion(result.content);
      } else {
        showNotification('获取建议失败: ' + result.error, 'error');
      }
    } catch (error) {
      showNotification('获取建议失败: ' + error.message, 'error');
    }
  }, [config, showNotification]);
  
  const formatNumber = (num, decimals = 2) => {
    return Number(num).toFixed(decimals);
  };
  
  const brushTypeNames = {
    [BrushType.RAISE]: '抬升',
    [BrushType.LOWER]: '下压',
    [BrushType.SMOOTH]: '平滑',
    [BrushType.PINCH]: '收缩',
    [BrushType.SCULPT]: '雕刻',
    [BrushType.FLATTEN]: '平坦'
  };
  
  const brushTypeIcons = {
    [BrushType.RAISE]: '🔺',
    [BrushType.LOWER]: '🔻',
    [BrushType.SMOOTH]: '🔵',
    [BrushType.PINCH]: '📍',
    [BrushType.SCULPT]: '✏️',
    [BrushType.FLATTEN]: '⬜'
  };
  
  const noiseTypeNames = {
    [NoiseType.PERLIN]: 'Perlin',
    [NoiseType.SIMPLEX]: 'Simplex'
  };
  
  const biomeInfo = {
    [BiomeType.OCEAN]: { name: '海洋', icon: '🌊', color: '#1a5276' },
    [BiomeType.BEACH]: { name: '海滩', icon: '🏖️', color: '#f4d03f' },
    [BiomeType.DESERT]: { name: '沙漠', icon: '🏜️', color: '#f5cba7' },
    [BiomeType.SAVANNA]: { name: '稀树草原', icon: '🦒', color: '#d4ac0d' },
    [BiomeType.GRASSLAND]: { name: '草原', icon: '🌾', color: '#7dcea0' },
    [BiomeType.FOREST]: { name: '森林', icon: '🌲', color: '#27ae60' },
    [BiomeType.SWAMP]: { name: '沼泽', icon: '🐊', color: '#1e8449' },
    [BiomeType.ROCKY]: { name: '岩石', icon: '🪨', color: '#808080' },
    [BiomeType.SNOW]: { name: '雪地', icon: '❄️', color: '#ecf0f1' },
    [BiomeType.TUNDRA]: { name: '苔原', icon: '🏔️', color: '#aed6f1' },
    [BiomeType.VOLCANIC]: { name: '火山', icon: '🌋', color: '#e74c3c' }
  };
  
  const pathTypeNames = {
    [PathType.AUTOMATIC]: '自动（特征点）',
    [PathType.CIRCULAR]: '环形',
    [PathType.SPIRAL]: '螺旋',
    [PathType.ORBIT]: '环绕'
  };
  
  const lightPresetInfo = {
    [TimePreset.SUNRISE]: { name: '日出', icon: '🌅' },
    [TimePreset.NOON]: { name: '正午', icon: '☀️' },
    [TimePreset.SUNSET]: { name: '日落', icon: '🌇' },
    [TimePreset.NIGHT]: { name: '星空', icon: '🌙' }
  };
  
  // ============ AI 地形生成处理函数 ============
  const sendAssistantMessage = useCallback(async () => {
    if (!engineRef.current || !assistantInput.trim() || isAssistantThinking) return;
    
    const userMessage = assistantInput.trim();
    setAssistantInput('');
    setIsAssistantThinking(true);
    
    setAssistantMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    }]);
    
    try {
      const result = await engineRef.current.sendAssistantMessage(userMessage);
      
      setAssistantMessages(prev => [...prev, {
        role: 'assistant',
        content: result.content,
        action: result.action,
        terrainParams: result.terrainParams,
        modifications: result.modifications,
        timestamp: Date.now()
      }]);
      
      if (result.action === 'generate' && result.terrainParams) {
        engineRef.current.applyAssistantParams(result.terrainParams);
        setTimeout(() => {
          if (engineRef.current) {
            engineRef.current.generateTerrain();
            setHasTerrain(true);
            setVegetationCount(0);
            showNotification('AI 生成的地形已应用！');
          }
        }, 100);
      } else if (result.action === 'modify' && result.modifications) {
        showNotification('AI 建议的修改：' + result.modifications.map(m => m.description).join(', '));
      }
      
    } catch (error) {
      setAssistantMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，处理您的请求时出错：' + error.message,
        timestamp: Date.now()
      }]);
    } finally {
      setIsAssistantThinking(false);
    }
  }, [assistantInput, isAssistantThinking, showNotification]);
  
  const clearAssistantHistory = useCallback(() => {
    setAssistantMessages([]);
    if (engineRef.current) {
      engineRef.current.clearAssistantHistory();
    }
  }, []);
  
  // ============ 群系画布处理函数 ============
  const updateBiomeBrush = useCallback(() => {
    if (!engineRef.current) return;
    
    const biomeSystem = engineRef.current.getBiomeSystem();
    if (biomeSystem) {
      biomeSystem.setBrushConfig({
        biomeType: selectedBiome,
        radius: biomeBrushRadius,
        strength: biomeBrushStrength,
        blendRadius: biomeBlendRadius,
        blendMode: 'smooth'
      });
    }
  }, [selectedBiome, biomeBrushRadius, biomeBrushStrength, biomeBlendRadius]);
  
  const handleEditModeChange = useCallback((mode) => {
    setCurrentEditMode(mode);
    if (engineRef.current) {
      engineRef.current.setEditMode(mode);
    }
    if (mode === 'biome') {
      updateBiomeBrush();
    }
  }, [updateBiomeBrush]);
  
  const fillTerrainWithBiome = useCallback((biomeType) => {
    if (!engineRef.current) return;
    engineRef.current.fillBiome(biomeType);
    setSelectedBiome(biomeType);
    showNotification(`已填充 ${biomeInfo[biomeType]?.name || biomeType}`);
  }, [showNotification]);
  
  const exportBiomeTexture = useCallback(() => {
    if (!engineRef.current) return;
    
    const result = engineRef.current.exportBiomeTexture();
    if (result) {
      const link = document.createElement('a');
      link.download = 'biome_texture.png';
      link.href = result;
      link.click();
      showNotification('群系贴图已导出！');
    }
  }, [showNotification]);
  
  // ============ 相机路径处理函数 ============
  const generateCameraPath = useCallback((type) => {
    if (!engineRef.current || !hasTerrain) {
      showNotification('请先生成地形', 'warning');
      return;
    }
    
    try {
      const result = engineRef.current.generateCameraPath(type || pathType);
      if (result.success) {
        setPathKeyframeCount(result.keyframeCount);
        showNotification(`路径生成成功！${result.keyframeCount} 个关键帧`);
      } else {
        showNotification('路径生成失败: ' + result.error, 'error');
      }
    } catch (error) {
      showNotification('路径生成失败: ' + error.message, 'error');
    }
  }, [pathType, hasTerrain, showNotification]);
  
  const togglePathPlay = useCallback(() => {
    if (!engineRef.current) return;
    
    if (isPathPlaying) {
      engineRef.current.pausePath();
      setIsPathPlaying(false);
    } else {
      const success = engineRef.current.playPath();
      setIsPathPlaying(success);
      if (!success) {
        showNotification('请先生成相机路径', 'warning');
      }
    }
  }, [isPathPlaying, showNotification]);
  
  const stopCameraPath = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stopPath();
      setIsPathPlaying(false);
      setPathProgress(0);
    }
  }, []);
  
  const exportKeyframes = useCallback(() => {
    if (!engineRef.current) return;
    
    const json = engineRef.current.exportPathKeyframes();
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'camera_path.json';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showNotification('相机关键帧已导出！');
    }
  }, [showNotification]);
  
  // ============ 光照时间轴处理函数 ============
  const applyLightPreset = useCallback((preset) => {
    if (!engineRef.current) return;
    
    engineRef.current.setLightPreset(preset);
    setLightPreset(preset);
    
    const timeline = engineRef.current.getLightTimeline();
    if (timeline) {
      const total = timeline.getTotalDuration();
      let time = 0;
      switch (preset) {
        case TimePreset.SUNRISE: time = total * 0.15; break;
        case TimePreset.NOON: time = total * 0.25; break;
        case TimePreset.SUNSET: time = total * 0.85; break;
        case TimePreset.NIGHT: time = total * 0.5; break;
      }
      setTimelineProgress(time / total);
    }
  }, []);
  
  const toggleTimelinePlay = useCallback(() => {
    if (!engineRef.current) return;
    
    if (isTimelinePlaying) {
      engineRef.current.pauseLightTimeline();
      setIsTimelinePlaying(false);
    } else {
      engineRef.current.setLightTimelineSpeed(timelineSpeed);
      engineRef.current.playLightTimeline();
      setIsTimelinePlaying(true);
    }
  }, [isTimelinePlaying, timelineSpeed]);
  
  const stopLightTimeline = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stopLightTimeline();
      setIsTimelinePlaying(false);
      setTimelineProgress(0.25);
    }
  }, []);
  
  return (
    <div className="app-container">
      {!isEngineReady && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          zIndex: 9999
        }}>
          <div className="loading-spinner"></div>
          <span style={{ marginLeft: 12 }}>初始化中...</span>
        </div>
      )}
      
      <header className="app-header">
        <div className="app-title">
          <span>🏔️</span>
          <span>TerraForge</span>
        </div>
        <div className="menu-bar">
          <div className="menu-item" onClick={saveConfig}>保存配置</div>
          <div className="menu-item" onClick={loadConfig}>加载配置</div>
          <div className="menu-item" onClick={() => exportHeightmap('png')}>导出 PNG</div>
          <div className="menu-item" onClick={() => exportHeightmap('raw')}>导出 RAW</div>
        </div>
      </header>

      <div className="main-content">
        <aside className="left-panel">
          <div className="panel-tabs">
            <div 
              className={`panel-tab ${leftPanelTab === 'noise' ? 'active' : ''}`}
              onClick={() => setLeftPanelTab('noise')}
            >
              噪声设置
            </div>
            <div 
              className={`panel-tab ${leftPanelTab === 'brush' ? 'active' : ''}`}
              onClick={() => setLeftPanelTab('brush')}
            >
              笔刷编辑
            </div>
            <div 
              className={`panel-tab ${leftPanelTab === 'biome' ? 'active' : ''}`}
              onClick={() => setLeftPanelTab('biome')}
            >
              群系画布
            </div>
            <div 
              className={`panel-tab ${leftPanelTab === 'camera' ? 'active' : ''}`}
              onClick={() => setLeftPanelTab('camera')}
            >
              相机路径
            </div>
          </div>

          <div className="panel-content">
            {leftPanelTab === 'noise' && (
              <div>
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">全局设置</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">网格尺寸</label>
                    <div className="form-row">
                      <select 
                        className="form-select"
                        value={config.gridWidth}
                        onChange={(e) => updateConfig({ gridWidth: Number(e.target.value), gridHeight: Number(e.target.value) })}
                      >
                        <option value={64}>64 x 64</option>
                        <option value={128}>128 x 128</option>
                        <option value={256}>256 x 256</option>
                        <option value={512}>512 x 512</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">随机种子</label>
                    <div className="form-row">
                      <input 
                        type="number" 
                        className="form-input"
                        value={config.seed}
                        onChange={(e) => updateConfig({ seed: Number(e.target.value) })}
                      />
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={() => updateConfig({ seed: Math.floor(Math.random() * 1000000) })}
                      >
                        随机
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">地形缩放</label>
                    <div className="slider-container">
                      <input 
                        type="range" 
                        className="slider"
                        min={50}
                        max={200}
                        value={config.terrainScale}
                        onChange={(e) => updateConfig({ terrainScale: Number(e.target.value) })}
                      />
                      <span className="slider-value">{config.terrainScale}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">高度缩放</label>
                    <div className="slider-container">
                      <input 
                        type="range" 
                        className="slider"
                        min={10}
                        max={100}
                        value={config.heightScale}
                        onChange={(e) => updateConfig({ heightScale: Number(e.target.value) })}
                      />
                      <span className="slider-value">{config.heightScale}</span>
                    </div>
                  </div>
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">噪声层</span>
                    <button className="btn btn-secondary btn-small" onClick={addNoiseLayer}>
                      + 添加层
                    </button>
                  </div>

                  {config.noiseLayers.map((layer, index) => (
                    <div key={index} className="noise-layer-card">
                      <div className="noise-layer-header">
                        <div className="noise-layer-title">
                          <div 
                            className={`section-toggle ${layer.enabled ? 'active' : ''}`}
                            onClick={() => updateNoiseLayer(index, { enabled: !layer.enabled })}
                          ></div>
                          <span>层 {index + 1} ({noiseTypeNames[layer.type]})</span>
                        </div>
                        <div className="noise-layer-actions">
                          {config.noiseLayers.length > 1 && (
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => removeNoiseLayer(index)}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                      {layer.enabled && (
                        <div className="noise-layer-content">
                          <div className="form-group">
                            <label className="form-label">噪声类型</label>
                            <select 
                              className="form-select"
                              value={layer.type}
                              onChange={(e) => updateNoiseLayer(index, { type: e.target.value })}
                            >
                              <option value={NoiseType.SIMPLEX}>Simplex 噪声</option>
                              <option value={NoiseType.PERLIN}>Perlin 噪声</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">频率: {formatNumber(layer.frequency)}</label>
                            <div className="slider-container">
                              <input 
                                type="range" 
                                className="slider"
                                min={0.1}
                                max={20}
                                step={0.1}
                                value={layer.frequency}
                                onChange={(e) => updateNoiseLayer(index, { frequency: Number(e.target.value) })}
                              />
                              <span className="slider-value">{formatNumber(layer.frequency)}</span>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">振幅: {formatNumber(layer.amplitude)}</label>
                            <div className="slider-container">
                              <input 
                                type="range" 
                                className="slider"
                                min={0.1}
                                max={2}
                                step={0.1}
                                value={layer.amplitude}
                                onChange={(e) => updateNoiseLayer(index, { amplitude: Number(e.target.value) })}
                              />
                              <span className="slider-value">{formatNumber(layer.amplitude)}</span>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">八度: {layer.octaves}</label>
                            <div className="slider-container">
                              <input 
                                type="range" 
                                className="slider"
                                min={1}
                                max={8}
                                step={1}
                                value={layer.octaves}
                                onChange={(e) => updateNoiseLayer(index, { octaves: Number(e.target.value) })}
                              />
                              <span className="slider-value">{layer.octaves}</span>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">持续度 (Persistence): {formatNumber(layer.persistence)}</label>
                            <div className="slider-container">
                              <input 
                                type="range" 
                                className="slider"
                                min={0.1}
                                max={1}
                                step={0.05}
                                value={layer.persistence}
                                onChange={(e) => updateNoiseLayer(index, { persistence: Number(e.target.value) })}
                              />
                              <span className="slider-value">{formatNumber(layer.persistence)}</span>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">层间隙 (Lacunarity): {formatNumber(layer.lacunarity)}</label>
                            <div className="slider-container">
                              <input 
                                type="range" 
                                className="slider"
                                min={1}
                                max={4}
                                step={0.1}
                                value={layer.lacunarity}
                                onChange={(e) => updateNoiseLayer(index, { lacunarity: Number(e.target.value) })}
                              />
                              <span className="slider-value">{formatNumber(layer.lacunarity)}</span>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">叠加权重: {formatNumber(layer.weight)}</label>
                            <div className="slider-container">
                              <input 
                                type="range" 
                                className="slider"
                                min={0}
                                max={2}
                                step={0.1}
                                value={layer.weight}
                                onChange={(e) => updateNoiseLayer(index, { weight: Number(e.target.value) })}
                              />
                              <span className="slider-value">{formatNumber(layer.weight)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button 
                  className="btn btn-primary btn-full generate-btn"
                  onClick={generateTerrain}
                  disabled={isGenerating}
                >
                  {isGenerating ? '生成中...' : '🔄 生成地形'}
                </button>
              </div>
            )}

            {leftPanelTab === 'brush' && (
              <div>
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">笔刷类型</span>
                  </div>
                  <div className="brush-selector">
                    {Object.entries(brushTypeNames).map(([type, name]) => (
                      <div
                        key={type}
                        className={`brush-btn ${config.brushConfig.type === type ? 'active' : ''}`}
                        onClick={() => updateConfig({ 
                          brushConfig: { ...config.brushConfig, type } 
                        })}
                      >
                        <span className="brush-icon">{brushTypeIcons[type]}</span>
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">笔刷参数</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">笔刷半径: {config.brushConfig.radius}</label>
                    <div className="slider-container">
                      <input 
                        type="range" 
                        className="slider"
                        min={1}
                        max={30}
                        step={1}
                        value={config.brushConfig.radius}
                        onChange={(e) => updateConfig({ 
                          brushConfig: { ...config.brushConfig, radius: Number(e.target.value) } 
                        })}
                      />
                      <span className="slider-value">{config.brushConfig.radius}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">笔刷强度: {formatNumber(config.brushConfig.strength)}</label>
                    <div className="slider-container">
                      <input 
                        type="range" 
                        className="slider"
                        min={0.1}
                        max={2}
                        step={0.1}
                        value={config.brushConfig.strength}
                        onChange={(e) => updateConfig({ 
                          brushConfig: { ...config.brushConfig, strength: Number(e.target.value) } 
                        })}
                      />
                      <span className="slider-value">{formatNumber(config.brushConfig.strength)}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">衰减类型</label>
                    <select 
                      className="form-select"
                      value={config.brushConfig.falloff}
                      onChange={(e) => updateConfig({ 
                        brushConfig: { ...config.brushConfig, falloff: e.target.value } 
                      })}
                    >
                      <option value={FalloffType.NONE}>无衰减</option>
                      <option value={FalloffType.LINEAR}>线性衰减</option>
                      <option value={FalloffType.QUADRATIC}>二次衰减</option>
                      <option value={FalloffType.SMOOTH}>平滑衰减</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">衰减起始: {formatNumber(config.brushConfig.falloffStart)}</label>
                    <div className="slider-container">
                      <input 
                        type="range" 
                        className="slider"
                        min={0}
                        max={1}
                        step={0.1}
                        value={config.brushConfig.falloffStart}
                        onChange={(e) => updateConfig({ 
                          brushConfig: { ...config.brushConfig, falloffStart: Number(e.target.value) } 
                        })}
                      />
                      <span className="slider-value">{formatNumber(config.brushConfig.falloffStart)}</span>
                    </div>
                  </div>
                </div>

                <div className="help-text">
                  💡 提示：在地形上点击并拖动来使用笔刷编辑。
                  {!hasTerrain && <span style={{ color: 'var(--accent-warning)' }}> 请先生成地形。</span>}
                </div>
              </div>
            )}

            {leftPanelTab === 'erosion' && (
              <div>
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">水面设置</span>
                    <div 
                      className={`section-toggle ${config.waterEnabled ? 'active' : ''}`}
                      onClick={() => updateConfig({ waterEnabled: !config.waterEnabled })}
                    ></div>
                  </div>
                  {config.waterEnabled && (
                    <div className="form-group">
                      <label className="form-label">水面高度: {formatNumber(config.waterLevel)}</label>
                      <div className="slider-container">
                        <input 
                          type="range" 
                          className="slider"
                          min={0}
                          max={1}
                          step={0.01}
                          value={config.waterLevel}
                          onChange={(e) => updateConfig({ waterLevel: Number(e.target.value) })}
                        />
                        <span className="slider-value">{formatNumber(config.waterLevel)}</span>
                      </div>
                      <div className="help-text">
                        调节滑块改变水面高度，低于此高度的区域将被水覆盖。
                      </div>
                    </div>
                  )}
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">水力侵蚀</span>
                    <div 
                      className={`section-toggle ${config.hydraulicEnabled ? 'active' : ''}`}
                      onClick={() => updateConfig({ hydraulicEnabled: !config.hydraulicEnabled })}
                    ></div>
                  </div>
                  {config.hydraulicEnabled && (
                    <>
                      <div className="form-group">
                        <label className="form-label">水滴数量: {config.hydraulicParams.numDroplets || 50000}</label>
                        <div className="slider-container">
                          <input 
                            type="range" 
                            className="slider"
                            min={10000}
                            max={200000}
                            step={10000}
                            value={config.hydraulicParams.numDroplets || 50000}
                            onChange={(e) => updateConfig({ 
                              hydraulicParams: { 
                                ...config.hydraulicParams, 
                                numDroplets: Number(e.target.value) 
                              } 
                            })}
                          />
                          <span className="slider-value">{config.hydraulicParams.numDroplets || 50000}</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">侵蚀速率: {formatNumber(config.hydraulicParams.erosionRate)}</label>
                        <div className="slider-container">
                          <input 
                            type="range" 
                            className="slider"
                            min={0.1}
                            max={1}
                            step={0.05}
                            value={config.hydraulicParams.erosionRate}
                            onChange={(e) => updateConfig({ 
                              hydraulicParams: { 
                                ...config.hydraulicParams, 
                                erosionRate: Number(e.target.value) 
                              } 
                            })}
                          />
                          <span className="slider-value">{formatNumber(config.hydraulicParams.erosionRate)}</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">沉积速率: {formatNumber(config.hydraulicParams.depositRate)}</label>
                        <div className="slider-container">
                          <input 
                            type="range" 
                            className="slider"
                            min={0.1}
                            max={1}
                            step={0.05}
                            value={config.hydraulicParams.depositRate}
                            onChange={(e) => updateConfig({ 
                              hydraulicParams: { 
                                ...config.hydraulicParams, 
                                depositRate: Number(e.target.value) 
                              } 
                            })}
                          />
                          <span className="slider-value">{formatNumber(config.hydraulicParams.depositRate)}</span>
                        </div>
                      </div>
                    </>
                  )}
                  <button 
                    className="btn btn-secondary btn-full"
                    onClick={applyHydraulicErosion}
                    disabled={!hasTerrain}
                  >
                    💧 应用水力侵蚀
                  </button>
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">热力侵蚀 (风化)</span>
                    <div 
                      className={`section-toggle ${config.thermalEnabled ? 'active' : ''}`}
                      onClick={() => updateConfig({ thermalEnabled: !config.thermalEnabled })}
                    ></div>
                  </div>
                  {config.thermalEnabled && (
                    <>
                      <div className="form-group">
                        <label className="form-label">休止角 (度): {config.thermalParams.angleOfRepose}</label>
                        <div className="slider-container">
                          <input 
                            type="range" 
                            className="slider"
                            min={15}
                            max={60}
                            step={1}
                            value={config.thermalParams.angleOfRepose}
                            onChange={(e) => updateConfig({ 
                              thermalParams: { 
                                ...config.thermalParams, 
                                angleOfRepose: Number(e.target.value) 
                              } 
                            })}
                          />
                          <span className="slider-value">{config.thermalParams.angleOfRepose}°</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">迭代次数: {config.thermalParams.iterations}</label>
                        <div className="slider-container">
                          <input 
                            type="range" 
                            className="slider"
                            min={1}
                            max={30}
                            step={1}
                            value={config.thermalParams.iterations}
                            onChange={(e) => updateConfig({ 
                              thermalParams: { 
                                ...config.thermalParams, 
                                iterations: Number(e.target.value) 
                              } 
                            })}
                          />
                          <span className="slider-value">{config.thermalParams.iterations}</span>
                        </div>
                      </div>
                    </>
                  )}
                  <button 
                    className="btn btn-secondary btn-full"
                    onClick={applyThermalErosion}
                    disabled={!hasTerrain}
                  >
                    🌋 应用热力侵蚀
                  </button>
                </div>

                <div className="help-text">
                  💡 提示：侵蚀效果可以让地形看起来更自然。
                  水力侵蚀模拟雨水冲刷，热力侵蚀模拟风化和滑坡。
                </div>
              </div>
            )}
            
            {leftPanelTab === 'biome' && (
              <div>
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">编辑模式</span>
                  </div>
                  <div className="mode-selector">
                    <div
                      className={`mode-btn ${currentEditMode === 'height' ? 'active' : ''}`}
                      onClick={() => handleEditModeChange('height')}
                    >
                      <span>🔺</span>
                      <span>高度编辑</span>
                    </div>
                    <div
                      className={`mode-btn ${currentEditMode === 'biome' ? 'active' : ''}`}
                      onClick={() => handleEditModeChange('biome')}
                    >
                      <span>🎨</span>
                      <span>群系绘画</span>
                    </div>
                  </div>
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">群系选择</span>
                  </div>
                  <div className="biome-grid">
                    {Object.entries(biomeInfo).map(([type, info]) => (
                      <div
                        key={type}
                        className={`biome-btn ${selectedBiome === type ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedBiome(type);
                          updateBiomeBrush();
                        }}
                        title={info.name}
                      >
                        <span className="biome-icon">{info.icon}</span>
                        <span className="biome-name">{info.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="divider"></div>

                {currentEditMode === 'biome' && (
                  <>
                    <div className="section">
                      <div className="section-header">
                        <span className="section-title">笔刷参数</span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">笔刷半径: {biomeBrushRadius}</label>
                        <div className="slider-container">
                          <input
                            type="range"
                            className="slider"
                            min={1}
                            max={50}
                            step={1}
                            value={biomeBrushRadius}
                            onChange={(e) => {
                              setBiomeBrushRadius(Number(e.target.value));
                              updateBiomeBrush();
                            }}
                          />
                          <span className="slider-value">{biomeBrushRadius}</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">笔刷强度: {formatNumber(biomeBrushStrength)}</label>
                        <div className="slider-container">
                          <input
                            type="range"
                            className="slider"
                            min={0.1}
                            max={1}
                            step={0.05}
                            value={biomeBrushStrength}
                            onChange={(e) => {
                              setBiomeBrushStrength(Number(e.target.value));
                              updateBiomeBrush();
                            }}
                          />
                          <span className="slider-value">{formatNumber(biomeBrushStrength)}</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">渐变半径: {biomeBlendRadius}</label>
                        <div className="slider-container">
                          <input
                            type="range"
                            className="slider"
                            min={0}
                            max={20}
                            step={1}
                            value={biomeBlendRadius}
                            onChange={(e) => {
                              setBiomeBlendRadius(Number(e.target.value));
                              updateBiomeBrush();
                            }}
                          />
                          <span className="slider-value">{biomeBlendRadius}</span>
                        </div>
                      </div>
                    </div>

                    <div className="divider"></div>
                  </>
                )}

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">快捷操作</span>
                  </div>
                  <div className="btn-group">
                    <button
                      className="btn btn-secondary"
                      onClick={() => fillTerrainWithBiome(selectedBiome)}
                      disabled={!hasTerrain}
                    >
                      🪣 填充地形
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={exportBiomeTexture}
                      disabled={!hasTerrain}
                    >
                      🖼️ 导出贴图
                    </button>
                  </div>
                </div>

                <div className="help-text">
                  💡 提示：选择"群系绘画"模式后，可以在地形上点击拖动来绘制群系。渐变半径控制群系之间的过渡平滑度。
                </div>
              </div>
            )}
            
            {leftPanelTab === 'camera' && (
              <div>
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">路径类型</span>
                  </div>
                  <div className="path-type-grid">
                    {Object.entries(pathTypeNames).map(([type, name]) => (
                      <div
                        key={type}
                        className={`path-type-btn ${pathType === type ? 'active' : ''}`}
                        onClick={() => setPathType(type)}
                      >
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    className="btn btn-primary btn-full"
                    onClick={() => generateCameraPath(pathType)}
                    disabled={!hasTerrain}
                    style={{ marginTop: 16 }}
                  >
                    🚀 生成路径
                  </button>
                  
                  {pathKeyframeCount > 0 && (
                    <div className="info-box" style={{ marginTop: 12 }}>
                      已生成 {pathKeyframeCount} 个关键帧
                    </div>
                  )}
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">播放控制</span>
                  </div>
                  <div className="playback-controls">
                    <button
                      className={`play-btn ${isPathPlaying ? 'playing' : ''}`}
                      onClick={togglePathPlay}
                      disabled={pathKeyframeCount === 0}
                    >
                      {isPathPlaying ? '⏸️' : '▶️'}
                    </button>
                    <button
                      className="play-btn"
                      onClick={stopCameraPath}
                      disabled={pathKeyframeCount === 0}
                    >
                      ⏹️
                    </button>
                  </div>
                  
                  {pathKeyframeCount > 0 && (
                    <div className="form-group" style={{ marginTop: 12 }}>
                      <label className="form-label">进度</label>
                      <div className="slider-container">
                        <input
                          type="range"
                          className="slider"
                          min={0}
                          max={100}
                          value={pathProgress * 100}
                          onChange={(e) => {
                            const progress = Number(e.target.value) / 100;
                            setPathProgress(progress);
                            if (engineRef.current) {
                              engineRef.current.seekPath(progress * engineRef.current.getCurrentPath()?.getTotalDuration() || 0);
                            }
                          }}
                        />
                        <span className="slider-value">{Math.round(pathProgress * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">导出选项</span>
                  </div>
                  <div className="btn-group">
                    <button
                      className="btn btn-secondary"
                      onClick={exportKeyframes}
                      disabled={pathKeyframeCount === 0}
                    >
                      📋 导出 JSON
                    </button>
                  </div>
                </div>

                <div className="help-text">
                  💡 提示：选择路径类型后点击"生成路径"，系统会根据地形特征自动规划飞行路线。"自动（特征点）"模式会检测山峰、山谷等特征点来生成路径。
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="center-view">
          <div 
            ref={viewportRef} 
            className="viewport-container"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
          
          <div className="view-toolbar">
            <button 
              className={`view-mode-btn ${renderMode === RenderMode.SOLID ? 'active' : ''}`}
              onClick={() => handleRenderModeChange(RenderMode.SOLID)}
            >
              实体
            </button>
            <button 
              className={`view-mode-btn ${renderMode === RenderMode.WIREFRAME ? 'active' : ''}`}
              onClick={() => handleRenderModeChange(RenderMode.WIREFRAME)}
            >
              线框
            </button>
            <button 
              className={`view-mode-btn ${renderMode === RenderMode.NORMALS ? 'active' : ''}`}
              onClick={() => handleRenderModeChange(RenderMode.NORMALS)}
            >
              法线
            </button>
            <button 
              className={`view-mode-btn ${renderMode === RenderMode.HEATMAP ? 'active' : ''}`}
              onClick={() => handleRenderModeChange(RenderMode.HEATMAP)}
            >
              高度图
            </button>
          </div>

          <div className="status-bar">
            <span className="status-item">
              <span className="status-dot"></span>
              {hasTerrain ? '地形已生成' : '等待生成'}
            </span>
            {hasTerrain && (
              <>
                <span className="status-item">
                  分辨率: {config.gridWidth}x{config.gridHeight}
                </span>
                <span className="status-item">
                  植被: {vegetationCount} 个
                </span>
              </>
            )}
            {isBrushActive && (
              <span className="status-item" style={{ color: 'var(--accent-warning)' }}>
                笔刷: {brushTypeNames[config.brushConfig.type]} 活动中
              </span>
            )}
          </div>
        </main>

        <aside className="right-panel">
          <div className="panel-tabs">
            <div 
              className={`panel-tab ${rightPanelTab === 'lighting' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('lighting')}
            >
              光照
            </div>
            <div 
              className={`panel-tab ${rightPanelTab === 'vegetation' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('vegetation')}
            >
              植被
            </div>
            <div 
              className={`panel-tab ${rightPanelTab === 'export' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('export')}
            >
              导出
            </div>
            <div 
              className={`panel-tab ${rightPanelTab === 'llm' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('llm')}
            >
              AI 助手
            </div>
          </div>

          <div className="panel-content">
            {rightPanelTab === 'lighting' && (
              <div>
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">光照预设</span>
                  </div>
                  <div className="lighting-presets">
                    {Object.entries(lightPresetInfo).map(([preset, info]) => (
                      <div
                        key={preset}
                        className={`lighting-preset-btn ${lightPreset === preset ? 'active' : ''}`}
                        onClick={() => applyLightPreset(preset)}
                      >
                        <span className="lighting-icon">{info.icon}</span>
                        <span className="lighting-name">{info.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">时间轴控制</span>
                  </div>
                  <div className="timeline-controls">
                    <button
                      className={`play-btn ${isTimelinePlaying ? 'playing' : ''}`}
                      onClick={toggleTimelinePlay}
                    >
                      {isTimelinePlaying ? '⏸️' : '▶️'}
                    </button>
                    <button
                      className="play-btn"
                      onClick={stopLightTimeline}
                    >
                      ⏹️
                    </button>
                  </div>
                  
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label">时间进度</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={100}
                        value={timelineProgress * 100}
                        onChange={(e) => {
                          const progress = Number(e.target.value) / 100;
                          setTimelineProgress(progress);
                          if (engineRef.current) {
                            const timeline = engineRef.current.getLightTimeline();
                            if (timeline) {
                              engineRef.current.seekLightTimeline(progress * timeline.getTotalDuration());
                            }
                          }
                        }}
                      />
                      <span className="slider-value">{Math.round(timelineProgress * 100)}%</span>
                    </div>
                    <div className="help-text">
                      {timelineProgress < 0.2 && '🌅 日出时分'}
                      {timelineProgress >= 0.2 && timelineProgress < 0.35 && '☀️ 上午'}
                      {timelineProgress >= 0.35 && timelineProgress < 0.6 && '🌤️ 正午'}
                      {timelineProgress >= 0.6 && timelineProgress < 0.85 && '🌇 傍晚'}
                      {timelineProgress >= 0.85 && '🌙 夜晚'}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">播放速度: {formatNumber(timelineSpeed)}x</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        className="slider"
                        min={0.1}
                        max={5}
                        step={0.1}
                        value={timelineSpeed}
                        onChange={(e) => {
                          const speed = Number(e.target.value);
                          setTimelineSpeed(speed);
                          if (engineRef.current) {
                            engineRef.current.setLightTimelineSpeed(speed);
                          }
                        }}
                      />
                      <span className="slider-value">{formatNumber(timelineSpeed)}</span>
                    </div>
                  </div>
                </div>

                <div className="help-text">
                  💡 提示：点击光照预设快速切换环境氛围，或使用时间轴播放日夜循环动画。时间轴会自动调整太阳位置、天空颜色和光照强度。
                </div>
              </div>
            )}
            
            {rightPanelTab === 'vegetation' && (
              <div>
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">植被系统</span>
                    <div 
                      className={`section-toggle ${config.vegetationEnabled ? 'active' : ''}`}
                      onClick={() => updateConfig({ vegetationEnabled: !config.vegetationEnabled })}
                    ></div>
                  </div>
                  
                  {config.vegetationEnabled && (
                    <>
                      <div className="help-text" style={{ marginBottom: 12 }}>
                        配置植被类型和分布规则，然后点击生成。
                      </div>

                      {config.vegetationConfigs.map((veg, index) => (
                        <div key={index} className="vegetation-item">
                          <div className="vegetation-info">
                            <div className="vegetation-icon">
                              {veg.type === 'grass' && '🌿'}
                              {veg.type === 'bush' && '🌳'}
                              {veg.type === 'tree_low' && '🌲'}
                              {veg.type === 'tree_medium' && '🌲'}
                              {veg.type === 'tree_high' && '🌲'}
                            </div>
                            <div className="vegetation-details">
                              <span className="vegetation-name">
                                {veg.type === 'grass' && '草丛'}
                                {veg.type === 'bush' && '灌木'}
                                {veg.type === 'tree_low' && '低树'}
                                {veg.type === 'tree_medium' && '中树'}
                                {veg.type === 'tree_high' && '高树'}
                              </span>
                              <span className="vegetation-count">
                                密度: {formatNumber(veg.density)} | 坡度: {veg.minSlope}°-{veg.maxSlope}°
                              </span>
                            </div>
                          </div>
                          <div 
                            className={`section-toggle ${veg.enabled ? 'active' : ''}`}
                            onClick={() => {
                              const newVegs = [...config.vegetationConfigs];
                              newVegs[index] = { ...veg, enabled: !veg.enabled };
                              updateConfig({ vegetationConfigs: newVegs });
                            }}
                          ></div>
                        </div>
                      ))}
                    </>
                  )}

                  <button 
                    className="btn btn-success btn-full"
                    onClick={generateVegetation}
                    disabled={!hasTerrain || !config.vegetationEnabled}
                    style={{ marginTop: 16 }}
                  >
                    🌿 生成植被
                  </button>
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">分布规则说明</span>
                  </div>
                  <div className="help-text">
                    <p style={{ marginBottom: 8 }}><strong>高度范围：</strong>植被只在指定高度范围内生成</p>
                    <p style={{ marginBottom: 8 }}><strong>坡度限制：</strong>植被只在坡度较缓的区域生成</p>
                    <p><strong>水下排除：</strong>植被不会在水面以下生成</p>
                  </div>
                </div>
              </div>
            )}

            {rightPanelTab === 'export' && (
              <div>
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">导出格式</span>
                  </div>
                  
                  <div className="export-options">
                    <div 
                      className="export-format-card"
                      onClick={() => exportHeightmap('png')}
                    >
                      <div className="export-format-icon">🖼️</div>
                      <div className="export-format-name">PNG</div>
                      <div className="export-format-desc">16位灰度图像<br/>兼容 Unity/Unreal</div>
                    </div>
                    <div 
                      className="export-format-card"
                      onClick={() => exportHeightmap('raw')}
                    >
                      <div className="export-format-icon">📄</div>
                      <div className="export-format-name">RAW</div>
                      <div className="export-format-desc">原始二进制数据<br/>16位无符号整数</div>
                    </div>
                  </div>
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">导出选项</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">当前分辨率</label>
                    <div className="form-input" style={{ background: 'var(--bg-tertiary)', padding: 8, borderRadius: 4 }}>
                      {config.gridWidth} x {config.gridHeight} 像素
                    </div>
                    <div className="help-text">
                      导出分辨率与当前网格分辨率一致。
                      如需更高分辨率，请在"噪声设置"中调整网格尺寸后重新生成。
                    </div>
                  </div>
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">引擎兼容性</span>
                  </div>
                  <div className="help-text">
                    <p style={{ marginBottom: 8 }}><strong>Unity：</strong>使用 Heightmap Import，选择 PNG 或 RAW 文件</p>
                    <p style={{ marginBottom: 8 }}><strong>Unreal Engine：</strong>在 Landscape 工具中导入高度图</p>
                    <p><strong>提示：</strong>16位灰度值 0 = 最低点，65535 = 最高点</p>
                  </div>
                </div>

                <div className="btn-group" style={{ marginTop: 16 }}>
                  <button 
                    className="btn btn-primary"
                    onClick={() => exportHeightmap('png')}
                    disabled={!hasTerrain}
                  >
                    导出 PNG
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => exportHeightmap('raw')}
                    disabled={!hasTerrain}
                  >
                    导出 RAW
                  </button>
                </div>
              </div>
            )}

            {rightPanelTab === 'llm' && (
              <div className="assistant-panel">
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">LLM 配置</span>
                  </div>
                  <div className="llm-config">
                    <div className="form-group">
                      <label className="form-label">API Base URL</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="例如: https://api.openai.com/v1"
                        value={config.llmConfig.baseUrl}
                        onChange={(e) => updateConfig({ 
                          llmConfig: { ...config.llmConfig, baseUrl: e.target.value } 
                        })}
                      />
                      <div className="help-text">
                        OpenAI 兼容的 API 端点地址
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">API Key</label>
                      <input 
                        type="password" 
                        className="form-input"
                        placeholder="输入您的 API 密钥"
                        value={config.llmConfig.apiKey}
                        onChange={(e) => updateConfig({ 
                          llmConfig: { ...config.llmConfig, apiKey: e.target.value } 
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">模型名称</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="例如: gpt-4, claude-3-opus"
                        value={config.llmConfig.modelName}
                        onChange={(e) => updateConfig({ 
                          llmConfig: { ...config.llmConfig, modelName: e.target.value } 
                        })}
                      />
                    </div>
                    <div className="llm-status-row">
                      <div className={`llm-status ${llmStatus === '已连接' ? 'connected' : 'disconnected'}`}>
                        <span className={`status-dot ${llmStatus !== '已连接' && llmStatus !== '未配置' ? 'warning' : ''}`}></span>
                        状态: {llmStatus}
                      </div>
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={testLLMConnection}
                      >
                        测试连接
                      </button>
                    </div>
                  </div>
                </div>

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">AI 地形生成</span>
                    <button 
                      className="btn btn-secondary btn-small"
                      onClick={clearAssistantHistory}
                    >
                      清空对话
                    </button>
                  </div>
                  
                  <div className="chat-container">
                    <div className="chat-messages" ref={(el) => {
                      if (el) {
                        el.scrollTop = el.scrollHeight;
                      }
                    }}>
                      {assistantMessages.length === 0 ? (
                        <div className="chat-empty">
                          <div className="chat-empty-icon">🤖</div>
                          <div className="chat-empty-title">AI 地形助手</div>
                          <div className="chat-empty-tips">
                            <p>💡 尝试输入以下方式描述：</p>
                            <p>• "创建一个有火山和湖泊的山地地形"</p>
                            <p>• "生成一个适合滑雪场"</p>
                            <p>• "把火山口再深一点"</p>
                            <p>• "增加更多的河流和峡谷"</p>
                          </div>
                        </div>
                      ) : (
                        assistantMessages.map((msg, index) => (
                          <div 
                            key={index}
                            className={`chat-message ${msg.role}`}
                          >
                            <div className="chat-message-role">
                              {msg.role === 'user' ? '👤' : '🤖'}
                            </div>
                            <div className="chat-message-content">
                              <div className="chat-message-text">{msg.content}</div>
                              
                              {msg.role === 'assistant' && msg.terrainParams && (
                                <div className="chat-params-preview">
                                  <div className="chat-params-title">📋 生成参数</div>
                                  <pre className="chat-params-json">
                                    {JSON.stringify(msg.terrainParams, null, 2)}
                                  </pre>
                                </div>
                              )}
                              
                              {msg.role === 'assistant' && msg.modifications && msg.modifications.length > 0 && (
                                <div className="chat-modifications">
                                  <div className="chat-modifications-title">🔧 修改建议</div>
                                  {msg.modifications.map((mod, idx) => (
                                    <div key={idx} className="chat-modification-item">
                                      • {mod.description}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      
                      {isAssistantThinking && (
                        <div className="chat-message assistant">
                          <div className="chat-message-role">🤖</div>
                          <div className="chat-message-content">
                            <div className="chat-typing">
                              <span className="typing-dot"></span>
                              <span className="typing-dot"></span>
                              <span className="typing-dot"></span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="chat-input-area">
                      <input
                        type="text"
                        className="chat-input"
                        placeholder="描述您想要的地形..."
                        value={assistantInput}
                        onChange={(e) => setAssistantInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendAssistantMessage();
                          }
                        }}
                        disabled={isAssistantThinking}
                      />
                      <button
                        className="btn btn-primary chat-send-btn"
                        onClick={sendAssistantMessage}
                        disabled={isAssistantThinking || !assistantInput.trim()}
                      >
                        发送
                      </button>
                    </div>
                  </div>
                </div>

                <div className="help-text">
                  <p><strong>使用提示：</strong></p>
                  <p>• 描述地形外观：山脉、平原、峡谷、火山、高原、盆地等</p>
                  <p>• 描述地形特征：陡峭、平缓、圆润、尖锐等</p>
                  <p>• 多轮对话：先生成地形，再要求"火山口再深一点"等增量修改</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default App;