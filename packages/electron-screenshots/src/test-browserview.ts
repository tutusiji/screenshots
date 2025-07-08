/* eslint-disable no-console */
import { app, BrowserView } from 'electron';

let view: BrowserView;

app.whenReady().then(() => {
  console.log('=== 调试版本 - 只创建BrowserView ===');
  
  view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  console.log('BrowserView已创建，检查是否有任务栏图标');
});

app.on('window-all-closed', () => {
  // 不退出，保持运行
});
