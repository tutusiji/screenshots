# 修复"幽灵图标"问题

## 问题分析

当 Electron 主应用关闭主窗口但通过托盘继续运行时，使用截图插件进行截图操作并点击 OK/Save/Cancel 后，会在 Windows 任务栏出现一个无法点击的"幽灵图标"。

## 根本原因

1. **`setAlwaysOnTop(false)` 和 `setAlwaysOnTop(true)` 的调用**：在 `handleSaveEvent` 中调用这些方法时，Windows 系统可能错误地将窗口显示在任务栏中。

2. **缺少 `setSkipTaskbar(true)` 的重新设置**：在修改窗口属性后没有重新确认 `skipTaskbar` 设置。

## 修复方案

### 方案1：避免不必要的 `setAlwaysOnTop` 调用

在 `handleSaveEvent` 中：
1. 保存原始的 `alwaysOnTop` 状态
2. 只在必要时修改状态
3. 在对话框前后都确保 `setSkipTaskbar(true)`
4. 添加防抖机制防止重复触发

### 方案2：使用父窗口显示对话框

如果主应用有可用的主窗口，使用主窗口作为对话框的父窗口，而不是截图窗口。

### 方案3：完全隐藏截图窗口

在显示保存对话框之前完全隐藏截图窗口，对话框完成后再显示。

## 推荐的修复代码

```typescript
private static handleSaveEvent = async (e: any, buffer: Buffer, data: ScreenshotsData) => {
  const instance = Screenshots.activeInstance;
  if (!instance) return;

  // 防止重复触发
  if (Screenshots.isSaving) {
    instance.logger('SCREENSHOTS:save already in progress, ignoring duplicate call');
    return;
  }

  Screenshots.isSaving = true;

  try {
    // ... 现有的事件处理逻辑 ...

    // 保存原始状态
    const wasAlwaysOnTop = instance.$win.isAlwaysOnTop();
    
    // 只在需要时修改状态
    if (wasAlwaysOnTop) {
      instance.$win.setAlwaysOnTop(false);
    }

    // 确保窗口不会出现在任务栏中
    instance.$win.setSkipTaskbar(true);

    const { canceled, filePath } = await dialog.showSaveDialog(instance.$win, {
      // ... 对话框配置 ...
    });

    // 检查窗口是否仍然存在
    if (!instance.$win || instance.$win.isDestroyed()) {
      instance.emit('afterSave', new Event(), buffer, data, false);
      return;
    }

    // 恢复原始状态
    if (wasAlwaysOnTop) {
      instance.$win.setAlwaysOnTop(true);
    }

    // 再次确保不在任务栏中显示
    instance.$win.setSkipTaskbar(true);

    // ... 其余处理逻辑 ...
  } finally {
    Screenshots.isSaving = false;
  }
};
```

## 额外的预防措施

1. **在 `endCapture` 中确保清理**：
```typescript
public async endCapture(): Promise<void> {
  // ... 现有逻辑 ...
  
  if (this.$win && !this.$win.isDestroyed()) {
    // 确保窗口不在任务栏中
    this.$win.setSkipTaskbar(true);
    // ... 其余逻辑 ...
  }
}
```

2. **在窗口创建时加强设置**：
```typescript
this.$win = new BrowserWindow({
  // ... 现有配置 ...
  skipTaskbar: true,
  // 在 Windows 上额外设置
  ...(process.platform === 'win32' && {
    type: 'toolbar',
    parent: null, // 确保没有父窗口
  }),
});
```

这些修复可以有效防止"幽灵图标"问题的出现。
