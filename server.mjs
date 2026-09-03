import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(root, '.env'));
const app = express();
app.use(cors());
app.use(express.json({ limit: '300kb' }));

app.get('/api/status', (_req, res) => res.json({ mode: process.env.AI_API_KEY ? 'live' : 'demo' }));
app.post('/api/ai', async (req, res) => {
  const { action, selectedText = '', contextBefore = '', previousMemory = '', style = 'quiet', noSpoilers = true, notes = [] } = req.body || {};
  if (!selectedText.trim() && !contextBefore.trim()) return res.status(400).json({ error: '请先选择一段文字，或读完当前章节后再来聊聊。' });
  if (!process.env.AI_API_KEY) return res.json({ demo: true, content: demoReply(action, selectedText, style, notes) });
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const system = `你叫阿屿，是熟悉、克制、自然的共读搭子。风格：${style}。${noSpoilers ? '严格禁止剧透：只能使用给出的已读内容，不得推测成事实，不得透露后文。' : '仍然只根据提供的内容回答。'}不要使用“这段文字体现了”等语文老师式模板。回答简洁、有温度。`;
  const prompt = `用户动作：${action}\n选中文字：${selectedText}\n当前章节读到这里之前：${contextBefore.slice(-12000)}\n此前章节记忆：${previousMemory.slice(-3000)}\n相关笔记：${JSON.stringify(notes).slice(0, 2000)}`;
  try {
    const upstream = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` }, body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.8, max_tokens: 500 }) });
    if (!upstream.ok) throw new Error(`上游服务返回 ${upstream.status}`);
    const data = await upstream.json();
    res.json({ demo: false, content: data.choices?.[0]?.message?.content || '阿屿刚才走神了，再问一次好吗？' });
  } catch (error) { res.status(502).json({ error: `AI 暂时没有回应：${error.message}` }); }
});

if (process.argv.includes('--production')) {
  app.use(express.static(path.join(root, 'dist')));
  app.use((_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
} else {
  const vite = await createViteServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 5173);
app.listen(port, () => console.log(`页边的阿屿已启动：http://localhost:${port}`));

function demoReply(action, text, style, notes = []) {
  const quote = text.trim().slice(0, 42);
  const variants = {
    explain: `这句话可以先这样读：它表面写的是“${quote}”，真正拧着劲儿的地方，是人物没有直接说出口的那一层。`,
    psychology: `我感觉这里的人物正在努力维持平静，但动作比话更诚实。先别急着替 TA 下结论，我们只看到这里。`,
    discuss: `读到这里，我最在意的是人物之间那点没说破的默契。你更相信这是靠近，还是一次礼貌的退让？`,
    ask: `我的第一反应是：这句值得停一下。它可能不是答案，更像作者悄悄放在桌边的一枚线索——但我们只读到这里，不往后猜成事实。`
  };
  const tone = style === 'snarky' ? '（阿屿小声：嘴上没事，细节可完全不是这么说的。）\n' : style === 'emotion' ? '这一刻有点让人心里发紧。\n' : style === 'literary' ? '句子的节奏在这里忽然慢了下来。\n' : '';
  const alternatives = {
    quiet: ['这里值得稍微停一下。', '我先不急着替它下结论。', '这句话在页边轻轻拽了我一下。'],
    snarky: ['嘴上挺平静，细节可没答应。', '话说得滴水不漏，动作已经全招了。', '表面很懂事，背地里可忙得很。'],
    literary: ['这句的节奏忽然收紧了。', '真正的重音藏在了句尾。', '没有直说，反而留出了一小块回声。'],
    emotion: ['心里像被轻轻按了一下。', '没说出口的情绪，比对白更响。', '人物在忍，可犹豫还是漏出来了。']
  };
  const seed = [...`${action}|${style}|${text}|${notes.length}`].reduce((n, c) => (n * 33 + c.charCodeAt(0)) >>> 0, 5381);
  const opening = (alternatives[style] || alternatives.quiet)[seed % 3];
  return `${opening} ${tone}${variants[action] || variants.ask}`;
}
function loadEnv(file) { if (!fs.existsSync(file)) return; for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); } }
