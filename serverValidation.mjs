import crypto from 'node:crypto';

export const ACTIONS=new Set(['ask','explain','psychology','discuss']);
export const STYLES=new Set(['quiet','snarky','literary','emotion']);
const limits={selectedText:2000,chapterReadText:16000,selectionBefore:500,selectionAfter:500,previousMemory:3000,notes:8};

export function validateAiRequest(body){
  if(!body||typeof body!=='object'||Array.isArray(body))return{ok:false,error:'请求格式无效。'};
  const action=string(body.action);const style=string(body.style||'quiet');
  if(!ACTIONS.has(action))return{ok:false,error:'不支持的操作。'};
  if(!STYLES.has(style))return{ok:false,error:'不支持的陪读风格。'};
  for(const field of ['selectedText','chapterReadText','selectionBefore','selectionAfter','previousMemory']){
    if(typeof (body[field]??'')!=='string')return{ok:false,error:`字段 ${field} 格式无效。`};
    if((body[field]||'').length>limits[field])return{ok:false,error:`字段 ${field} 超出长度限制。`};
  }
  if(!Array.isArray(body.notes)||body.notes.length>limits.notes)return{ok:false,error:'相关笔记数量超出限制。'};
  for(const note of body.notes){
    if(!note||typeof note!=='object'||typeof note.quote!=='string'||typeof note.content!=='string'||note.quote.length>1000||note.content.length>2000||('chapter' in note&&typeof note.chapter!=='string'))return{ok:false,error:'相关笔记格式或长度无效。'};
  }
  if(!string(body.selectedText).trim()&&!string(body.chapterReadText).trim())return{ok:false,error:'没有可用的已读内容。'};
  if(body.noSpoilers!==false){
    const proof=body.boundaryProof;
    if(!proof||proof.version!==1||proof.source!=='epub-cfi'||!string(proof.currentCfi).startsWith('epubcfi(')||string(proof.currentCfi).length>1000||!string(proof.chapterHref)||string(proof.chapterHref).length>1000||!Number.isInteger(proof.contextChars)||!(/^[a-f0-9]{64}$/).test(string(proof.contextHash)))return{ok:false,error:'禁止剧透模式需要有效的 EPUB CFI 阅读边界。'};
    const context=string(body.chapterReadText);
    const hash=crypto.createHash('sha256').update(context).digest('hex');
    if(proof.contextChars!==context.length||proof.contextHash!==hash)return{ok:false,error:'已读内容与 CFI 边界证明不一致。'};
    for(const forbidden of ['fullChapter','chapterAfter','unreadText','nextChapter'])if(forbidden in body)return{ok:false,error:'禁止剧透模式不接受未读正文字段。'};
  }
  return{ok:true,value:{action,style,selectedText:string(body.selectedText),chapterReadText:string(body.chapterReadText),selectionBefore:string(body.selectionBefore),selectionAfter:string(body.selectionAfter),previousMemory:string(body.previousMemory),notes:body.notes,noSpoilers:body.noSpoilers!==false,boundaryProof:body.boundaryProof}};
}

function string(value){return typeof value==='string'?value:'';}
