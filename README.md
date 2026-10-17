# 页边的阿屿

一个本地优先的 AI 共读小说应用：把书放在自己的浏览器里，在真正读到的段落旁边提问、做笔记，并让阿屿记住已经读完的章节。

导入 EPUB、TXT 或 Markdown 后，书籍、阅读进度、阅读设置、个人笔记和页边批注默认保存在当前浏览器的 IndexedDB 中。AI 请求由本地服务端转发，只携带回答当前问题所需的有限上下文；没有配置 API Key 时，会自动使用明确标记的演示批注模式。

## 功能

- EPUB 阅读：解析书名、作者、封面和目录，支持章节跳转、分页/滚动阅读、键盘翻页和全屏。
- 文本阅读：导入 `.txt`、`.md` 或 `.markdown` 文件，自动识别标题、段落、引用、列表、代码块和目录。
- 阅读体验：三种主题、字号、行距、页边距、自动恢复进度，以及适配手机的左右滑动翻页。
- 页边记录：选中文字后可以保存个人笔记，或请求阿屿进行批注；笔记和 AI 回答都能跳回原文位置。
- 共读上下文：支持四种陪读风格、严格禁止剧透、流式回答、停止生成、失败重试和演示模式回退。
- 章节记忆：读完章节后保存短结构化记忆，将确认事实、人物状态、线索、用户关注点和猜测分开保存，不保存整章原文。
- 服务端防护：请求校验、阅读边界证明、来源限制、请求体大小限制、频率限制和每日调用/费用上限。

## 快速开始

需要 Node.js 20 或更高版本，并建议使用 pnpm。

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:5173>，然后从书架导入 EPUB、TXT 或 Markdown 文件。

也可以使用 npm：

```bash
npm install
npm run dev
```

## 配置 AI（可选）

复制 `.env.example` 为 `.env`。不填写密钥也可以完整使用导入、阅读、进度保存和个人笔记功能。

### OpenAI Responses API

```env
OPENAI_API_KEY=你的密钥
AI_MODEL=gpt-5.4-mini
```

### 兼容 Chat Completions 的服务

```env
AI_PROVIDER=compatible
AI_API_KEY=你的密钥
AI_BASE_URL=https://example.com/v1
AI_MODEL=你的模型名
```

密钥只从服务端环境变量读取，不会进入浏览器代码。生产部署时还应设置实际前端来源的 `ALLOWED_ORIGINS`；请求频率、每日调用次数、每日费用上限等配置均可在 `.env.example` 中调整。

## 隐私与剧透边界

- 导入的原文件默认不上传，保存在当前浏览器的 IndexedDB 中。
- AI 请求只包含选中文字、已读上下文、已完成章节的短记忆和相关笔记。
- 服务端不会记录 AI 请求正文，并会校验阅读边界，避免把未读章节内容混入请求。
- AI 回答会标记演示结果和猜测内容；严格禁止剧透默认开启。
- 清除浏览器站点数据会删除本地书籍、进度和笔记，请在清理前自行备份重要内容。

## 桌面版本

项目包含 Electron 入口，可以在 Windows 上运行桌面版本：

```bash
pnpm desktop
```

构建 Windows 安装包：

```bash
pnpm package:win
```

首次运行桌面版本时，可以在应用提示的位置填写 AI 配置；也可以使用项目中的 `.env.example` 作为配置模板。请勿将真实密钥提交到 Git。

## 开发与验证

```bash
pnpm test
pnpm build
```

测试覆盖阅读上下文和剧透边界、文本/Markdown 导入、IndexedDB 持久化、移动端手势、SSE 流式回答、AI Provider 选择、章节记忆，以及服务端安全限制。

## 项目结构

```text
src/                 React 阅读器、IndexedDB、文本解析和客户端流式响应
providers/           OpenAI、兼容服务和演示模式 Provider
server.mjs           本地开发/生产服务端与 AI 接口
serverValidation.mjs 请求结构和阅读边界校验
serverSecurity.mjs   来源、频率和预算限制
electron/            Electron 桌面入口
```

## 技术栈

React · TypeScript · Vite · epub.js · Dexie · Express · Vitest · Electron

## 许可

当前仓库未声明开源许可证。如需在其他项目中分发或再利用，请先确认仓库所有者的授权范围。
