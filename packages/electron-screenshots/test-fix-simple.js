const { app, BrowserWindow, ipcMain } = require('electron');

// 模拟Screenshots类的核心逻辑来测试修复
class MockScreenshots {
  static ipcListenersRegistered = false;
  static activeInstance = null;

  constructor(id) {
    this.id = id;
    this.setupIPC();
    console.log(`创建Screenshots实例 ${id}`);
  }

  setupIPC() {
    if (MockScreenshots.ipcListenersRegistered) {
      console.log(`实例 ${this.id}: IPC监听器已存在，跳过注册`);
      return;
    }
    
    MockScreenshots.ipcListenersRegistered = true;
    console.log(`实例 ${this.id}: 注册IPC监听器`);
    
    // 清理现有监听器
    ipcMain.removeAllListeners('SCREENSHOTS:save');
    
    // 注册新监听器
    ipcMain.on('SCREENSHOTS:save', MockScreenshots.handleSave);
  }

  static handleSave = (event, data) => {
    const instance = MockScreenshots.activeInstance;
    if (!instance) {
      console.log('没有活跃实例，忽略保存事件');
      return;
    }
    
    console.log(`活跃实例 ${instance.id} 处理保存事件:`, data);
    // 模拟保存对话框
    console.log(`实例 ${instance.id}: 显示保存对话框`);
  };

  startCapture() {
    MockScreenshots.activeInstance = this;
    console.log(`实例 ${this.id}: 开始截图，设置为活跃实例`);
  }

  endCapture() {
    if (MockScreenshots.activeInstance === this) {
      MockScreenshots.activeInstance = null;
      console.log(`实例 ${this.id}: 结束截图，清除活跃实例`);
    }
  }
}

app.whenReady().then(() => {
  console.log('=== 测试多保存对话框修复 ===\n');
  
  // 创建多个实例
  const screenshots1 = new MockScreenshots(1);
  const screenshots2 = new MockScreenshots(2);
  const screenshots3 = new MockScreenshots(3);
  
  console.log(`\nIPC监听器数量: ${ipcMain.listenerCount('SCREENSHOTS:save')}`);
  
  // 测试场景1: 没有活跃实例时发送保存事件
  console.log('\n--- 测试场景1: 没有活跃实例 ---');
  ipcMain.emit('SCREENSHOTS:save', null, 'test data 1');
  
  // 测试场景2: 实例1开始截图并保存
  console.log('\n--- 测试场景2: 实例1截图并保存 ---');
  screenshots1.startCapture();
  ipcMain.emit('SCREENSHOTS:save', null, 'test data 2');
  
  // 测试场景3: 切换到实例2
  console.log('\n--- 测试场景3: 切换到实例2 ---');
  screenshots1.endCapture();
  screenshots2.startCapture();
  ipcMain.emit('SCREENSHOTS:save', null, 'test data 3');
  
  // 测试场景4: 模拟多个保存事件（之前会导致多个对话框）
  console.log('\n--- 测试场景4: 多个保存事件 ---');
  ipcMain.emit('SCREENSHOTS:save', null, 'test data 4a');
  ipcMain.emit('SCREENSHOTS:save', null, 'test data 4b');
  ipcMain.emit('SCREENSHOTS:save', null, 'test data 4c');
  
  console.log('\n=== 测试完成 ===');
  console.log('如果只看到一个"显示保存对话框"消息对应每个保存事件，说明修复成功！');
  
  setTimeout(() => {
    app.quit();
  }, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
