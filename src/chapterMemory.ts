import type { ChapterMemory } from './db';
import { normalizeReaderText } from './readerContext';

export const MEMORY_FIELDS=['facts','characterStates','relationshipChanges','clues','userFocus','hypotheses'] as const;
export type MemoryContent=Pick<ChapterMemory,(typeof MEMORY_FIELDS)[number]>;

export function normalizeMemory(value:unknown):MemoryContent{
  const input=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;
  return Object.fromEntries(MEMORY_FIELDS.map(field=>[field,cleanList(input[field])])) as unknown as MemoryContent;
}

export function formatChapterMemories(memories:ChapterMemory[],maxChars=3000){
  const ordered=[...memories].sort((a,b)=>a.completedAt-b.completedAt);
  const text=ordered.map(memory=>{
    const sections=[
      ['明确事实',memory.facts],['人物状态',memory.characterStates],['关系变化',memory.relationshipChanges],
      ['已出现线索',memory.clues],['用户关注点',memory.userFocus],['尚未确认的猜测',memory.hypotheses]
    ].filter(([,items])=>(items as string[]).length).map(([label,items])=>`${label}：${(items as string[]).join('；')}`).join('\n');
    return `【${memory.chapterLabel}】\n${sections}`;
  }).join('\n\n');
  return text.slice(-maxChars);
}

export function trimCompletedChapterText(text:string,maxChars=30000){
  const clean=normalizeReaderText(text);
  if(clean.length<=maxChars)return clean;
  const half=Math.floor((maxChars-20)/2);
  return `${clean.slice(0,half)} …[中段已省略]… ${clean.slice(-half)}`;
}

function cleanList(value:unknown){
  if(!Array.isArray(value))return[];
  return value.filter(item=>typeof item==='string').map(item=>normalizeReaderText(item).slice(0,300)).filter(Boolean).slice(0,8);
}
