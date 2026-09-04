import { createHash } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { normalizeMemoryResponse,validateAiRequest,validateMemoryRequest } from './serverValidation.mjs';

function validRequest(){const chapterReadText='章节开头到当前位置';return{action:'ask',style:'quiet',selectedText:'当前位置',chapterReadText,selectionBefore:'前文',selectionAfter:'少量后文',previousMemory:'',notes:[],noSpoilers:true,boundaryProof:{version:1,source:'epub-cfi',currentCfi:'epubcfi(/6/4!/4/2:5)',chapterHref:'chapter-1.xhtml',contextChars:chapterReadText.length,contextHash:createHash('sha256').update(chapterReadText).digest('hex')}};}

describe('server spoiler boundary validation',()=>{
  it('accepts a consistent CFI-bound request',()=>expect(validateAiRequest(validRequest()).ok).toBe(true));
  it('rejects strict requests without boundary proof',()=>{const body=validRequest();delete (body as any).boundaryProof;expect(validateAiRequest(body)).toMatchObject({ok:false});});
  it('rejects content changed after proof generation',()=>{const body=validRequest();body.chapterReadText+='后文唯一剧透词';expect(validateAiRequest(body)).toMatchObject({ok:false});});
  it('rejects explicit unread chapter fields',()=>expect(validateAiRequest({...validRequest(),nextChapter:'未读章节'}).ok).toBe(false));
  it('rejects oversized or unknown fields',()=>{expect(validateAiRequest({...validRequest(),action:'spoiler'}).ok).toBe(false);expect(validateAiRequest({...validRequest(),selectionAfter:'x'.repeat(501)}).ok).toBe(false);});
  it('rejects oversized note content',()=>expect(validateAiRequest({...validRequest(),notes:[{quote:'句子',content:'x'.repeat(2001)}]}).ok).toBe(false));
});

describe('chapter memory validation',()=>{
  const request={bookId:'book',chapterHref:'chapter-1.xhtml',chapterLabel:'第一章',chapterText:'已经读完的章节正文。',endCfi:'epubcfi(/6/4!/4/2:5)',notes:[]};
  it('accepts completed chapter text with an end CFI',()=>expect(validateMemoryRequest(request).ok).toBe(true));
  it('rejects missing CFI and oversized raw chapter text',()=>{expect(validateMemoryRequest({...request,endCfi:'bad'}).ok).toBe(false);expect(validateMemoryRequest({...request,chapterText:'x'.repeat(30001)}).ok).toBe(false);});
  it('normalizes structured memory and drops unknown fields',()=>expect(normalizeMemoryResponse({facts:[' 确认事实 '],hypotheses:['可能'],rawText:'不保存'})).toEqual({facts:['确认事实'],characterStates:[],relationshipChanges:[],clues:[],userFocus:[],hypotheses:['可能']}));
});
