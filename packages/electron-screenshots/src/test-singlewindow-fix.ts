/* eslint-disable no-console */
import { app, globalShortcut } from 'electron';
import Screenshots from '.';

let screenshots: Screenshots;
let captureCount = 0;

app.whenReady().then(() => {
  console.log('=== 幽灵图标修复测试 - singleWindow 模式 ===');
  
  screenshots = new Screenshots({
    singleWindow: true,  // 使用 singleWindow 模式测试
  });

  console.log('Screenshots 实例已创建 (singleWindow: true)');

  globalShortcut.register('ctrl+shift+a', () => {
    captureCount++;
    console.log(`\n--- 第 ${captureCount} 次截图 ---`);
    console.log('开始截图...');
    screenshots.startCapture();
  });

  // 监听截图完成事件
  screenshots.on('ok', () => {
    console.log('截图完成 (OK)');
  });

  screenshots.on('cancel', () => {
    console.log('截图取消 (Cancel)');
  });

  screenshots.on('save', () => {
    console.log('开始保存截图...');
  });

  screenshots.on('afterSave', () => {
    console.log('截图保存完成');
  });

  console.log('\n测试说明:');
  console.log('1. 按 Ctrl+Shift+A 进行截图');
  console.log('2. 重复多次截图测试');
  console.log('3. 检查任务栏是否出现幽灵图标');
  console.log('4. 如果没有图标出现，说明修复成功！');
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (screenshots) {
    console.log('\n清理 Screenshots 资源...');
    screenshots.destroy();
  }
});
