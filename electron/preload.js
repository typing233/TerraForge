const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置保存和加载
  saveConfig: (config, filePath) => ipcRenderer.invoke('save-config', config, filePath),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  
  // 高度图导出
  exportHeightmapPNG: (imageData, width, height, filePath) => 
    ipcRenderer.invoke('export-heightmap-png', imageData, width, height, filePath),
  exportHeightmapRAW: (heightData, width, height, filePath) => 
    ipcRenderer.invoke('export-heightmap-raw', heightData, width, height, filePath),
  
  // 文件对话框
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // 平台信息
  platform: process.platform,
  isElectron: true
});