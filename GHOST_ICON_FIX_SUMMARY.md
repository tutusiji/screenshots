# 修复"幽灵图标"问题 - 总结

## 问题描述
当 Electron 主应用关闭主窗口但通过托盘继续运行时，使用截图插件进行截图操作并点击 OK/Save/Cancel 后，会在 Windows 任务栏出现一个无法点击的"幽灵图标"。

## 根本原因
1. 在 `handleSaveEvent` 中调用 `setAlwaysOnTop(false)` 和 `setAlwaysOnTop(true)` 时，Windows 系统可能错误地将窗口显示在任务栏中
2. 缺少对 `setSkipTaskbar(true)` 的重新确认
3. 缺少防抖机制，导致可能的重复触发

## 已实施的修复

### 1. 修复 `handleSaveEvent` 方法
- **添加防抖机制**：使用 `Screenshots.isSaving` 标志防止重复触发
- **优化状态管理**：保存原始 `alwaysOnTop` 状态，只在需要时修改
- **强制设置 `skipTaskbar`**：在对话框前后都确保 `setSkipTaskbar(true)`
- **添加窗口销毁检查**：在关键操作前检查窗口是否仍然存在

### 2. 改进窗口创建配置
- **Windows 特定设置**：在 Windows 平台上额外设置 `type: 'toolbar'` 和 `parent: null`
- **确保 `skipTaskbar: true`**：在窗口创建时明确设置

### 3. 修复 `endCapture` 方法
- **添加 `skipTaskbar` 确认**：在结束截图时确保窗口不在任务栏中

### 4. 添加全局状态管理
- **实例计数器**：跟踪活跃实例数量
- **全局状态清理**：当最后一个实例销毁时清理所有全局状态
- **IPC 监听器管理**：防止重复注册和内存泄漏

## 关键修复代码

### 修复后的 `handleSaveEvent`：
```typescript
private static handleSaveEvent = async (e: any, buffer: Buffer, data: ScreenshotsData) => {
  // 防抖机制
  if (Screenshots.isSaving) {
    return;
  }
  Screenshots.isSaving = true;

  try {
    // 保存原始状态
    const wasAlwaysOnTop = instance.$win.isAlwaysOnTop();
    
    // 只在需要时修改状态
    if (wasAlwaysOnTop) {
      instance.$win.setAlwaysOnTop(false);
    }

    // 确保不在任务栏中
    instance.$win.setSkipTaskbar(true);

    // 显示保存对话框
    const result = await dialog.showSaveDialog(instance.$win, {...});

    // 窗口状态检查
    if (!instance.$win || instance.$win.isDestroyed()) {
      return;
    }

    // 恢复原始状态
    if (wasAlwaysOnTop) {
      instance.$win.setAlwaysOnTop(true);
    }
    
    // 再次确保不在任务栏中
    instance.$win.setSkipTaskbar(true);

    // 继续处理保存逻辑...
  } finally {
    Screenshots.isSaving = false;
  }
};
```

### 修复后的窗口创建：
```typescript
this.$win = new BrowserWindow({
  // ... 其他配置
  skipTaskbar: true,
  alwaysOnTop: true,
  // Windows 特有设置
  ...(process.platform === 'win32' && {
    type: 'toolbar',
    parent: null,
  }),
});
```

### 修复后的 `endCapture`：
```typescript
public async endCapture(): Promise<void> {
  // ... 现有逻辑
  
  // 确保窗口不在任务栏中显示
  this.$win.setSkipTaskbar(true);
  
  // 继续处理...
}
```

## 预期效果
- ✅ 彻底解决"幽灵图标"问题
- ✅ 防止重复保存对话框
- ✅ 确保资源正确清理
- ✅ 提高系统稳定性

## 测试验证
1. 关闭主 Electron 应用窗口，仅保留托盘图标
2. 通过托盘唤起截图功能
3. 完成截图后点击 Save 按钮
4. 验证任务栏不会出现"幽灵图标"
5. 重复测试 OK 和 Cancel 按钮

这些修复应该能够完全解决"幽灵图标"问题，确保截图功能在托盘模式下正常工作。
