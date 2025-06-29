/* eslint-disable no-console */
import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import Screenshots from '.';

/**
 * 测试修复多个保存弹窗的问题
 * 这个测试会创建多个Screenshots实例来验证IPC监听器是否被正确清理
 */

app.whenReady().then(() => {
  console.log('=== 开始测试多个Screenshots实例的IPC监听器清理 ===');
  
  // 监听IPC事件的数量
  let saveEventCount = 0;
  
  // 创建第一个Screenshots实例
  console.log('创建第一个Screenshots实例...');
  const screenshots1 = new Screenshots({
    lang: {
      operation_save_title: '保存1',
    },
    singleWindow: false,
  });
  
  // 等待一秒后创建第二个实例
  setTimeout(() => {
    console.log('创建第二个Screenshots实例...');
    const screenshots2 = new Screenshots({
      lang: {
        operation_save_title: '保存2',
      },
      singleWindow: false,
    });
    
    // 再等待一秒后创建第三个实例
    setTimeout(() => {
      console.log('创建第三个Screenshots实例...');
      const screenshots3 = new Screenshots({
        lang: {
          operation_save_title: '保存3',
        },
        singleWindow: false,
      });
      
      // 检查IPC监听器数量
      setTimeout(() => {
        const saveListeners = ipcMain.listenerCount('SCREENSHOTS:save');
        console.log(`SCREENSHOTS:save 事件监听器数量: ${saveListeners}`);
        
        if (saveListeners === 1) {
          console.log('✅ 修复成功！只有一个监听器被注册');
        } else {
          console.log(`❌ 修复失败！有 ${saveListeners} 个监听器被注册`);
        }
        
        // 测试保存功能
        console.log('测试保存功能...');
        
        // 模拟保存事件
        const testBuffer = Buffer.from('test image data');
        const testData = {
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          display: { id: 1, x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1 }
        };
        
        // 监听保存事件被触发的次数
        const originalEmit = ipcMain.emit;
        ipcMain.emit = function(event: string, ...args: any[]) {
          if (event === 'SCREENSHOTS:save') {
            saveEventCount++;
            console.log(`保存事件被触发第 ${saveEventCount} 次`);
          }
          return originalEmit.call(this, event, ...args);
        };
        
        // 触发保存事件
        ipcMain.emit('SCREENSHOTS:save', null, testBuffer, testData);
        
        setTimeout(() => {
          if (saveEventCount === 1) {
            console.log('✅ 保存事件只被触发一次，修复成功！');
          } else {
            console.log(`❌ 保存事件被触发 ${saveEventCount} 次，修复失败！`);
          }
          
          console.log('=== 测试完成 ===');
          app.quit();
        }, 1000);
        
      }, 1000);
    }, 1000);
  }, 1000);

  // 创建主窗口
  const mainWin = new BrowserWindow({
    show: true,
    width: 800,
    height: 600,
  });
  mainWin.removeMenu();
  mainWin.loadURL('data:text/html,<h1>Screenshots IPC监听器测试</h1><p>查看控制台输出</p>');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
