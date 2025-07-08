/* eslint-disable no-console */
import { app, globalShortcut } from 'electron';
import Screenshots from '.';

let screenshots: Screenshots;

app.whenReady().then(() => {
  console.log('=== 极简测试版本 ===');
  
  // 最简单的配置，不创建任何主窗口
  screenshots = new Screenshots({
    singleWindow: false,  // 每次都销毁窗口
  });

  console.log('Screenshots 实例已创建 (singleWindow: false)');

  globalShortcut.register('ctrl+shift+a', () => {
    console.log('开始截图...');
    screenshots.startCapture();
  });

  console.log('按 Ctrl+Shift+A 开始截图测试');
  console.log('如果没有任务栏图标，说明基本功能正常');
});

app.on('window-all-closed', () => {
  // 不退出，保持运行
});

app.on('before-quit', () => {
  if (screenshots) {
    screenshots.destroy();
  }
});
