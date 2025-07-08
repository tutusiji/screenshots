/* eslint-disable no-console */
import { app, BrowserWindow, globalShortcut } from 'electron';
import Screenshots from '.';

let screenshots: Screenshots;

app.whenReady().then(() => {
  console.log('App ready, creating Screenshots instance...');
  
  screenshots = new Screenshots({
    lang: {
      operation_rectangle_title: '矩形',
    },
    singleWindow: true,
  });

  console.log('Screenshots instance created');

  globalShortcut.register('ctrl+shift+a', () => {
    console.log('Starting capture...');
    screenshots.startCapture();
  });

  // 测试：不创建主窗口，看看是否还会出现幽灵图标
  console.log('Ready! Press Ctrl+Shift+A to take screenshot');
  console.log('No main window created - testing ghost icon fix');
});

app.on('window-all-closed', () => {
  // 在非 macOS 平台退出应用
  app.quit();
});

app.on('before-quit', () => {
  // 应用退出前清理Screenshots资源
  if (screenshots) {
    console.log('Cleaning up screenshots...');
    screenshots.destroy();
  }
});
