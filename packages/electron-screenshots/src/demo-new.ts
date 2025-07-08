/* eslint-disable no-console */
import { app, globalShortcut } from 'electron';
import Screenshots from '.';

let screenshots: Screenshots | null = null;

app.whenReady().then(() => {
  globalShortcut.register('ctrl+shift+a', () => {
    // 每次截图都创建新的实例，避免实例被销毁后的状态问题
    if (screenshots) {
      screenshots.destroy(); // 清理可能存在的旧实例
    }
    
    screenshots = new Screenshots({
      lang: {
        operation_rectangle_title: '矩形2323',
      },
      singleWindow: false, // 改为false，每次都销毁窗口
    });
    
    screenshots.startCapture();
  });

  // 防止不能关闭截图界面
  globalShortcut.register('ctrl+shift+q', () => {
    app.quit();
  });

  // ESC 全局快捷键
  globalShortcut.register('esc', () => {
    if (screenshots) {
      screenshots.endCapture().then(() => {
        screenshots?.destroy();
        screenshots = null;
      });
    }
  });

  // 不创建主窗口，避免任务栏图标
  console.log('Ready! Press Ctrl+Shift+A to take screenshot');
  console.log('每次截图都会创建新实例，避免状态问题');
});

app.on('window-all-closed', () => {
  // 不退出应用，保持运行
});

app.on('before-quit', () => {
  // 应用退出前清理Screenshots资源
  if (screenshots) {
    console.log('Cleaning up screenshots...');
    screenshots.destroy();
  }
});
