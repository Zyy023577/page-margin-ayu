import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { normalizeMemoryResponse, validateAiRequest, validateMemoryRequest } from './serverValidation.mjs';
import { createProvider } from './providers/index.mjs';
import { createApiLimiter, createDailyBudget, createOriginChecker, requestErrorHandler } from './serverSecurity.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(root, '.env'));
const app = express();
app.disable('x-powered-by');
if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
const originAllowed=createOriginChecker();const budget=createDailyBudget();const apiLimiter=createApiLimiter();
app.use((req,res,next)=>{if(!originAllowed(req.headers.origin))return res.status(403).json({error:'该网站来源不允许访问此接口。'});res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');next();});
app.use(cors({origin:(origin,callback)=>callback(null,originAllowed(origin)),methods:['GET','POST'],allowedHeaders:['Content-Type']}));
app.use(express.json({ limit: '128kb' }));
app.use(requestErrorHandler);

app.get('/api/status', (_req, res) => {const provider=createProvider();res.json({ mode: provider.name==='demo'?'demo':'live',provider:provider.name,quota:budget.snapshot() });});
app.post('/api/ai',apiLimiter,async (req, res) => {
  const validation = validateAiRequest(req.body);
  if (!validation.ok) return res.status(400).json({ error: validation.error });
  const provider=createProvider(process.env,req.query.provider==='demo');const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(new Error('生成超时')),Number(process.env.AI_TIMEOUT_MS||45000));let finished=false;
  if(provider.name!=='demo'){const reservation=budget.reserve(budget.estimate(validation.value,700));if(!reservation.ok){clearTimeout(timeout);return res.status(429).json({error:reservation.error});}}
  res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('Cache-Control','no-cache, no-transform');res.setHeader('Connection','keep-alive');res.flushHeaders();
  res.on('close',()=>{if(!finished)controller.abort(new Error('用户已取消'));});
  try{writeEvent(res,'meta',{provider:provider.name,demo:provider.name==='demo'});for await(const event of provider.streamReply(validation.value,{signal:controller.signal})){if(event.type==='delta')writeEvent(res,'delta',{text:event.text});else if(event.type==='result')writeEvent(res,'done',{...event.result,demo:provider.name==='demo'});}finished=true;res.end();}catch(error){if(!res.destroyed){writeEvent(res,'error',{error:controller.signal.aborted?(controller.signal.reason?.message||'生成已取消'):`AI 暂时没有回应：${error.message}`,retryable:true});res.end();}}finally{finished=true;clearTimeout(timeout);}
});

app.post('/api/memory',apiLimiter,async(req,res)=>{
  const validation=validateMemoryRequest(req.body);
  if(!validation.ok)return res.status(400).json({error:validation.error});
  const {chapterLabel,chapterText,notes}=validation.value;
  const memoryKey=process.env.OPENAI_API_KEY||process.env.AI_API_KEY;
  if(!memoryKey)return res.json({demo:true,memory:demoMemory(chapterText,notes)});
  const reservation=budget.reserve(budget.estimate(validation.value,700));if(!reservation.ok)return res.status(429).json({error:reservation.error});
  const base=(process.env.OPENAI_BASE_URL||process.env.AI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'');
  const system='你负责为小说共读生成短期章节记忆。只依据提供的已读章节；明确事实与猜测必须严格分开。输出纯 JSON，字段固定为 facts、characterStates、relationshipChanges、clues、userFocus、hypotheses，每项为简短字符串数组。不要大段复述原文。';
  const prompt=`章节：${chapterLabel}\n已读完的章节正文：${chapterText}\n用户在本章的笔记：${JSON.stringify(notes)}`;
  try{const upstream=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${memoryKey}`},body:JSON.stringify({model:process.env.AI_MODEL||'gpt-5.4-mini',messages:[{role:'system',content:system},{role:'user',content:prompt}],temperature:0.2,max_tokens:700,response_format:{type:'json_object'}})});if(!upstream.ok)throw new Error(`上游服务返回 ${upstream.status}`);const data=await upstream.json();const raw=data.choices?.[0]?.message?.content||'{}';const parsed=JSON.parse(raw.replace(/^```json\s*|\s*```$/g,''));return res.json({demo:false,memory:normalizeMemoryResponse(parsed)});}catch(error){return res.status(502).json({error:`章节记忆生成失败：${error.message}`});}
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

function demoMemory(_text,notes){return normalizeMemoryResponse({facts:['本章已读完（演示模式不生成具体情节摘要）'],userFocus:notes.slice(-5).map(note=>`${note.quote}：${note.content}`),hypotheses:[]});}
function writeEvent(res,event,data){res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);}
function loadEnv(file) { if (!fs.existsSync(file)) return; for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); } }
