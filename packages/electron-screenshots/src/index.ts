import debug, { Debugger } from 'debug';
import {
  BrowserView,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  dialog,
  ipcMain,
  nativeImage,
} from 'electron';
import Events from 'events';
import fs from 'fs-extra';
import Event from './event';
import getDisplay, { Display } from './getDisplay';
import padStart from './padStart';
import { Bounds, ScreenshotsData } from './preload';

export type LoggerFn = (...args: unknown[]) => void;
export type Logger = Debugger | LoggerFn;

export interface Lang {
  magnifier_position_label?: string;
  operation_ok_title?: string;
  operation_cancel_title?: string;
  operation_save_title?: string;
  operation_redo_title?: string;
  operation_undo_title?: string;
  operation_mosaic_title?: string;
  operation_text_title?: string;
  operation_brush_title?: string;
  operation_arrow_title?: string;
  operation_ellipse_title?: string;
  operation_rectangle_title?: string;
}

export interface ScreenshotsOpts {
  lang?: Lang;
  logger?: Logger;
  singleWindow?: boolean;
}

export { Bounds };

export default class Screenshots extends Events {
  // 截图窗口对象
  public $win: BrowserWindow | null = null;

  // 隐藏的父窗口，用于确保截图窗口不在任务栏显示
  private static $hiddenParent: BrowserWindow | null = null;

  public $view: BrowserView;

  private logger: Logger;

  private singleWindow: boolean;

  private isReady: Promise<void>;

  // 静态变量用于管理全局IPC监听器
  private static ipcListenersRegistered = false;

  // 添加实例计数器
  private static instanceCount = 0;

  // 添加保存状态标志，防止重复触发
  private static isSaving = false;

  // 添加保存任务的唯一标识符，用于防抖
  private static saveTaskId = 0;

  constructor(opts?: ScreenshotsOpts) {
    super();
    this.logger = opts?.logger || debug('electron-screenshots');
    this.singleWindow = opts?.singleWindow || false;

    // 增加实例计数
    Screenshots.instanceCount += 1;

    // 创建新的BrowserView实例
    this.$view = new BrowserView({
      webPreferences: {
        preload: require.resolve('./preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        // 添加额外的安全设置
        sandbox: false,
        webSecurity: true,
      },
    });

    // 确保BrowserView不会触发任务栏显示
    if (this.$view.webContents) {
      // 阻止新窗口创建
      this.$view.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
      });
    }

    // 初始化isReady Promise
    this.isReady = new Promise<void>((resolve) => {
      const readyHandler = () => {
        this.logger('SCREENSHOTS:ready');
        resolve();
      };
      ipcMain.once('SCREENSHOTS:ready', readyHandler);
    });

    Screenshots.listenIpc();
    this.$view.webContents.loadURL(
      `file://${require.resolve('react-screenshots/electron/electron.html')}`,
    );

