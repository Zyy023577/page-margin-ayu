# 页边的阿屿

一个本地优先的 AI 共读小说应用。上传 EPUB 后，原书、阅读进度、样式、个人笔记与页边批注都保存在当前浏览器的 IndexedDB 中。AI 只通过服务端接口接收本次回答所需的最少文本；未配置 API 时会自动进入有明确标记的演示模式。

## 启动

需要 Node.js 20 或更高版本。

```bash
pnpm install
pnpm dev
```

然后打开 http://localhost:5173 。也可使用 `npm install && npm run dev`。

## 配置 AI（可选）

复制 `.env.example` 为 `.env`。使用 OpenAI Responses API：

```env
OPENAI_API_KEY=你的密钥
AI_MODEL=gpt-5.4-mini
```

也可以设置 `AI_PROVIDER=compatible`、`AI_API_KEY` 和 `AI_BASE_URL`，连接兼容 OpenAI Chat Completions 的服务。密钥始终只从服务端环境变量读取。

生产部署还必须设置 `ALLOWED_ORIGINS`。服务端默认按每分钟 20 次、每天 200 次、每天 5 美元的保守预算限制模型请求；这些值可通过 `.env.example` 中的变量调整。每日计数保存在当前服务进程内，多实例部署应将预算计数替换为共享 Redis/KV 存储，并在模型平台同时设置项目级预算作为最终保险。

留空不会影响上传、阅读、进度保存和个人笔记，只会使用“演示批注模式”。密钥只存在服务端环境变量中，不会进入浏览器代码。

## 构建与预览

```bash
pnpm build
pnpm preview
```

## 隐私边界

- EPUB 原文件不上传，保存在浏览器 IndexedDB。
- AI 请求只包含选中文字、已读上下文、此前章节的短记忆与相关笔记。
- 前端不包含 API Key。
- 严格禁止剧透默认开启；服务端提示词再次执行边界约束。
- 服务端不记录请求正文，并限制来源、请求体大小、调用频率、每日调用量和估算费用。

## 当前能力

EPUB 上传与元数据/封面/目录解析、书架、分页或滚动、章节跳转、键盘翻页、全屏、三种主题、字号/行距/页边距、自动进度恢复、CFI 绑定笔记与 AI 批注、章节记忆、四种陪读风格、流式 AI 回答、取消与超时、失败重试和演示模式回退。
