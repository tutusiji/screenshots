/* eslint-disable no-console */
import { app, globalShortcut } from 'electron';
import Screenshots from '.';

app.whenReady().then(() => {
  console.log('=== 销毁实例测试版本 ===');
  console.log('每次截图操作后都会销毁实例，确保没有残留');

  // 创建截图快捷键
  globalShortcut.register('ctrl+shift+a', () => {
    console.log('\n--- 新的截图操作 ---');
    
    // 每次都创建新的实例
    const screenshots = new Screenshots({
      singleWindow: false,  // 确保每次都重新创建窗口
    });

    console.log('新的 Screenshots 实例已创建');
    screenshots.startCapture();
    
    // 注意：实例会在操作完成后自动销毁，不需要手动清理
  });

  console.log('\n测试说明:');
  console.log('1. 按 Ctrl+Shift+A 进行截图');
  console.log('2. 每次截图都会创建新实例');
  console.log('3. 操作完成后实例自动销毁');
  console.log('4. 检查任务栏是否还会出现图标');
});

app.on('window-all-closed', () => {
  // 不退出应用，继续监听快捷键
});
