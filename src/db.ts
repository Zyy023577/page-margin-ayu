import Dexie, { type Table } from 'dexie';
export interface BookRecord { id: string; title: string; author: string; cover?: Blob; file: Blob; addedAt: number; progress: number; location?: string; toc?: { label: string; href: string }[]; }
export interface Annotation { id?: number; bookId: string; cfi: string; quote: string; content: string; kind: 'note' | 'ai'; demo?: boolean; chapter?: string; createdAt: number; }
export interface Setting { bookId: string; fontSize: number; lineHeight: number; margin: number; theme: 'light'|'sepia'|'dark'; style: string; noSpoilers: boolean; flow: 'paginated'|'scrolled-doc'; }
export interface ChapterMemory { id:string; bookId:string; chapterHref:string; chapterLabel:string; completedAt:number; endCfi:string; facts:string[]; characterStates:string[]; relationshipChanges:string[]; clues:string[]; userFocus:string[]; hypotheses:string[]; }
class AyuDB extends Dexie { books!: Table<BookRecord, string>; annotations!: Table<Annotation, number>; settings!: Table<Setting, string>; chapterMemories!:Table<ChapterMemory,string>; constructor(){ super('page-margin-ayu'); this.version(1).stores({ books:'id,addedAt', annotations:'++id,bookId,cfi,createdAt', settings:'bookId' }); this.version(2).stores({ books:'id,addedAt', annotations:'++id,bookId,cfi,createdAt', settings:'bookId' }).upgrade(tx=>tx.table('books').toCollection().modify(book=>{if(typeof book.cover==='string')delete book.cover;})); this.version(3).stores({books:'id,addedAt',annotations:'++id,bookId,cfi,createdAt',settings:'bookId',chapterMemories:'id,bookId,chapterHref,completedAt'}); } }
export const db = new AyuDB();

export async function deleteBookData(bookId:string){
  await db.transaction('rw',db.books,db.annotations,db.settings,db.chapterMemories,async()=>{
    await db.annotations.where('bookId').equals(bookId).delete();
    await db.chapterMemories.where('bookId').equals(bookId).delete();
    await db.settings.delete(bookId);
    await db.books.delete(bookId);
  });
}

export function storageErrorMessage(error:unknown,operation:'save'|'read'='save'){
  const value=error as {name?:string;message?:string};
  if(value?.name==='QuotaExceededError')return '浏览器本地存储空间不足。请删除不再阅读的书籍，或释放浏览器空间后重试。';
  if(operation==='read')return '这本书无法读取，文件可能已损坏或本地数据不完整。你可以返回书架后重新导入。';
  return '这本书没能保存。请确认文件完整，并检查浏览器是否允许本地存储。';
}
