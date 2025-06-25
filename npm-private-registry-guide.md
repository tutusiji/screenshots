# 组件修改、打包与私有 NPM 仓库使用指南

本文档详细记录了如何修改 `react-screenshots` 和 `electron-screenshots` 组件，打包并发布到本地私有 NPM 仓库，以及如何在其他项目中使用这些私有包的完整流程。

## 目录

- [环境准备](#环境准备)
- [组件修改](#组件修改)
- [设置本地私有 NPM 仓库](#设置本地私有-npm-仓库)
- [打包与发布](#打包与发布)
- [解决发布问题](#解决发布问题)
- [在其他项目中使用私有包](#在其他项目中使用私有包)
- [常见问题与解决方案](#常见问题与解决方案)

## 环境准备

### 安装必要工具

1. **安装 Node.js 和 npm**

   确保你已安装 Node.js 和 npm。可以通过以下命令检查版本：

   ```bash
   node -v
   npm -v
   ```

2. **安装 Verdaccio（本地私有 NPM 仓库）**

   ```bash
   npm install -g verdaccio
   ```

3. **安装 Lerna（可选，用于管理多包项目）**

   ```bash
   npm install -g lerna
   ```

## 组件修改

### 修改 react-screenshots 组件

1. **进入 react-screenshots 目录**

   ```bash
   cd packages/react-screenshots
   ```

2. **修改代码**

   根据需求修改组件代码，例如添加新功能、修复 bug 等。

3. **更新版本号**

   修改 `package.json` 文件中的版本号，或使用命令自动更新：

   ```bash
   npm version patch --no-git-tag-version  # 小版本更新
   # 或
   npm version minor --no-git-tag-version  # 中版本更新
   # 或
   npm version major --no-git-tag-version  # 大版本更新
   ```

   也可以直接编辑 `package.json` 文件，手动设置版本号，例如：

   ```json
   {
     "name": "react-screenshots",
     "version": "1.1.2",
     ...
   }
   ```

### 修改 electron-screenshots 组件

1. **进入 electron-screenshots 目录**

   ```bash
   cd packages/electron-screenshots
   ```

2. **修改代码**

   根据需求修改组件代码。

3. **更新对 react-screenshots 的依赖**

   如果 react-screenshots 版本有更新，需要同步更新 electron-screenshots 中对它的依赖版本：

   ```json
   {
     "dependencies": {
       "react-screenshots": "^1.1.2"
     }
   }
   ```

4. **更新版本号**

   与 react-screenshots 类似，更新 electron-screenshots 的版本号。

## 设置本地私有 NPM 仓库

### 启动 Verdaccio

1. **启动服务**

   ```bash
   verdaccio
   ```

   默认情况下，Verdaccio 会在 `http://localhost:4873/` 启动一个私有 NPM 仓库。

2. **配置 NPM 使用本地仓库**

   可以临时指定仓库：

   ```bash
   npm --registry http://localhost:4873/ [command]
   ```

   或设置默认仓库（不推荐全局设置，建议仅在项目中设置）：

   ```bash
   npm config set registry http://localhost:4873/
   ```

### 创建用户并登录

1. **创建新用户**

   ```bash
   npm adduser --registry http://localhost:4873/
   ```

   按提示输入用户名、密码和邮箱。

2. **验证登录状态**

   ```bash
   npm whoami --registry http://localhost:4873/
   ```

   如果显示你的用户名，说明登录成功。

## 打包与发布

### 配置包的发布仓库

在每个包的 `package.json` 文件中添加 `publishConfig` 字段：

```json
{
  "publishConfig": {
    "registry": "http://localhost:4873/"
  }
}
```

### 打包并发布 react-screenshots

1. **构建包**

   ```bash
   cd packages/react-screenshots
   npm run build
   ```

2. **发布包**

   ```bash
   npm publish --registry http://localhost:4873/
   ```

### 打包并发布 electron-screenshots

1. **构建包**

   ```bash
   cd packages/electron-screenshots
   npm run build
   ```

2. **发布包**

   ```bash
   npm publish --registry http://localhost:4873/
   ```

## 解决发布问题

### 常见发布错误及解决方案

1. **ENEEDAUTH 错误**

   错误信息：
   ```
   npm ERR! code ENEEDAUTH
   npm ERR! need auth This command requires you to be logged in.
   npm ERR! need auth You need to authorize this machine using `npm adduser`
   ```

   解决方案：
   - 确保已登录到正确的仓库：
     ```bash
     npm adduser --registry http://localhost:4873/
     ```
   - 验证登录状态：
     ```bash
     npm whoami --registry http://localhost:4873/
     ```
   - 检查网络连接：
     ```bash
     npm ping --registry http://localhost:4873/
     ```

2. **版本冲突错误**

   错误信息：
   ```
   npm ERR! 403 Forbidden - PUT http://localhost:4873/[package] - you cannot publish over the previously published versions
   ```

   解决方案：
   - 更新包的版本号：
     ```bash
     npm version patch --no-git-tag-version
     ```
   - 或手动修改 `package.json` 中的版本号

3. **依赖问题**

   如果发布的包依赖于其他本地包，确保先发布依赖包，再发布依赖它的包。例如，先发布 `react-screenshots`，再发布依赖它的 `electron-screenshots`。

### 验证发布是否成功

```bash
npm view [package-name] --registry http://localhost:4873/
```

例如：

```bash
npm view react-screenshots --registry http://localhost:4873/
npm view electron-screenshots --registry http://localhost:4873/
```

## 在其他项目中使用私有包

### 配置项目使用私有仓库

1. **创建或修改项目根目录下的 `.npmrc` 文件**

   ```
   registry=http://localhost:4873/
   ```

   或者使用命令：

   ```bash
   npm config set registry http://localhost:4873/ --location project

   ```

2. **安装私有包**

   ```bash
   npm install react-screenshots electron-screenshots
   npm install react-screenshots@1.1.5 electron-screenshots@1.1.5 --registry http://localhost:4873/
   npm install react-screenshots@1.1.5 --registry http://localhost:4873/
   ```

   或在 `package.json` 中指定依赖：

   ```json
   {
     "dependencies": {
       "react-screenshots": "^1.1.2",
       "electron-screenshots": "^1.1.2"
     }
   }
   ```

   然后运行：

   ```bash
   npm install
   ```

### 混合使用公共包和私有包

如果项目同时需要使用公共 NPM 仓库和私有仓库的包，可以使用 scope 或配置特定包的仓库：

1. **使用 scope（推荐）**

   首先，将私有包重命名为带 scope 的形式，例如 `@mycompany/react-screenshots`。

   然后在 `.npmrc` 中配置：

   ```
   @mycompany:registry=http://localhost:4873/
   registry=https://registry.npmjs.org/
   ```

2. **配置特定包的仓库**

   ```
   registry=https://registry.npmjs.org/
   react-screenshots:registry=http://localhost:4873/
   electron-screenshots:registry=http://localhost:4873/
   ```

## 常见问题与解决方案

### 1. 无法连接到本地仓库

- 确保 Verdaccio 服务正在运行
- 检查防火墙设置
- 尝试使用 `npm ping --registry http://localhost:4873/` 测试连接

### 2. 包安装后找不到或版本不正确

- 清除 npm 缓存：`npm cache clean --force`
- 删除 `node_modules` 目录并重新安装：`rm -rf node_modules && npm install`
- 确认安装时使用了正确的仓库地址

### 3. 发布时权限问题

- 确保已正确登录：`npm whoami --registry http://localhost:4873/`
- 检查包的所有权：在 Verdaccio Web 界面查看包的所有者
- 如果使用了 scope，确保 scope 配置正确

### 4. 在生产环境中使用私有仓库

对于生产环境，建议：

- 使用更稳定的私有 NPM 仓库解决方案，如 Nexus、Artifactory 等
- 配置 CI/CD 流程自动发布包
- 使用 Docker 容器化 Verdaccio 以提高可靠性

---

本文档提供了一个完整的工作流程，从修改组件到发布到私有 NPM 仓库，再到在其他项目中使用这些私有包。根据实际需求，可能需要调整某些步骤或配置。