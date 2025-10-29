import 'server-only'
import type { DbConnector } from './base';
import type { SchemaIR, TableIR, ColumnIR } from '@/ir/types';

export interface PostgresConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}

/**
 * PostgresConnector, PostgreSQL veritabanlarından şema ve veri çekmek için adaptör.
 */
export class PostgresConnector implements DbConnector {
  private client: any;
  private config: PostgresConfig;
  constructor(config: PostgresConfig) {
    this.config = config;
    this.client = null;
  }
  async connect() {
    const { Client } = await import('pg');
    this.client = new Client({
      host: this.config.host,
      port: this.config.port ?? 5432,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
    });
    await this.client.connect();
  }
  async close() {
    await this.client.end();
  }
  async listTables(): Promise<string[]> {
    const res = await this.client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    );
    return res.rows.map((r) => r.table_name);
  }
  async *exportTable(table: string): AsyncGenerator<any> {
    const res = await this.client.query(`SELECT * FROM ${table}`);
    for (const row of res.rows) {
      yield row;
    }
  }
  async getSchema(): Promise<SchemaIR> {
    const tables = await this.listTables();
    const tableIRs: TableIR[] = [];
    for (const table of tables) {
      const colRes = await this.client.query(
        `SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1
         ORDER BY ordinal_position`,
        [table],
      );
      const cols: ColumnIR[] = colRes.rows.map((col) => {
        let type: ColumnIR['type'];
        const dt = (col.data_type as string).toLowerCase();
        switch (dt) {
          case 'integer':
          case 'smallint':
          case 'serial':
          case 'smallserial':
            type = 'int';
            break;
          case 'bigint':
          case 'bigserial':
            type = 'bigint';
            break;
          case 'numeric':
          case 'decimal':
            type = 'numeric';
            break;
          case 'boolean':
            type = 'bool';
            break;
          case 'character varying':
          case 'varchar':
          case 'character':
          case 'char':
            type = 'varchar';
            break;
          case 'text':
            type = 'text';
            break;
          case 'date':
            type = 'date';
            break;
          case 'timestamp without time zone':
          case 'timestamp with time zone':
            type = 'datetime';
            break;
          case 'json':
          case 'jsonb':
            type = 'json';
            break;
          case 'bytea':
            type = 'binary';
            break;
          case 'uuid':
            type = 'uuid';
            break;
          default:
            type = 'varchar';
        }
        return {
          name: col.column_name,
          type,
          length: col.character_maximum_length ? Number(col.character_maximum_length) : undefined,
          precision: col.numeric_precision ? Number(col.numeric_precision) : undefined,
          scale: col.numeric_scale ? Number(col.numeric_scale) : undefined,
          nullable: col.is_nullable === 'YES',
          default: col.column_default ?? undefined,
          identity: col.column_default && col.column_default.startsWith('nextval') ? { seed: 1, step: 1 } : undefined,
        } as ColumnIR;
      });
      // primary key
      const pkRes = await this.client.query(
        `SELECT a.attname
         FROM pg_index i
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
         WHERE i.indrelid = $1::regclass AND i.indisprimary`,
        [table],
      );
      const pkCols = pkRes.rows.map((r) => r.attname as string);
      tableIRs.push({
        name: table,
        columns: cols,
        primaryKey: pkCols.length > 0 ? { columns: pkCols } : undefined,
      });
    }
    return { dbName: this.config.database, tables: tableIRs };
  }
}