import Dexie, { type Table } from 'dexie';
export interface BookRecord { id: string; title: string; author: string; cover?: string; file: Blob; addedAt: number; progress: number; location?: string; toc?: { label: string; href: string }[]; }
export interface Annotation { id?: number; bookId: string; cfi: string; quote: string; content: string; kind: 'note' | 'ai'; demo?: boolean; chapter?: string; createdAt: number; }
export interface Setting { bookId: string; fontSize: number; lineHeight: number; margin: number; theme: 'light'|'sepia'|'dark'; style: string; noSpoilers: boolean; flow: 'paginated'|'scrolled-doc'; }
class AyuDB extends Dexie { books!: Table<BookRecord, string>; annotations!: Table<Annotation, number>; settings!: Table<Setting, string>; constructor(){ super('page-margin-ayu'); this.version(1).stores({ books:'id,addedAt', annotations:'++id,bookId,cfi,createdAt', settings:'bookId' }); } }
export const db = new AyuDB();
