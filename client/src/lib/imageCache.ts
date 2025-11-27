import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ImageDBSchema extends DBSchema {
  images: {
    key: string;  // Using the URL as the key
    value: {
      blob: Blob;
      timestamp: number;
    };
  };
}

class ImageCache {
  private db: Promise<IDBPDatabase<ImageDBSchema>>;
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias

  constructor() {
    this.db = this.initDB();
  }

  private async initDB() {
    return openDB<ImageDBSchema>('image-cache', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images');
        }
      },
    });
  }

  async get(url: string): Promise<Blob | null> {
    try {
      const db = await this.db;
      const cachedImage = await db.get('images', url);

      if (!cachedImage) {
        return null;
      }

      // Verifica se o cache expirou
      if (Date.now() - cachedImage.timestamp > this.CACHE_DURATION) {
        await this.delete(url);
        return null;
      }

      return cachedImage.blob;
    } catch (error) {
      console.error('Erro ao recuperar imagem do cache:', error);
      return null;
    }
  }

  async set(url: string, blob: Blob) {
    try {
      const db = await this.db;
      await db.put('images', {
        blob,
        timestamp: Date.now(),
      }, url);
    } catch (error) {
      console.error('Erro ao salvar imagem no cache:', error);
    }
  }

  async delete(url: string) {
    try {
      const db = await this.db;
      await db.delete('images', url);
    } catch (error) {
      console.error('Erro ao deletar imagem do cache:', error);
    }
  }

  async clearExpired() {
    try {
      const db = await this.db;
      const keys = await db.getAllKeys('images');
      const entries = await Promise.all(
        keys.map(async (key) => ({
          url: key,
          data: await db.get('images', key)
        }))
      );

      const expiredKeys = entries
        .filter(entry => entry.data && Date.now() - entry.data.timestamp > this.CACHE_DURATION)
        .map(entry => entry.url);

      await Promise.all(expiredKeys.map(key => this.delete(key as string)));
    } catch (error) {
      console.error('Erro ao limpar cache expirado:', error);
    }
  }
}

export const imageCache = new ImageCache();