# Screenshots destroy() 方法使用指南

## 问题背景

在修复多个保存对话框问题时，我们添加了 `destroy()` 方法来正确清理 BrowserView 资源。但是这个方法需要在适当的时机被调用，否则资源清理不会生效。

## destroy() 方法的作用

```typescript
public destroy(): void {
  this.logger('destroy');
  
  // 销毁BrowserView
  this.destroyBrowserView();
  
  // 销毁窗口
  if (this.$win && !this.$win.isDestroyed()) {
    this.$win.destroy();
    this.$win = null;
  }
  
  // 移除所有事件监听器
  this.removeAllListeners();
}
```

### 清理的资源包括：
1. **BrowserView 和渲染进程**：防止"僵尸"进程继续发送IPC消息
2. **活跃实例状态**：清理全局活跃实例引用
3. **BrowserWindow**：销毁截图窗口
4. **事件监听器**：移除所有自定义事件监听器

## 何时调用 destroy()

### 1. 应用退出时（推荐）
```typescript
let screenshots: Screenshots;

app.whenReady().then(() => {
  screenshots = new Screenshots();
  // ... 其他初始化代码
});

app.on('before-quit', () => {
  // 应用退出前清理Screenshots资源
  if (screenshots) {
    screenshots.destroy();
  }
});
```

### 2. 多实例使用时
```typescript
// 创建多个实例
const screenshots1 = new Screenshots();
const screenshots2 = new Screenshots();

// 使用实例1
screenshots1.startCapture();
// ... 使用完毕后

// 切换到实例2前，销毁实例1
screenshots1.destroy();
screenshots2.startCapture();

// 最终清理
screenshots2.destroy();
```

### 3. 动态创建和销毁时
```typescript
function createScreenshotTool() {
  const screenshots = new Screenshots();
  
  // 使用完毕后立即销毁
  screenshots.on('save', () => {
    setTimeout(() => {
      screenshots.destroy();
    }, 1000); // 给保存操作一些时间完成
  });
  
  return screenshots;
}
```

## 自动清理机制

我们已经在代码中添加了一些自动清理机制：

### 1. 窗口关闭时自动清理BrowserView
```typescript
this.$win.on('closed', () => {
  this.emit('windowClosed', this.$win);
  this.$win = null;
  
  // 如果不是singleWindow模式，窗口关闭时自动销毁BrowserView
  if (!this.singleWindow) {
    this.destroyBrowserView();
  }
});
```

### 2. endCapture时清理活跃实例
```typescript
public async endCapture(): Promise<void> {
  // 清理活跃实例
  if (Screenshots.activeInstance === this) {
    Screenshots.activeInstance = null;
  }
  // ...
}
```

## 使用建议

### ✅ 推荐做法

1. **应用级别管理**：在应用的主进程中统一管理Screenshots实例的生命周期
2. **及时清理**：不再使用的实例应该立即调用destroy()
3. **事件驱动清理**：在适当的事件（如应用退出、窗口关闭）中自动调用destroy()

### ❌ 避免的做法

1. **忘记调用destroy()**：会导致内存泄漏和"僵尸"进程
2. **重复调用destroy()**：虽然方法有保护机制，但应该避免
3. **在异步操作中调用**：确保所有异步操作完成后再调用destroy()

## 验证清理效果

可以通过以下方式验证资源是否被正确清理：

### 1. 检查进程数量
```bash
# 查看electron进程数量
ps aux | grep electron | wc -l
```

### 2. 检查内存使用
```javascript
// 在主进程中
console.log('内存使用:', process.memoryUsage());
```

### 3. 检查IPC监听器
```javascript
// 检查特定事件的监听器数量
console.log('SCREENSHOTS:save 监听器数量:', ipcMain.listenerCount('SCREENSHOTS:save'));
```

## 示例：完整的生命周期管理

```typescript
import { app, BrowserWindow, globalShortcut } from 'electron';
import Screenshots from './index';

class ScreenshotsManager {
  private screenshots: Screenshots | null = null;

  init() {
    this.screenshots = new Screenshots({
      singleWindow: true,
    });

    // 注册快捷键
    globalShortcut.register('ctrl+shift+a', () => {
      this.screenshots?.startCapture();
    });

    // 监听应用退出
    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  cleanup() {
    if (this.screenshots) {
      this.screenshots.destroy();
      this.screenshots = null;
    }
    globalShortcut.unregisterAll();
  }
}

const manager = new ScreenshotsManager();

app.whenReady().then(() => {
  manager.init();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

## 总结

`destroy()` 方法是解决多保存对话框问题的关键组成部分，但需要开发者主动调用。建议：

1. 在应用退出时统一清理
2. 多实例使用时及时销毁不需要的实例
3. 利用事件机制自动触发清理
4. 定期检查资源使用情况，确保清理生效

正确使用 `destroy()` 方法可以：
- 彻底解决多保存对话框问题
- 防止内存泄漏
- 提升应用性能
- 确保资源正确释放
