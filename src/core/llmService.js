import axios from 'axios';

// LLM 配置
export class LLMConfig {
  constructor(options = {}) {
    this.enabled = options.enabled !== undefined ? options.enabled : false;
    this.baseUrl = options.baseUrl || '';
    this.apiKey = options.apiKey || '';
    this.modelName = options.modelName || '';
    this.temperature = options.temperature !== undefined ? options.temperature : 0.7;
    this.maxTokens = options.maxTokens || 2000;
  }
  
  clone() {
    return new LLMConfig({
      enabled: this.enabled,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      modelName: this.modelName,
      temperature: this.temperature,
      maxTokens: this.maxTokens
    });
  }
  
  toJSON() {
    return {
      enabled: this.enabled,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      modelName: this.modelName,
      temperature: this.temperature,
      maxTokens: this.maxTokens
    };
  }
  
  static fromJSON(json) {
    return new LLMConfig(json);
  }
  
  isConfigured() {
    return this.enabled && this.baseUrl && this.apiKey && this.modelName;
  }
}

// LLM 服务
export class LLMService {
  constructor(config = new LLMConfig()) {
    this.config = config;
  }
  
  setConfig(config) {
    this.config = config instanceof LLMConfig ? config : new LLMConfig(config);
  }
  
  getConfig() {
    return this.config;
  }
  
  // 检查配置是否有效
  validateConfig() {
    if (!this.config.enabled) {
      return { valid: false, error: 'LLM 未启用' };
    }
    if (!this.config.baseUrl) {
      return { valid: false, error: '缺少 API 基础 URL' };
    }
    if (!this.config.apiKey) {
      return { valid: false, error: '缺少 API 密钥' };
    }
    if (!this.config.modelName) {
      return { valid: false, error: '缺少模型名称' };
    }
    return { valid: true };
  }
  
  // 发送请求到 OpenAI 兼容 API
  async chatCompletion(messages, options = {}) {
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const baseUrl = this.config.baseUrl.endsWith('/') 
      ? this.config.baseUrl 
      : this.config.baseUrl + '/';
    
    const url = baseUrl + 'chat/completions';
    
    const requestBody = {
      model: this.config.modelName,
      messages: messages,
      temperature: options.temperature !== undefined ? options.temperature : this.config.temperature,
      max_tokens: options.maxTokens !== undefined ? options.maxTokens : this.config.maxTokens
    };
    
    try {
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        timeout: 60000
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API 错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('网络错误: 无法连接到 API 服务器');
      } else {
        throw new Error(`请求错误: ${error.message}`);
      }
    }
  }
  
  // 简单的文本完成
  async complete(prompt, options = {}) {
    const messages = [
      { role: 'user', content: prompt }
    ];
    return this.chatCompletion(messages, options);
  }
  
  // 生成地形描述建议
  async generateTerrainSuggestions(currentConfig) {
    const prompt = `你是一个专业的地形设计师。请根据当前的地形配置，给出优化建议。

当前配置概览:
- 网格尺寸: ${currentConfig.gridWidth}x${currentConfig.gridHeight}
- 噪声层数: ${currentConfig.noiseLayers?.length || 0}
- 水面高度: ${currentConfig.waterEnabled ? currentConfig.waterLevel : '未启用'}
- 水力侵蚀: ${currentConfig.hydraulicEnabled ? '已启用' : '未启用'}
- 热力侵蚀: ${currentConfig.thermalEnabled ? '已启用' : '未启用'}
- 植被: ${currentConfig.vegetationEnabled ? '已启用' : '未启用'}

请给出:
1. 3-5 条具体的地形改进建议
2. 推荐的植被分布方案
3. 如果需要特定风格的地形（如山脉、平原、岛屿等），应该如何调整参数

请用简洁、专业的语言回答。`;
    
    try {
      const response = await this.complete(prompt);
      const content = response.choices?.[0]?.message?.content || '';
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // 解析自然语言指令为地形参数
  async parseNaturalLanguage(description) {
    const prompt = `你是一个地形参数解析器。请将用户的自然语言描述转换为 JSON 格式的地形参数建议。

用户描述: "${description}"

请返回一个严格的 JSON 对象，包含以下字段（只返回 JSON，不要其他文字）:
{
  "terrainType": "山脉|平原|丘陵|岛屿|河谷",
  "suggestedNoiseLayers": [
    {
      "type": "simplex|perlin",
      "frequency": 数字,
      "amplitude": 数字,
      "octaves": 数字,
      "weight": 数字
    }
  ],
  "waterLevel": 0.0 到 1.0 之间的数字（如果应该有水面）,
  "enableErosion": true|false,
  "vegetationDensity": "low|medium|high",
  "explanation": "简短的解释文字"
}

注意：只返回有效的 JSON，不要包含任何其他文字或markdown标记。`;
    
    try {
      const response = await this.complete(prompt, { temperature: 0.3 });
      let content = response.choices?.[0]?.message?.content || '';
      
      // 尝试提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      const parsed = JSON.parse(content);
      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // 测试 API 连接
  async testConnection() {
    try {
      const messages = [
        { role: 'user', content: '请回复 "连接成功" 来确认 API 连接正常。' }
      ];
      
      const response = await this.chatCompletion(messages, { maxTokens: 50 });
      const content = response.choices?.[0]?.message?.content || '';
      
      return { 
        success: true, 
        message: content,
        model: response.model || this.config.modelName
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default LLMService;