const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // 在开发模式下加载 React 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 在生产模式下加载构建后的 React 应用
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC 处理 - 保存配置
ipcMain.handle('save-config', async (event, config, filePath) => {
  try {
    if (filePath) {
      // 使用提供的路径
      await fs.writeJson(filePath, config, { spaces: 2 });
      return { success: true, path: filePath };
    } else {
      // 打开保存对话框
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '保存地形配置',
        defaultPath: path.join(app.getPath('documents'), 'terrain_config.json'),
        filters: [
          { name: 'JSON 配置文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        await fs.writeJson(result.filePath, config, { spaces: 2 });
        return { success: true, path: result.filePath };
      }
      return { success: false, canceled: true };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理 - 加载配置
ipcMain.handle('load-config', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '加载地形配置',
      defaultPath: path.join(app.getPath('documents')),
      filters: [
        { name: 'JSON 配置文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const config = await fs.readJson(result.filePaths[0]);
      return { success: true, config, path: result.filePaths[0] };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理 - 导出高度图 PNG
ipcMain.handle('export-heightmap-png', async (event, imageData, width, height, filePath) => {
  try {
    const { PNG } = require('pngjs');
    
    // 创建 16 位灰度 PNG
    // imageData 包含 0-65535 的 16位无符号整数（Uint16Array）
    
    const png = new PNG({
      width: width,
      height: height,
      colorType: 0, // 灰度
      bitDepth: 16,  // 16位灰度
      deflateLevel: 9
    });
    
    // 填充图像数据
    // pngjs 内部使用 RGBA 格式（每像素4字节），bitDepth:16 在编码时会将8位值扩展为16位
    for (let i = 0; i < imageData.length; i++) {
      const value = imageData[i]; // 0-65535
      // 取高8位作为灰度值写入 RGBA 各通道
      const gray8 = (value >> 8) & 0xFF;
      const pixelIdx = i * 4;
      png.data[pixelIdx] = gray8;      // R
      png.data[pixelIdx + 1] = gray8;  // G
      png.data[pixelIdx + 2] = gray8;  // B
      png.data[pixelIdx + 3] = 255;    // A (不透明)
    }
    
    let savePath = filePath;
    if (!savePath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '导出高度图 (PNG)',
        defaultPath: path.join(app.getPath('documents'), 'heightmap.png'),
        filters: [
          { name: 'PNG 图像', extensions: ['png'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      
      if (result.canceled) {
        return { success: false, canceled: true };
      }
      savePath = result.filePath;
    }
    
    // 保存为 PNG
    const buffer = PNG.sync.write(png);
    await fs.writeFile(savePath, buffer);
    
    return { success: true, path: savePath };
  } catch (error) {
    console.error('PNG export error:', error);
    return { success: false, error: error.message };
  }
});

// IPC 处理 - 导出高度图 RAW
ipcMain.handle('export-heightmap-raw', async (event, heightData, width, height, filePath) => {
  try {
    let savePath = filePath;
    if (!savePath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '导出高度图 (RAW)',
        defaultPath: path.join(app.getPath('documents'), 'heightmap.raw'),
        filters: [
          { name: 'RAW 文件', extensions: ['raw'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      
      if (result.canceled) {
        return { success: false, canceled: true };
      }
      savePath = result.filePath;
    }
    
    // 创建 16 位无符号整数缓冲区
    const buffer = Buffer.alloc(heightData.length * 2);
    
    for (let i = 0; i < heightData.length; i++) {
      // 使用小端字节序写入 16 位值
      buffer.writeUInt16LE(heightData[i], i * 2);
    }
    
    await fs.writeFile(savePath, buffer);
    
    return { success: true, path: savePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理 - 选择保存路径
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// IPC 处理 - 选择打开路径
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});