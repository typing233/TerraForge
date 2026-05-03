import LLMService, { LLMConfig } from './llmService';

export const ModificationType = {
  REPLACE: 'replace',
  ADD: 'add',
  MULTIPLY: 'multiply',
  LOCAL_AREA: 'local_area',
  HEIGHTMAP_DIRECT: 'heightmap_direct'
};

export class TerrainModification {
  constructor(options = {}) {
    this.type = options.type || ModificationType.REPLACE;
    this.target = options.target || null;
    this.value = options.value || null;
    this.region = options.region || null;
    this.description = options.description || '';
  }
  
  toJSON() {
    return {
      type: this.type,
      target: this.target,
      value: this.value,
      region: this.region,
      description: this.description
    };
  }
  
  static fromJSON(json) {
    return new TerrainModification(json);
  }
}

export class ChatMessage {
  constructor(role, content, timestamp = Date.now()) {
    this.role = role;
    this.content = content;
    this.timestamp = timestamp;
    this.terrainParams = null;
    this.modifications = [];
  }
  
  toJSON() {
    return {
      role: this.role,
      content: this.content,
      timestamp: this.timestamp,
      terrainParams: this.terrainParams,
      modifications: this.modifications.map(m => m.toJSON())
    };
  }
  
  static fromJSON(json) {
    const msg = new ChatMessage(json.role, json.content, json.timestamp);
    msg.terrainParams = json.terrainParams || null;
    msg.modifications = (json.modifications || []).map(m => TerrainModification.fromJSON(m));
    return msg;
  }
}

export class TerrainAssistant {
  constructor(llmService = null) {
    this.llmService = llmService || new LLMService();
    this.conversationHistory = [];
    this.currentTerrainState = null;
    this.maxHistoryLength = 20;
  }
  
  setLLMService(llmService) {
    this.llmService = llmService;
  }
  
  getLLMService() {
    return this.llmService;
  }
  
  setLLMConfig(config) {
    this.llmService.setConfig(config instanceof LLMConfig ? config : new LLMConfig(config));
  }
  
  isReady() {
    return this.llmService.validateConfig().valid;
  }
  
  setTerrainState(state) {
    this.currentTerrainState = state ? { ...state } : null;
  }
  
  getTerrainState() {
    return this.currentTerrainState;
  }
  
  addMessage(role, content) {
    const message = new ChatMessage(role, content);
    this.conversationHistory.push(message);
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
    return message;
  }
  
  clearHistory() {
    this.conversationHistory = [];
  }
  
  getHistory() {
    return [...this.conversationHistory];
  }
  
  buildSystemPrompt() {
    return `你是一个专业的地形设计师助手，专门帮助用户生成和修改游戏地形。

你的核心能力：
1. 将自然语言描述转换为完整的地形参数配置
2. 支持多轮对话，理解上下文进行增量修改
3. 识别区域修改指令（如"这里"、"那里"、"火山口"、"山谷"等）

地形参数说明：
- gridWidth/gridHeight: 网格分辨率 (64, 128, 256, 512)
- terrainScale: 地形整体大小 (默认100)
- heightScale: 高度缩放 (默认50)
- seed: 随机种子 (整数)
- waterLevel: 水面高度 (0.0-1.0)
- waterEnabled: 是否显示水面 (true/false)

噪声层配置 (noiseLayers数组，每个元素包含)：
- type: "simplex" 或 "perlin"
- frequency: 频率 (越高细节越多)
- amplitude: 振幅 (影响高度)
- octaves: 八度 (叠加层数)
- persistence: 持续度 (0.0-1.0)
- lacunarity: 间隙 (默认2.0)
- weight: 层权重 (0.0-2.0)
- enabled: 是否启用

侵蚀配置：
- hydraulicEnabled: 水力侵蚀开关
- thermalEnabled: 热力侵蚀开关

回复格式要求：
对于每个用户请求，你必须返回一个包含以下字段的严格JSON对象（只返回JSON，不要其他文字）：

{
  "response": "自然语言回复，向用户解释你做了什么",
  "action": "generate | modify | query",
  "terrainParams": {
    "gridWidth": 256,
    "gridHeight": 256,
    "terrainScale": 100,
    "heightScale": 50,
    "seed": 12345,
    "waterEnabled": true,
    "waterLevel": 0.3,
    "noiseLayers": [...],
    "hydraulicEnabled": false,
    "thermalEnabled": false
  },
  "modifications": [
    {
      "type": "replace | add | multiply | local_area | heightmap_direct",
      "target": "target_property",
      "value": "new_value",
      "region": {
        "type": "circle | rectangle | height_range | slope_range",
        "centerX": 0.5,
        "centerY": 0.5,
        "radius": 0.2,
        "minHeight": 0.0,
        "maxHeight": 1.0,
        "minSlope": 0,
        "maxSlope": 90
      },
      "description": "修改描述"
    }
  ],
  "requiresBrush": false,
  "brushConfig": {
    "type": "raise | lower | smooth | flatten",
    "radius": 15,
    "strength": 0.8
  }
}

字段说明：
- action: 表示这是什么类型的操作
  - "generate": 生成新地形（需要调用generateTerrain）
  - "modify": 修改现有地形（可能需要应用修改）
  - "query": 只是回答问题，不需要改变地形
- terrainParams: 完整的地形参数配置
- modifications: 增量修改列表（针对局部修改）
- requiresBrush: 是否需要用户使用笔刷来完成修改
- brushConfig: 推荐的笔刷配置

重要规则：
1. 当用户说"生成山脉"、"创建岛屿"等时，使用 action="generate" 并提供完整的 terrainParams
2. 当用户说"把那个山加高"、"这里挖个湖"等时，使用 action="modify" 并提供 modifications
3. 对于局部修改，需要在 modifications 中指定 region 来限定区域
4. 始终考虑上下文，如果之前已经生成了地形，后续请求应该是修改而不是重新生成
5. 保持 response 简洁明了，解释你做了什么修改`;
  }
  
