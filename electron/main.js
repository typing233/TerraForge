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
    const { createCanvas, PNG } = require('canvas');
    
    // 创建 16 位灰度画布
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 创建 ImageData
    const imgData = ctx.createImageData(width, height);
    
    // 16位灰度需要转换为 8 位双通道，或者直接生成 16位
    // 这里我们使用简单的方法：将 16位值分成高8位和低8位
    // 对于 PNG，我们可以使用 alpha 通道来存储低 8 位，或者使用 16位模式
    
    // 简单方法：将 0-65535 的值缩放到 0-255 的灰度
    // 更好的方法：使用 16 位模式
    
    for (let i = 0; i < imageData.length; i++) {
      // imageData 包含 0-65535 的 16位值
      const value = imageData[i];
      const pixelIndex = i * 4;
      
      // 缩放为 8 位灰度显示
      const gray8 = Math.floor((value / 65535) * 255);
      
      imgData.data[pixelIndex] = gray8;     // R
      imgData.data[pixelIndex + 1] = gray8; // G
      imgData.data[pixelIndex + 2] = gray8; // B
      imgData.data[pixelIndex + 3] = 255;   // A
    }
    
    ctx.putImageData(imgData, 0, 0);
    
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
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(savePath, buffer);
    
    return { success: true, path: savePath };
  } catch (error) {
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