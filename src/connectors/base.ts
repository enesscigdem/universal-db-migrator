import type { SchemaIR } from '@/ir/types';

export interface DbConnector {
  connect(): Promise<void>;
  close(): Promise<void>;
  /**
   * İlgili veritabanındaki tablo isimlerini döndürür.
   */
  listTables(): Promise<string[]>;
  /**
   * Bir tablonun tüm verilerini stream olarak döndürür.
   */
  exportTable(table: string): AsyncGenerator<any, void, unknown>;
  /**
   * Veritabanının şema bilgisini IR formatında döndürür.
   */
  getSchema(): Promise<SchemaIR>;
}