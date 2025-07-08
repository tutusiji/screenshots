/* eslint-disable no-console */
import { app } from 'electron';

app.whenReady().then(() => {
  console.log('=== 调试版本 - 不创建任何截图实例 ===');
  console.log('如果还有任务栏图标，说明问题不在截图代码');
  console.log('如果没有任务栏图标，说明问题在截图代码');
});

app.on('window-all-closed', () => {
  // 不退出，保持运行
});
