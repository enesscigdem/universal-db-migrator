import 'server-only'
import type { DbConnector } from './base';
import type { SchemaIR, TableIR, ColumnIR } from '@/ir/types';

export interface MySQLConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}

/**
 * MySQLConnector, MySQL/MariaDB veritabanlarından şema ve veri çekmek için basit bir adaptördür.
 * Bu sınıf, tablo listesini okuyabilir, tablo verilerini sıralı olarak stream edebilir
 * ve şema bilgisini IR formatına dönüştürebilir. Detaylı tip dönüşümleri en yaygın tipleri kapsar.
 */
export class MySQLConnector implements DbConnector {
  private pool: any;
  private config: MySQLConfig;
  constructor(config: MySQLConfig) {
    this.config = config;
    this.pool = null;
  }
  /**
   * Bağlantıyı doğrular. createPool lazily bağlanır, bu yüzden basit bir sorgu atılır.
   */
  async connect() {
    const { createPool } = await import('mysql2/promise');
    this.pool = createPool({
      host: this.config.host,
      port: this.config.port ?? 3306,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      waitForConnections: true,
    });
    await this.pool.query('SELECT 1');
  }
  async close() {
    await this.pool.end();
  }
  async listTables(): Promise<string[]> {
    const [rows] = await this.pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = \"BASE TABLE\"',
      [this.config.database],
    );
    return rows.map((r) => r['table_name']);
  }
  async *exportTable(table: string): AsyncGenerator<any> {
    // Veriyi bellek taşmasına izin vermeden satır satır yield etmek için cursor kullanmak gerekir.
    // mysql2/promise kütüphanesi cursor desteği sunmadığından basit bir sorgu üzerinden tüm sonuç döndürülür.
    const [rows] = await this.pool.query(`SELECT * FROM ${table}`);
    for (const row of rows) {
      yield row;
    }
  }
  async getSchema(): Promise<SchemaIR> {
    const tables = await this.listTables();
    const tableIRs: TableIR[] = [];
    for (const table of tables) {
      const [columns] = await this.pool.query(
        `SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType, CHARACTER_MAXIMUM_LENGTH AS charMaxLength, NUMERIC_PRECISION AS numericPrecision, NUMERIC_SCALE AS numericScale, IS_NULLABLE AS isNullable, COLUMN_DEFAULT AS defaultValue, COLUMN_KEY AS columnKey, EXTRA AS extra
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ORDINAL_POSITION`,
        [this.config.database, table],
      );
      const cols: ColumnIR[] = (columns as any[]).map((col) => {
        let type: ColumnIR['type'];
        const dt = (col.dataType as string).toLowerCase();
        switch (dt) {
          case 'int':
          case 'integer':
          case 'smallint':
          case 'mediumint':
          case 'tinyint':
            type = 'int';
            break;
          case 'bigint':
            type = 'bigint';
            break;
          case 'decimal':
          case 'numeric':
            type = 'numeric';
            break;
          case 'bit':
          case 'bool':
          case 'boolean':
            type = 'bool';
            break;
          case 'varchar':
          case 'char':
            type = 'varchar';
            break;
          case 'text':
          case 'mediumtext':
          case 'longtext':
            type = 'text';
            break;
          case 'date':
            type = 'date';
            break;
          case 'datetime':
          case 'timestamp':
            type = 'datetime';
            break;
          case 'json':
            type = 'json';
            break;
          case 'binary':
          case 'blob':
          case 'mediumblob':
          case 'longblob':
            type = 'binary';
            break;
          default:
            type = 'varchar';
        }
        return {
          name: col.name as string,
          type,
          length: col.charMaxLength ? Number(col.charMaxLength) : undefined,
          precision: col.numericPrecision ? Number(col.numericPrecision) : undefined,
          scale: col.numericScale ? Number(col.numericScale) : undefined,
          nullable: (col.isNullable as string) === 'YES',
          default: col.defaultValue ?? undefined,
          identity: col.extra && (col.extra as string).includes('auto_increment')
            ? { seed: 1, step: 1 }
            : undefined,
        } as ColumnIR;
      });
      const pkCols = (columns as any[])
        .filter((c) => c.columnKey === 'PRI')
        .map((c) => c.name as string);
      tableIRs.push({
        name: table,
        columns: cols,
        primaryKey: pkCols.length > 0 ? { columns: pkCols } : undefined,
      });
    }
    return { dbName: this.config.database, tables: tableIRs };
  }
}