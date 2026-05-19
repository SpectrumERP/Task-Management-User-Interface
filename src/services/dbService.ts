import { openDB, IDBPDatabase } from 'idb';
import { cryptoService } from './cryptoService';

const DB_NAME = 'TaskFlowDB';
const STORE_NAME = 'secure_storage';
const DB_VERSION = 1;

class DBService {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  async setItem(key: string, value: any): Promise<void> {
    const db = await this.db;
    const encrypted = cryptoService.encrypt(value);
    await db.put(STORE_NAME, encrypted, key);
  }

  async getItem<T>(key: string): Promise<T | null> {
    const db = await this.db;
    const encrypted = await db.get(STORE_NAME, key);
    if (!encrypted) return null;
    return cryptoService.decrypt<T>(encrypted);
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.db;
    await db.delete(STORE_NAME, key);
  }

  async clear(): Promise<void> {
    const db = await this.db;
    await db.clear(STORE_NAME);
  }
}

export const dbService = new DBService();
