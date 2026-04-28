import React, { useEffect, useRef, useState, useCallback } from 'react';
import TerrainEngine from './core/terrainEngine';
import { NoiseLayerConfig, NoiseType } from './core/noise';
import { BrushType, FalloffType } from './core/brushes';
import { RenderMode } from './core/terrainRenderer';
import TerrainConfig from './core/terrainConfig';
import './App.css';

const App = () => {
  const viewportRef = useRef(null);
  const engineRef = useRef(null);
  
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
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);
  
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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
  
  const exportHeightmap = useCallback((format) => {
    if (!engineRef.current || !hasTerrain) {
      showNotification('请先生成地形', 'warning');
      return;
    }
    
    try {
      engineRef.current.exportHeightmap(format);
      showNotification(`高度图导出成功 (${format.toUpperCase()} 格式)`);
    } catch (error) {
      showNotification('导出失败: ' + error.message, 'error');
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
              className={`panel-tab ${leftPanelTab === 'erosion' ? 'active' : ''}`}
              onClick={() => setLeftPanelTab('erosion')}
            >
              侵蚀效果
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
              <div>
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">AI 助手配置</span>
                    <div 
                      className={`section-toggle ${config.llmConfig.enabled ? 'active' : ''}`}
                      onClick={() => updateConfig({ 
                        llmConfig: { ...config.llmConfig, enabled: !config.llmConfig.enabled } 
                      })}
                    ></div>
                  </div>

                  {config.llmConfig.enabled && (
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
                      <div className={`llm-status ${llmStatus === '已连接' ? 'connected' : 'disconnected'}`}>
                        <span className={`status-dot ${llmStatus !== '已连接' && llmStatus !== '未配置' ? 'warning' : ''}`}></span>
                        状态: {llmStatus}
                      </div>
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={testLLMConnection}
                        style={{ marginTop: 8 }}
                      >
                        测试连接
                      </button>
                    </div>
                  )}
                </div>

                {config.llmConfig.enabled && config.llmConfig.baseUrl && (
                  <>
                    <div className="divider"></div>

                    <div className="section">
                      <div className="section-header">
                        <span className="section-title">智能建议</span>
                      </div>
                      <button 
                        className="btn btn-secondary btn-full"
                        onClick={getLLMSuggestions}
                      >
                        🤖 获取地形优化建议
                      </button>

                      {llmSuggestion && (
                        <div 
                          style={{ 
                            marginTop: 12, 
                            padding: 12, 
                            background: 'var(--bg-tertiary)', 
                            borderRadius: 6,
                            fontSize: 12,
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {llmSuggestion}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="divider"></div>

                <div className="section">
                  <div className="section-header">
                    <span className="section-title">使用说明</span>
                  </div>
                  <div className="help-text">
                    <p style={{ marginBottom: 8 }}>
                      <strong>配置说明：</strong>
                    </p>
                    <p style={{ marginBottom: 8 }}>
                      - API Base URL: OpenAI 兼容的 API 端点，如 https://api.openai.com/v1
                    </p>
                    <p style={{ marginBottom: 8 }}>
                      - API Key: 您的 API 密钥
                    </p>
                    <p style={{ marginBottom: 8 }}>
                      - 模型名称: 要使用的模型，如 gpt-4, claude-3 等
                    </p>
                    <p>
                      配置完成后点击"测试连接"验证，然后可以获取地形优化建议。
                    </p>
                  </div>
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