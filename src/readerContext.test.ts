import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { createBoundaryProof, extractSafeReaderContext } from './readerContext';

function rangeAround(marker:string,html:string){
  const dom=new JSDOM(`<body><p>${html}</p></body>`);
  const text=dom.window.document.querySelector('p')!.firstChild!;
  const source=text.textContent!;
  const start=source.indexOf(marker);
  const range=dom.window.document.createRange();
  range.setStart(text,start);
  range.setEnd(text,start+marker.length);
  return range;
}

describe('spoiler-safe reader context',()=>{
  it('never includes a unique word after the current reading boundary',()=>{
    const range=rangeAround('读到这里','章节开头。人物走进雨里。读到这里。后半部分唯一测试词_SPOILER_7391。结尾。');
    const context=extractSafeReaderContext(range,'读到这里');
    expect(context.chapterReadText).toContain('章节开头');
    expect(context.chapterReadText).toContain('读到这里');
    expect(context.chapterReadText).not.toContain('唯一测试词_SPOILER_7391');
  });

  it('keeps only a small selection-side window and does not mix another chapter',()=>{
    const range=rangeAround('选择句','本章开头。选择句。周围文字。');
    const context=extractSafeReaderContext(range,'选择句');
    expect(context.selectionBefore).toContain('本章开头');
    expect(context.selectionAfter).toContain('周围文字');
    expect(context.chapterReadText).not.toContain('下一章秘密');
  });

  it('binds the exact context length and hash to its CFI proof',async()=>{
    const proof=await createBoundaryProof('只读到这里','epubcfi(/6/4!/4/2:5)','chapter-1.xhtml');
    expect(proof.contextChars).toBe(5);
    expect(proof.contextHash).toMatch(/^[a-f0-9]{64}$/);
    expect(proof.currentCfi).toContain('epubcfi');
  });
});
