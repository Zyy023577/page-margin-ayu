import { describe,expect,it } from 'vitest';
import { formatChapterMemories,normalizeMemory,trimCompletedChapterText } from './chapterMemory';
import type { ChapterMemory } from './db';

describe('chapter memory',()=>{
  it('keeps confirmed facts separate from unconfirmed hypotheses',()=>{
    const memory=normalizeMemory({facts:['阿禾已经离开车站'],hypotheses:['阿禾也许隐瞒了信件'],clues:['蓝色信封']});
    expect(memory.facts).toEqual(['阿禾已经离开车站']);
    expect(memory.hypotheses).toEqual(['阿禾也许隐瞒了信件']);
  });

  it('formats summaries without requiring original chapter text',()=>{
    const memory:ChapterMemory={id:'b:c1',bookId:'b',chapterHref:'c1.xhtml',chapterLabel:'第一章',completedAt:1,endCfi:'epubcfi(/6/2)',facts:['阿禾抵达小岛'],characterStates:['阿禾很警惕'],relationshipChanges:[],clues:['蓝色信封'],userFocus:['信是谁寄的'],hypotheses:['寄信人可能认识阿禾']};
    const formatted=formatChapterMemories([memory]);
    expect(formatted).toContain('明确事实：阿禾抵达小岛');
    expect(formatted).toContain('尚未确认的猜测：寄信人可能认识阿禾');
    expect(memory).not.toHaveProperty('chapterText');
  });

  it('bounds transient completed-chapter text while preserving both ends',()=>{
    const text=`开头线索${'中'.repeat(100)}结尾事件`;
    const trimmed=trimCompletedChapterText(text,40);
    expect(trimmed).toContain('开头线索');
    expect(trimmed).toContain('结尾事件');
    expect(trimmed.length).toBeLessThanOrEqual(40);
  });
});
