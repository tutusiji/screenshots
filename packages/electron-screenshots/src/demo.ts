/* eslint-disable no-console */
import { app, BrowserWindow, globalShortcut } from 'electron';
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

  screenshots.on('windowCreated', ($win) => {
    $win.on('focus', () => {
      globalShortcut.register('esc', () => {
        if ($win?.isFocused()) {
          screenshots.endCapture();
        }
      });
    });

    $win.on('blur', () => {
      globalShortcut.unregister('esc');
    });
  });

  // 防止不能关闭截图界面
  globalShortcut.register('ctrl+shift+q', () => {
    app.quit();
  });

  // 点击确定按钮回调事件
  screenshots.on('ok', (e, buffer, bounds) => {
    console.log('capture', buffer, bounds);
  });
  // 点击取消按钮回调事件
  screenshots.on('cancel', () => {
    console.log('capture', 'cancel1');
    screenshots.setLang({
      operation_ellipse_title: 'ellipse',
      operation_rectangle_title: 'rectangle',
    });
  });
  // 点击保存按钮回调事件
  screenshots.on('save', (e, buffer, bounds) => {
    console.log('capture', buffer, bounds);
  });

  // 不创建主窗口，看看是否是主窗口导致的问题
  console.log('Ready! Press Ctrl+Shift+A to take screenshot');
  console.log('No main window created - testing ghost icon fix');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // 应用退出前清理Screenshots资源
  if (screenshots) {
    screenshots.destroy();
  }
});
