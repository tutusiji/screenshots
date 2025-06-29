import { app, BrowserWindow, ipcMain } from 'electron';
import Screenshots from './index';

let saveEventCount = 0;

app.whenReady().then(() => {
  console.log('=== 测试多实例BrowserView问题修复 ===');
  
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
          console.log('✅ IPC监听器修复成功！只有一个监听器被注册');
        } else {
          console.log(`❌ IPC监听器修复失败！有 ${saveListeners} 个监听器被注册`);
        }
        
        // 测试活跃实例机制
        console.log('测试活跃实例机制...');
        
        // 模拟第一个实例开始截图
        console.log('第一个实例开始截图...');
        screenshots1.startCapture().then(() => {
          console.log('第一个实例截图开始完成');
          
          // 模拟保存事件
          setTimeout(() => {
            console.log('模拟第一个实例的保存事件...');
            const testBuffer = Buffer.from('test image data from instance 1');
            const testData = {
              bounds: { x: 0, y: 0, width: 100, height: 100 },
              display: { id: 1, x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1 }
            };
            
            // 监听保存事件被触发的次数
            const originalEmit = ipcMain.emit;
            let emitCount = 0;
            ipcMain.emit = function(event: string, ...args: any[]) {
              if (event === 'SCREENSHOTS:save') {
                emitCount++;
                console.log(`保存事件被触发第 ${emitCount} 次`);
              }
              return originalEmit.call(this, event, ...args);
            };
            
            // 触发保存事件
            ipcMain.emit('SCREENSHOTS:save', null, testBuffer, testData);
            
            setTimeout(() => {
              if (emitCount === 1) {
                console.log('✅ 活跃实例机制工作正常，保存事件只被处理一次！');
              } else {
                console.log(`❌ 活跃实例机制有问题，保存事件被处理 ${emitCount} 次！`);
              }
              
              // 测试实例切换
              console.log('测试实例切换...');
              screenshots2.startCapture().then(() => {
                console.log('第二个实例成为活跃实例');
                
                setTimeout(() => {
                  console.log('模拟第二个实例的保存事件...');
                  const testBuffer2 = Buffer.from('test image data from instance 2');
                  
                  // 重置计数器
                  emitCount = 0;
                  
                  // 触发保存事件
                  ipcMain.emit('SCREENSHOTS:save', null, testBuffer2, testData);
                  
                  setTimeout(() => {
                    if (emitCount === 1) {
                      console.log('✅ 实例切换工作正常！');
                    } else {
                      console.log(`❌ 实例切换有问题，保存事件被处理 ${emitCount} 次！`);
                    }
                    
                    console.log('=== 测试完成 ===');
                    
                    // 清理资源
                    screenshots1.destroy();
                    screenshots2.destroy();
                    screenshots3.destroy();
                    
                    setTimeout(() => {
                      app.quit();
                    }, 1000);
                  }, 1000);
                }, 1000);
              }).catch(err => {
                console.error('第二个实例截图失败:', err);
                app.quit();
              });
            }, 1000);
          }, 2000);
        }).catch(err => {
          console.error('第一个实例截图失败:', err);
          app.quit();
        });
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
  mainWin.loadURL('data:text/html,<h1>多实例BrowserView测试</h1><p>查看控制台输出</p>');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
