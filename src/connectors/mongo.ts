import 'server-only'
import type { DbConnector } from './base';
import type { SchemaIR, TableIR, ColumnIR } from '@/ir/types';

export interface MongoConfig {
  uri: string;
  database: string;
}

/**
 * MongoConnector, MongoDB'den şema ve veri çekmek için basit bir adaptör.
 * MongoDB şemasız bir veritabanı olduğundan, şema çıkarımı için örnek dokümanlar kullanılır.
 */
export class MongoConnector implements DbConnector {
  private client: any;
  private db?: any;
  private config: MongoConfig;
  constructor(config: MongoConfig) {
    this.config = config;
    // Defer driver load to runtime to avoid bundling error if dependency is missing
    this.client = null;
  }
  async connect() {
    let mongoModule: any;
    try {
      mongoModule = await import('mongodb');
    } catch (err: any) {
      const help = 'MongoDB sürücüsü bulunamadı. Lütfen `npm install mongodb` komutunu çalıştırın.';
      err.message = `${help} Ayrıntı: ${err.message}`;
      throw err;
    }
    const { MongoClient } = mongoModule;
    this.client = new MongoClient(this.config.uri);
    await this.client.connect();
    this.db = this.client.db(this.config.database);
  }
  async close() {
    await this.client.close();
  }
  async listTables(): Promise<string[]> {
    if (!this.db) throw new Error('Not connected');
    const collections = (await this.db
      .listCollections()
      .toArray()) as Array<{ name: string }>;
    return collections.map((c: { name: string }) => c.name);
  }
  async *exportTable(table: string): AsyncGenerator<any> {
    if (!this.db) throw new Error('Not connected');
    const cursor = this.db.collection(table).find();
    for await (const doc of cursor) {
      yield doc;
    }
  }
  async getSchema(): Promise<SchemaIR> {
    if (!this.db) throw new Error('Not connected');
    const collections = await this.listTables();
    const tableIRs: TableIR[] = [];
    for (const coll of collections) {
      // Take sample of first 100 documents to infer keys
      const cursor = this.db.collection(coll).find().limit(100);
      const keys = new Set<string>();
      // gather keys and value types
      for await (const doc of cursor) {
        Object.keys(doc).forEach((k) => {
          if (k !== '_id') keys.add(k);
        });
      }
      const cols: ColumnIR[] = Array.from(keys).map((k) => {
        // Mongo tipleri map edilmesi için basit bir yaklaşım kullanılır; tüm alanlar varchar veya json gibi saklanır.
        return {
          name: k,
          type: 'json',
          nullable: true,
        } as ColumnIR;
      });
      // Add _id column as primary key of type uuid or varchar depending on ObjectId
      cols.unshift({ name: '_id', type: 'varchar', nullable: false });
      tableIRs.push({ name: coll, columns: cols, primaryKey: { columns: ['_id'] } });
    }
    return { dbName: this.config.database, tables: tableIRs };
  }
}