  buildMessagesForLLM(userMessage) {
    const messages = [];
    
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt()
    });
    
    for (const msg of this.conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    messages.push({
      role: 'user',
      content: userMessage
    });
    
    if (this.currentTerrainState) {
      const stateSummary = `
当前地形状态概览：
- 分辨率: ${this.currentTerrainState.gridWidth}x${this.currentTerrainState.gridHeight}
- 噪声层数: ${this.currentTerrainState.noiseLayers?.length || 0}
- 水面: ${this.currentTerrainState.waterEnabled ? '已启用 (' + this.currentTerrainState.waterLevel + ')' : '未启用'}
- 水力侵蚀: ${this.currentTerrainState.hydraulicEnabled ? '已启用' : '未启用'}
- 热力侵蚀: ${this.currentTerrainState.thermalEnabled ? '已启用' : '未启用'}

请基于这个现有状态进行修改。`;
      
      const lastMsg = messages[messages.length - 1];
      lastMsg.content = userMessage + '\n\n' + stateSummary;
    }
    
    return messages;
  }
  
  parseLLMResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { response: content, action: 'query' };
    } catch (error) {
      return { response: content, action: 'query' };
    }
  }
  
  async sendMessage(userMessage) {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'LLM 未配置，请先在设置中配置 API 连接',
        userMessage: userMessage,
        assistantResponse: null
      };
    }
    
    this.addMessage('user', userMessage);
    
    try {
      const messages = this.buildMessagesForLLM(userMessage);
      const response = await this.llmService.chatCompletion(messages, {
        temperature: 0.7,
        maxTokens: 4000
      });
      
      const assistantContent = response.choices?.[0]?.message?.content || '';
      const parsed = this.parseLLMResponse(assistantContent);
      
      const assistantMessage = this.addMessage('assistant', parsed.response || assistantContent);
      assistantMessage.terrainParams = parsed.terrainParams || null;
      assistantMessage.modifications = (parsed.modifications || []).map(m => 
        TerrainModification.fromJSON(m)
      );
      
      return {
        success: true,
        userMessage: userMessage,
        assistantResponse: parsed.response || assistantContent,
        action: parsed.action || 'query',
        terrainParams: parsed.terrainParams || null,
        modifications: parsed.modifications || [],
        requiresBrush: parsed.requiresBrush || false,
        brushConfig: parsed.brushConfig || null,
        rawResponse: assistantContent
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        userMessage: userMessage,
        assistantResponse: null
      };
    }
  }
  
  applyModificationToConfig(config, modification) {
    const mod = modification;
    const result = { ...config };
    
    switch (mod.type) {
      case ModificationType.REPLACE:
        if (mod.target && mod.value !== undefined) {
          result[mod.target] = mod.value;
        }
        break;
        
      case ModificationType.ADD:
        if (mod.target && mod.value !== undefined) {
          const current = result[mod.target] || 0;
          result[mod.target] = current + mod.value;
        }
        break;
        
      case ModificationType.MULTIPLY:
        if (mod.target && mod.value !== undefined) {
          const current = result[mod.target] || 1;
          result[mod.target] = current * mod.value;
        }
        break;
        
      default:
        break;
    }
    
    return result;
  }
  
  generateDefaultTerrainParams(terrainType = 'mountains') {
    const baseParams = {
      gridWidth: 256,
      gridHeight: 256,
      terrainScale: 100,
      heightScale: 50,
      seed: Math.floor(Math.random() * 1000000),
      waterEnabled: false,
      waterLevel: 0.3,
      noiseLayers: [],
      hydraulicEnabled: false,
      thermalEnabled: false
    };
    
    switch (terrainType.toLowerCase()) {
      case 'mountains':
      case '山脉':
        baseParams.heightScale = 70;
        baseParams.noiseLayers = [
          { type: 'simplex', enabled: true, frequency: 0.4, amplitude: 1.0, octaves: 6, persistence: 0.5, lacunarity: 2.0, weight: 1.0 },
          { type: 'simplex', enabled: true, frequency: 1.5, amplitude: 0.4, octaves: 4, persistence: 0.5, lacunarity: 2.0, weight: 0.5 },
          { type: 'perlin', enabled: true, frequency: 8.0, amplitude: 0.1, octaves: 3, persistence: 0.5, lacunarity: 2.0, weight: 0.2 }
        ];
        baseParams.hydraulicEnabled = true;
        baseParams.thermalEnabled = true;
        break;
        
      case 'island':
      case '岛屿':
        baseParams.waterEnabled = true;
        baseParams.waterLevel = 0.4;
        baseParams.heightScale = 60;
        baseParams.noiseLayers = [
          { type: 'simplex', enabled: true, frequency: 0.6, amplitude: 1.0, octaves: 5, persistence: 0.5, lacunarity: 2.0, weight: 1.0 },
          { type: 'simplex', enabled: true, frequency: 2.0, amplitude: 0.3, octaves: 3, persistence: 0.5, lacunarity: 2.0, weight: 0.4 }
        ];
        baseParams.hydraulicEnabled = true;
        break;
        
      case 'plains':
      case '平原':
        baseParams.heightScale = 30;
        baseParams.noiseLayers = [
          { type: 'simplex', enabled: true, frequency: 0.3, amplitude: 0.3, octaves: 4, persistence: 0.5, lacunarity: 2.0, weight: 1.0 },
          { type: 'perlin', enabled: true, frequency: 3.0, amplitude: 0.1, octaves: 2, persistence: 0.5, lacunarity: 2.0, weight: 0.3 }
        ];
        break;
        
      case 'valley':
      case '河谷':
        baseParams.waterEnabled = true;
        baseParams.waterLevel = 0.35;
        baseParams.heightScale = 55;
        baseParams.noiseLayers = [
          { type: 'simplex', enabled: true, frequency: 0.5, amplitude: 0.8, octaves: 5, persistence: 0.5, lacunarity: 2.0, weight: 1.0 },
          { type: 'simplex', enabled: true, frequency: 1.2, amplitude: 0.3, octaves: 4, persistence: 0.5, lacunarity: 2.0, weight: 0.4 }
        ];
        baseParams.hydraulicEnabled = true;
        break;
        
      case 'hills':
      case '丘陵':
        baseParams.heightScale = 40;
        baseParams.noiseLayers = [
          { type: 'simplex', enabled: true, frequency: 0.8, amplitude: 0.7, octaves: 5, persistence: 0.5, lacunarity: 2.0, weight: 1.0 },
          { type: 'perlin', enabled: true, frequency: 3.0, amplitude: 0.2, octaves: 3, persistence: 0.5, lacunarity: 2.0, weight: 0.3 }
        ];
        break;
        
      default:
        baseParams.noiseLayers = [
          { type: 'simplex', enabled: true, frequency: 0.5, amplitude: 1.0, octaves: 6, persistence: 0.5, lacunarity: 2.0, weight: 1.0 }
        ];
    }
    
    return baseParams;
  }
}

export default TerrainAssistant;
