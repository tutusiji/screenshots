// 模拟IPC主进程
class MockIpcMain {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    console.log(`注册监听器: ${event}, 当前数量: ${this.listeners.get(event).length}`);
  }

  removeAllListeners(event) {
    if (this.listeners.has(event)) {
      const count = this.listeners.get(event).length;
      this.listeners.set(event, []);
      console.log(`移除所有监听器: ${event}, 移除数量: ${count}`);
    }
  }

  listenerCount(event) {
    return this.listeners.has(event) ? this.listeners.get(event).length : 0;
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      const handlers = this.listeners.get(event);
      console.log(`触发事件: ${event}, 监听器数量: ${handlers.length}`);
      handlers.forEach((handler, index) => {
        console.log(`  执行监听器 ${index + 1}`);
        handler(...args);
      });
    }
  }
}

// 模拟Screenshots类
class MockScreenshots {
  static ipcListenersRegistered = false;
  static activeInstance = null;

  constructor(id) {
    this.id = id;
    this.setupIPC();
    console.log(`\n创建Screenshots实例 ${id}`);
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
      console.log('  ❌ 没有活跃实例，忽略保存事件');
      return;
    }
    
    console.log(`  ✅ 活跃实例 ${instance.id} 处理保存事件: ${data}`);
    console.log(`  📁 实例 ${instance.id}: 显示保存对话框`);
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

  destroy() {
    if (MockScreenshots.activeInstance === this) {
      MockScreenshots.activeInstance = null;
    }
    console.log(`实例 ${this.id}: 销毁实例`);
  }
}

// 创建模拟的ipcMain
const ipcMain = new MockIpcMain();

console.log('=== 测试多保存对话框修复方案 ===');

// 测试场景
console.log('\n📋 创建多个Screenshots实例...');
const screenshots1 = new MockScreenshots(1);
const screenshots2 = new MockScreenshots(2);
const screenshots3 = new MockScreenshots(3);

console.log(`\n📊 当前IPC监听器数量: ${ipcMain.listenerCount('SCREENSHOTS:save')}`);

console.log('\n🧪 测试场景1: 没有活跃实例时发送保存事件');
ipcMain.emit('SCREENSHOTS:save', null, 'test-data-1');

console.log('\n🧪 测试场景2: 实例1开始截图并保存');
screenshots1.startCapture();
ipcMain.emit('SCREENSHOTS:save', null, 'test-data-2');

console.log('\n🧪 测试场景3: 切换到实例2');
screenshots1.endCapture();
screenshots2.startCapture();
ipcMain.emit('SCREENSHOTS:save', null, 'test-data-3');

console.log('\n🧪 测试场景4: 模拟多个连续保存事件（之前会导致多个对话框）');
console.log('发送3个连续的保存事件...');
ipcMain.emit('SCREENSHOTS:save', null, 'test-data-4a');
ipcMain.emit('SCREENSHOTS:save', null, 'test-data-4b');
ipcMain.emit('SCREENSHOTS:save', null, 'test-data-4c');

console.log('\n🧪 测试场景5: 实例2结束，实例3开始');
screenshots2.endCapture();
screenshots3.startCapture();
ipcMain.emit('SCREENSHOTS:save', null, 'test-data-5');

console.log('\n🧹 清理资源...');
screenshots1.destroy();
screenshots2.destroy();
screenshots3.destroy();

console.log('\n✅ 测试完成！');
console.log('\n📝 结果分析:');
console.log('- 只注册了1个IPC监听器（而不是3个）');
console.log('- 每个保存事件只被处理一次');
console.log('- 只有活跃实例才会处理保存事件');
console.log('- 没有活跃实例时，保存事件被忽略');
console.log('- 这样就避免了多个保存对话框的问题！');
