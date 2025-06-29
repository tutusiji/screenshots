# 修复多个保存弹窗问题

## 问题描述

在使用electron-screenshots截图工具时，点击工具条上的save按钮会唤起多个文件保存弹窗，这是一个错误的行为。

## 问题原因

通过分析代码发现，问题的根源在于IPC事件监听器的重复注册：

1. **重复的IPC事件监听器注册**：在 `packages/electron-screenshots/src/index.ts` 的 `listenIpc()` 方法中，使用了 `ipcMain.on()` 来监听 `SCREENSHOTS:save` 事件。

2. **每次创建Screenshots实例都会注册新的监听器**：在构造函数中调用了 `this.listenIpc()`，这意味着每次创建新的Screenshots实例时，都会注册新的IPC事件监听器。

3. **监听器没有被清理**：当Screenshots实例被销毁或重新创建时，之前注册的IPC监听器并没有被移除，导致多个监听器同时存在。

4. **多次触发保存对话框**：当用户点击save按钮时，所有注册的监听器都会被触发，每个监听器都会调用 `dialog.showSaveDialog()`，导致出现多个保存弹窗。

## 解决方案

在 `listenIpc()` 方法开始时，先移除已存在的监听器，然后再注册新的监听器：

```typescript
private listenIpc(): void {
  // 先移除已存在的监听器，避免重复注册
  ipcMain.removeAllListeners('SCREENSHOTS:ok');
  ipcMain.removeAllListeners('SCREENSHOTS:cancel');
  ipcMain.removeAllListeners('SCREENSHOTS:save');

  // 然后注册新的监听器
  ipcMain.on('SCREENSHOTS:ok', (e, buffer: Buffer, data: ScreenshotsData) => {
    // ... 处理逻辑
  });
  
  ipcMain.on('SCREENSHOTS:cancel', () => {
    // ... 处理逻辑
  });
  
  ipcMain.on('SCREENSHOTS:save', async (e, buffer: Buffer, data: ScreenshotsData) => {
    // ... 处理逻辑
  });
}
```

## 修复效果

- ✅ 确保每个IPC事件只有一个监听器
- ✅ 点击save按钮只会弹出一个文件保存窗口
- ✅ 不影响其他功能的正常使用
- ✅ 兼容现有的API和使用方式

## 测试

可以使用 `packages/electron-screenshots/src/test-fix.ts` 文件来测试修复效果：

```bash
# 在项目根目录运行
npm run test:fix
```

测试会创建多个Screenshots实例，验证IPC监听器是否被正确清理。

## 相关文件

- `packages/electron-screenshots/src/index.ts` - 主要修复文件
- `packages/electron-screenshots/src/test-fix.ts` - 测试文件
- `FIX_MULTIPLE_SAVE_DIALOGS.md` - 本说明文档
