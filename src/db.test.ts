import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, deleteBookData, storageErrorMessage, type BookRecord } from './db';

beforeEach(()=>db.open());
afterEach(()=>db.delete());

describe('reading data persistence',()=>{
  it('stores cover artwork as a Blob',async()=>{
    const record:BookRecord={id:'book-1',title:'测试书',author:'作者',cover:new Blob(['cover'],{type:'image/png'}),file:new Blob(['epub'],{type:'application/epub+zip'}),addedAt:1,progress:0};
    await db.books.put(record);

    const saved=await db.books.get(record.id);
    expect(saved?.cover).toBeInstanceOf(Blob);
    expect(await saved?.cover?.text()).toBe('cover');
  });

  it('deletes the book, its annotations, and its settings in one operation',async()=>{
    await db.books.put({id:'book-2',title:'测试书',author:'作者',file:new Blob(['epub']),addedAt:1,progress:42,location:'epubcfi(/6/2)'});
    await db.annotations.add({bookId:'book-2',cfi:'epubcfi(/6/2)',quote:'一句话',content:'一条笔记',kind:'note',createdAt:1});
    await db.settings.put({bookId:'book-2',fontSize:18,lineHeight:1.9,margin:12,theme:'sepia',style:'quiet',noSpoilers:true,flow:'paginated'});
    await db.chapterMemories.put({id:'book-2:chapter-1',bookId:'book-2',chapterHref:'chapter-1.xhtml',chapterLabel:'第一章',completedAt:1,endCfi:'epubcfi(/6/2)',facts:['事实'],characterStates:[],relationshipChanges:[],clues:[],userFocus:[],hypotheses:[]});

    await deleteBookData('book-2');

    expect(await db.books.get('book-2')).toBeUndefined();
    expect(await db.annotations.where('bookId').equals('book-2').count()).toBe(0);
    expect(await db.settings.get('book-2')).toBeUndefined();
    expect(await db.chapterMemories.where('bookId').equals('book-2').count()).toBe(0);
  });

  it('stores only a short structured chapter memory, never chapter text',async()=>{
    await db.chapterMemories.put({id:'book-3:chapter-1',bookId:'book-3',chapterHref:'chapter-1.xhtml',chapterLabel:'第一章',completedAt:1,endCfi:'epubcfi(/6/2)',facts:['人物抵达小岛'],characterStates:['仍然警惕'],relationshipChanges:[],clues:['蓝色信封'],userFocus:[],hypotheses:['寄信人身份未知']});
    const saved=await db.chapterMemories.get('book-3:chapter-1');
    expect(saved).not.toHaveProperty('chapterText');
    expect(saved?.facts).toEqual(['人物抵达小岛']);
  });

  it('gives actionable messages for quota and damaged data failures',()=>{
    expect(storageErrorMessage(new DOMException('full','QuotaExceededError'))).toContain('空间不足');
    expect(storageErrorMessage(new Error('broken'),'read')).toContain('无法读取');
  });
});