    if (opts?.lang) {
      this.setLang(opts.lang);
    }
  }

  /**
   * 开始截图
   */
  public async startCapture(): Promise<void> {
    this.logger('startCapture');

    // 设置当前实例为活跃实例
    this.setAsActiveInstance();

    const display = getDisplay();

    const [imageUrl] = await Promise.all([this.capture(display), this.isReady]);

    await this.createWindow(display);

    this.$view.webContents.send('SCREENSHOTS:capture', display, imageUrl);
  }

  /**
   * 结束截图
   */
  public async endCapture(): Promise<void> {
    this.logger('endCapture');
    await this.reset();

    // 清理活跃实例
    if (Screenshots.activeInstance === this) {
      Screenshots.activeInstance = null;
    }

    if (!this.$win) {
      return;
    }

    // 在进行任何窗口操作之前，先确保不在任务栏显示
    this.$win.setSkipTaskbar(true);

    // 先清除全屏和 Kiosk 模式，然后取消全屏才有效
    this.$win.setFullScreen(false);
    this.$win.setKiosk(false);
    this.$win.blur();
    this.$win.blurWebView();
    this.$win.unmaximize();
    this.$win.removeBrowserView(this.$view);

    // 再次确保窗口不在任务栏中显示
    this.$win.setSkipTaskbar(true);

    if (this.singleWindow) {
      this.$win.hide();
    } else {
      this.$win.destroy();
    }
  }

  /**
   * 销毁BrowserView，清理渲染进程资源
   */
  private destroyBrowserView(): void {
    this.logger('destroyBrowserView');

    // 清理活跃实例
    if (Screenshots.activeInstance === this) {
      Screenshots.activeInstance = null;
    }

    // 销毁BrowserView
    if (this.$view) {
      // 先从窗口中移除 BrowserView
      if (this.$win && !this.$win.isDestroyed()) {
        this.$win.removeBrowserView(this.$view);
      }

      // 检查 webContents 是否已销毁，如果没有则尝试销毁 BrowserView
      if (!this.$view.webContents.isDestroyed()) {
        // 在较新版本的 Electron 中，可以直接销毁 BrowserView
        if (typeof (this.$view as any).destroy === 'function') {
          (this.$view as any).destroy();
        }
      }
    }
  }

  /**
   * 销毁Screenshots实例，清理所有资源
   */
  public destroy(): void {
    this.logger('destroy');

    // 减少实例计数
    Screenshots.instanceCount = Math.max(0, Screenshots.instanceCount - 1);

    // 销毁BrowserView
    this.destroyBrowserView();

    // 销毁窗口
    if (this.$win && !this.$win.isDestroyed()) {
      // 销毁前确保不在任务栏显示
      this.$win.setSkipTaskbar(true);
      this.$win.destroy();
      this.$win = null;
    }

    // 移除所有事件监听器
    this.removeAllListeners();

    // 如果没有实例了，清理全局 IPC 监听器
    if (Screenshots.instanceCount <= 0) {
      Screenshots.cleanupIpcListeners();
      Screenshots.isSaving = false; // 重置保存状态
      
      // 清理隐藏的父窗口
      if (Screenshots.$hiddenParent && !Screenshots.$hiddenParent.isDestroyed()) {
        Screenshots.$hiddenParent.destroy();
        Screenshots.$hiddenParent = null;
      }
    }
  }

  /**
   * 设置语言
   */
  public async setLang(lang: Partial<Lang>): Promise<void> {
    this.logger('setLang', lang);

    await this.isReady;

    this.$view.webContents.send('SCREENSHOTS:setLang', lang);
  }

  private async reset() {
    // 重置截图区域
    this.$view.webContents.send('SCREENSHOTS:reset');

    // 保证 UI 有足够的时间渲染
    await Promise.race([
      new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 500);
      }),
      new Promise<void>((resolve) => {
        ipcMain.once('SCREENSHOTS:reset', () => resolve());
      }),
    ]);
  }

  /**
   * 初始化窗口
   */
  private async createWindow(display: Display): Promise<void> {
    // 重置截图区域
    await this.reset();

    // 复用未销毁的窗口
    if (!this.$win || this.$win?.isDestroyed?.()) {
      // 暂时不使用隐藏父窗口，看看是否是它导致的问题
      // Screenshots.ensureHiddenParent();

      const windowTypes: Record<string, string | undefined> = {
        darwin: 'panel',
        // linux 必须设置为 undefined，否则会在部分系统上不能触发focus 事件
        // https://github.com/nashaofu/screenshots/issues/203#issuecomment-1518923486
        linux: undefined,
        win32: 'toolbar',
      };

      // 在Windows上使用完全不同的策略
      if (process.platform === 'win32') {
        this.$win = new BrowserWindow({
          width: display.width,
          height: display.height,
          x: display.x,
          y: display.y,
          show: false,
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          focusable: true,
          resizable: false,
          movable: false,
          minimizable: false,
          maximizable: false,
          closable: false,
          autoHideMenuBar: true,
          titleBarStyle: 'hidden',
          hasShadow: false,
          backgroundColor: '#00000000',
          fullscreen: false,
          fullscreenable: true,  // 允许全屏
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });
      } else {
        // 非Windows平台使用原来的配置
        this.$win = new BrowserWindow({
          title: 'screenshots',
          x: display.x,
          y: display.y,
          width: display.width,
          height: display.height,
          useContentSize: true,
          type: windowTypes[process.platform],
          frame: false,
          show: false,
          autoHideMenuBar: true,
          transparent: true,
          resizable: false,
          movable: false,
          minimizable: false,
          maximizable: false,
          focusable: true,
          skipTaskbar: true,
          alwaysOnTop: true,
          fullscreen: false,
          fullscreenable: false,
          kiosk: true,
          backgroundColor: '#00000000',
          titleBarStyle: 'hidden',
          hasShadow: false,
          paintWhenInitiallyHidden: false,
          roundedCorners: false,
          enableLargerThanScreen: false,
          acceptFirstMouse: true,
        });
      }

      // 创建窗口后立即设置 skipTaskbar，防止任务栏图标出现
      this.$win.setSkipTaskbar(true);

      this.emit('windowCreated', this.$win);
      this.$win.on('show', () => {
        this.$win?.focus();
        // 只在非Windows平台设置kiosk模式，避免触发任务栏显示
        if (process.platform !== 'win32') {
          this.$win?.setKiosk(true);
        }
        // 确保窗口显示时不在任务栏中
        this.$win?.setSkipTaskbar(true);
      });

      this.$win.on('closed', () => {
        this.emit('windowClosed', this.$win);
        this.$win = null;

        // 如果不是singleWindow模式，窗口关闭时自动销毁BrowserView
        if (!this.singleWindow) {
          this.destroyBrowserView();
        }
      });
    }

    this.$win.setBrowserView(this.$view);

    // 设置BrowserView后，再次确保不在任务栏中
    this.$win.setSkipTaskbar(true);

    // 适定平台
    if (process.platform === 'darwin') {
      this.$win.setWindowButtonVisibility(false);
    }

    if (process.platform !== 'win32') {
      this.$win.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true,
      });
    }

    this.$win.blur();
    this.$win.setBounds(display);
    this.$view.setBounds({
      x: 0,
      y: 0,
      width: display.width,
      height: display.height,
    });
    this.$win.setAlwaysOnTop(true);
    
    // 所有平台都使用全屏模式确保正确覆盖屏幕
    this.$win.setFullScreen(true);
    
    // 在显示窗口前，确保不在任务栏中
    this.$win.setSkipTaskbar(true);
    
    this.$win.show();
    
    // 窗口显示后，再次确保不在任务栏中
    this.$win.setSkipTaskbar(true);
  }

  private async capture(display: Display): Promise<string> {
    this.logger('SCREENSHOTS:capture');

    try {
      const { Monitor } = await import('node-screenshots');
      const monitor = Monitor.fromPoint(
        display.x + display.width / 2,
        display.y + display.height / 2,
      );
      this.logger(
        'SCREENSHOTS:capture Monitor.fromPoint arguments %o',
        display,
      );
      this.logger('SCREENSHOTS:capture Monitor.fromPoint return %o', {
        id: monitor?.id,
        name: monitor?.name,
        x: monitor?.x,
        y: monitor?.y,
        width: monitor?.width,
        height: monitor?.height,
        rotation: monitor?.rotation,
        scaleFactor: monitor?.scaleFactor,
        frequency: monitor?.frequency,
        isPrimary: monitor?.isPrimary,
      });

      if (!monitor) {
        throw new Error(`Monitor.fromDisplay(${display.id}) get null`);
      }

      const image = await monitor.captureImage();
      const buffer = await image.toPng(true);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (err) {
      this.logger('SCREENSHOTS:capture Monitor capture() error %o', err);

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: display.width * display.scaleFactor,
          height: display.height * display.scaleFactor,
        },
      });

      let source;
      // Linux系统上，screen.getDisplayNearestPoint 返回的 Display 对象的 id
      // 和这里 source 对象上的 display_id(Linux上，这个值是空字符串) 或 id 的中间部分，都不一致
      // 但是，如果只有一个显示器的话，其实不用判断，直接返回就行
      if (sources.length === 1) {
        [source] = sources;
      } else {
        source = sources.find(
          (item) => item.display_id === display.id.toString()
            || item.id.startsWith(`screen:${display.id}:`),
        );
      }

      if (!source) {
        this.logger(
          "SCREENSHOTS:capture Can't find screen source. sources: %o, display: %o",
          sources,
          display,
        );
        throw new Error("Can't find screen source");
      }

      return source.thumbnail.toDataURL();
    }
  }

  /**
   * 绑定ipc事件处理
   */
  private static listenIpc(): void {
    // 使用静态变量确保全局只注册一次IPC监听器
    if (Screenshots.ipcListenersRegistered) {
      return;
    }

    Screenshots.ipcListenersRegistered = true;

    // 先清理已存在的监听器
    Screenshots.cleanupIpcListeners();

    /**
     * OK事件 - 使用静态方法处理，避免this绑定问题
     */
    ipcMain.on('SCREENSHOTS:ok', Screenshots.handleOkEvent);

    /**
     * CANCEL事件 - 使用静态方法处理，避免this绑定问题
     */
    ipcMain.on('SCREENSHOTS:cancel', Screenshots.handleCancelEvent);

    /**
     * SAVE事件 - 使用静态方法处理，避免this绑定问题
     */
    ipcMain.on('SCREENSHOTS:save', Screenshots.handleSaveEvent);
  }

  /**
   * 清理 IPC 监听器
   */
  private static cleanupIpcListeners(): void {
    ipcMain.removeAllListeners('SCREENSHOTS:ok');
    ipcMain.removeAllListeners('SCREENSHOTS:cancel');
    ipcMain.removeAllListeners('SCREENSHOTS:save');
    Screenshots.ipcListenersRegistered = false;
  }

  // 静态变量用于存储当前活跃的Screenshots实例
  private static activeInstance: Screenshots | null = null;

  // 设置当前活跃的实例
  private setAsActiveInstance(): void {
    Screenshots.activeInstance = this;
  }

  // 静态事件处理方法
  private static handleOkEvent = (
    e: any,
    buffer: Buffer,
    data: ScreenshotsData,
  ) => {
    const instance = Screenshots.activeInstance;
    if (!instance) return;

    instance.logger(
      'SCREENSHOTS:ok buffer.length %d, data: %o',
      buffer.length,
      data,
    );

    const event = new Event();
    instance.emit('ok', event, buffer, data);
    if (event.defaultPrevented) {
      return;
    }
    clipboard.writeImage(nativeImage.createFromBuffer(buffer));
    
    // 只结束截图，不销毁实例，允许重复使用
    instance.endCapture();
  };

  private static handleCancelEvent = () => {
    const instance = Screenshots.activeInstance;
    if (!instance) return;

    instance.logger('SCREENSHOTS:cancel');

    const event = new Event();
    instance.emit('cancel', event);
    if (event.defaultPrevented) {
      return;
    }
    
    // 只结束截图，不销毁实例，允许重复使用
    instance.endCapture();
  };

  private static handleSaveEvent = async (
    e: any,
    buffer: Buffer,
    data: ScreenshotsData,
  ) => {
    const instance = Screenshots.activeInstance;
    if (!instance) return;

    // 防止重复触发 - 强制防抖机制
    if (Screenshots.isSaving) {
      instance.logger(
        'SCREENSHOTS:save already in progress, ignoring duplicate call',
      );
      return;
    }

    // 生成唯一的任务ID
    Screenshots.saveTaskId += 1;
    const currentTaskId = Screenshots.saveTaskId;

    Screenshots.isSaving = true;

    // 添加延迟，确保只处理最后一次调用
    // await new Promise((resolve) => setTimeout(resolve, 50));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });

    // 检查是否有新的任务，如果有则放弃当前任务
    if (Screenshots.saveTaskId !== currentTaskId) {
      instance.logger('SCREENSHOTS:save task superseded, abandoning');
      Screenshots.isSaving = false;
      return;
    }

    try {
      instance.logger(
        'SCREENSHOTS:save buffer.length %d, data: %o, taskId: %d',
        buffer.length,
        data,
        currentTaskId,
      );

      const event = new Event();
      instance.emit('save', event, buffer, data);
      if (event.defaultPrevented || !instance.$win) {
        return;
      }

      const time = new Date();
      const year = time.getFullYear();
      const month = padStart(time.getMonth() + 1, 2, '0');
      const date = padStart(time.getDate(), 2, '0');
      const hours = padStart(time.getHours(), 2, '0');
      const minutes = padStart(time.getMinutes(), 2, '0');
      const seconds = padStart(time.getSeconds(), 2, '0');
      const milliseconds = padStart(time.getMilliseconds(), 3, '0');

      // 保存原始的 alwaysOnTop 状态
      const wasAlwaysOnTop = instance.$win.isAlwaysOnTop();
      
      // 只有在需要时才修改 alwaysOnTop 状态
      if (wasAlwaysOnTop) {
        instance.$win.setAlwaysOnTop(false);
      }

      // 确保窗口不会出现在任务栏中
      instance.$win.setSkipTaskbar(true);

      const { canceled, filePath } = await dialog.showSaveDialog(
        instance.$win,
        {
          defaultPath: `${year}${month}${date}${hours}${minutes}${seconds}${milliseconds}.png`,
          filters: [
            { name: 'Image (png)', extensions: ['png'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        },
      );

      if (!instance.$win || instance.$win.isDestroyed()) {
        instance.emit('afterSave', new Event(), buffer, data, false);
        return;
      }

      // 恢复原始的 alwaysOnTop 状态
      if (wasAlwaysOnTop) {
        instance.$win.setAlwaysOnTop(true);
      }

      // 确保窗口继续不在任务栏中显示
      instance.$win.setSkipTaskbar(true);

      if (canceled || !filePath) {
        instance.emit('afterSave', new Event(), buffer, data, false);
        // 即使取消也要结束截图，但不销毁实例
        instance.endCapture();
        return;
      }

      await fs.writeFile(filePath, buffer);
      instance.emit('afterSave', new Event(), buffer, data, true);
      
      // 结束截图，但不销毁实例，允许重复使用
      instance.endCapture();
    } catch (error) {
      instance.logger('SCREENSHOTS:save error:', error);
      instance.emit('afterSave', new Event(), buffer, data, false);
      
      // 错误时也要结束截图，但不销毁实例
      instance.endCapture();
    } finally {
      // 确保在任何情况下都重置保存状态
      Screenshots.isSaving = false;
    }
  };

  /**
   * 确保隐藏的父窗口存在
   */
  private static ensureHiddenParent(): void {
    if (!Screenshots.$hiddenParent || Screenshots.$hiddenParent.isDestroyed()) {
      Screenshots.$hiddenParent = new BrowserWindow({
        title: 'hidden-parent',
        show: false,
        skipTaskbar: true,
        width: 1,
        height: 1,
        frame: false,
        transparent: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        focusable: false,
        alwaysOnTop: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
      
      // 确保父窗口永远不显示
      Screenshots.$hiddenParent.setSkipTaskbar(true);
    }
  }
}