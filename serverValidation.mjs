import crypto from 'node:crypto';
import { z } from 'zod';

export const ACTIONS=['ask','explain','psychology','discuss'];
export const STYLES=['quiet','snarky','literary','emotion'];

const noteSchema=z.object({quote:z.string().max(1000),content:z.string().max(2000),chapter:z.string().max(300).optional()}).strict();
const recentAnnotationSchema=z.object({kind:z.enum(['note','ai']),content:z.string().max(2000)}).strict();
const boundarySchema=z.object({version:z.literal(1),source:z.literal('epub-cfi'),currentCfi:z.string().max(1000).startsWith('epubcfi('),chapterHref:z.string().min(1).max(1000),contextChars:z.number().int().nonnegative().max(16000),contextHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const aiRequestSchema=z.object({
  action:z.enum(ACTIONS),style:z.enum(STYLES).default('quiet'),selectedText:z.string().max(2000).default(''),chapterReadText:z.string().max(16000).default(''),selectionBefore:z.string().max(500).default(''),selectionAfter:z.string().max(500).default(''),previousMemory:z.string().max(3000).default(''),notes:z.array(noteSchema).max(8),recentAnnotations:z.array(recentAnnotationSchema).max(8).default([]),noSpoilers:z.boolean().default(true),boundaryProof:boundarySchema.optional()
}).strict().superRefine((value,ctx)=>{
  if(!value.selectedText.trim()&&!value.chapterReadText.trim())ctx.addIssue({code:'custom',message:'没有可用的已读内容。'});
  if(value.noSpoilers){
    if(!value.boundaryProof){ctx.addIssue({code:'custom',message:'禁止剧透模式需要有效的 EPUB CFI 阅读边界。'});return;}
    const hash=crypto.createHash('sha256').update(value.chapterReadText).digest('hex');
    if(value.boundaryProof.contextChars!==value.chapterReadText.length||value.boundaryProof.contextHash!==hash)ctx.addIssue({code:'custom',message:'已读内容与 CFI 边界证明不一致。'});
  }
});

const memoryRequestSchema=z.object({bookId:z.string().min(1).max(100),chapterHref:z.string().min(1).max(1000),chapterLabel:z.string().min(1).max(300),chapterText:z.string().min(1).max(30000),endCfi:z.string().max(1000).startsWith('epubcfi('),notes:z.array(noteSchema.pick({quote:true,content:true})).max(20)}).strict();

export function validateAiRequest(body){return result(aiRequestSchema.safeParse(body),'请求字段无效。');}
export function validateMemoryRequest(body){return result(memoryRequestSchema.safeParse(body),'章节记忆请求字段无效。');}

export function normalizeMemoryResponse(value){
  const input=value&&typeof value==='object'?value:{};
  const fields=['facts','characterStates','relationshipChanges','clues','userFocus','hypotheses'];
  return Object.fromEntries(fields.map(field=>[field,Array.isArray(input[field])?input[field].filter(item=>typeof item==='string').map(item=>item.replace(/\s+/g,' ').trim().slice(0,300)).filter(Boolean).slice(0,8):[]]));
}

function result(parsed,fallback){if(parsed.success)return{ok:true,value:parsed.data};return{ok:false,error:parsed.error.issues.find(issue=>issue.code==='custom')?.message||fallback};}
