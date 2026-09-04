export const CONTEXT_LIMITS={chapter:16000,selectionSide:500,selection:2000} as const;

export interface SafeReaderContext{
  selectedText:string;
  chapterReadText:string;
  selectionBefore:string;
  selectionAfter:string;
}

export interface BoundaryProof{
  version:1;
  source:'epub-cfi';
  currentCfi:string;
  chapterHref:string;
  contextChars:number;
  contextHash:string;
}

export function normalizeReaderText(value:string){return value.replace(/\s+/g,' ').trim();}

function textRange(root:Node,start:Range['startContainer'],startOffset:number,end:Range['endContainer'],endOffset:number){
  const range=root.ownerDocument!.createRange();
  range.setStart(start,startOffset);
  range.setEnd(end,endOffset);
  return normalizeReaderText(range.toString());
}

export function extractSafeReaderContext(boundary:Range,selectedText=''):SafeReaderContext{
  const doc=boundary.startContainer.ownerDocument;
  const root=doc?.body||doc?.documentElement;
  if(!doc||!root)throw new Error('当前章节没有可读取的正文。');
  const full=doc.createRange();
  full.selectNodeContents(root);
  const before=textRange(root,full.startContainer,full.startOffset,boundary.startContainer,boundary.startOffset);
  const throughSelection=textRange(root,full.startContainer,full.startOffset,boundary.endContainer,boundary.endOffset);
  const after=textRange(root,boundary.endContainer,boundary.endOffset,full.endContainer,full.endOffset);
  return{
    selectedText:normalizeReaderText(selectedText||boundary.toString()).slice(0,CONTEXT_LIMITS.selection),
    chapterReadText:throughSelection.slice(-CONTEXT_LIMITS.chapter),
    selectionBefore:before.slice(-CONTEXT_LIMITS.selectionSide),
    selectionAfter:after.slice(0,CONTEXT_LIMITS.selectionSide)
  };
}

export async function createBoundaryProof(context:string,currentCfi:string,chapterHref:string):Promise<BoundaryProof>{
  const bytes=new TextEncoder().encode(context);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const contextHash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  return{version:1,source:'epub-cfi',currentCfi,chapterHref,contextChars:context.length,contextHash};
}
