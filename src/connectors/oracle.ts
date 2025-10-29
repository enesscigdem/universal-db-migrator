import oracledb from 'oracledb';
import type { DbConnector } from './base';
import type { SchemaIR, TableIR, ColumnIR } from '@/ir/types';

export interface OracleConfig {
  user: string;
  password: string;
  connectString: string;
}

/**
 * OracleConnector, Oracle veritabanından şema ve veri almak için adaptördür.
 * Bu örnek basit bir uygulamadır ve kapsamlı Oracle özelliklerinin tümünü kapsamaz.
 */
export class OracleConnector implements DbConnector {
  private connection?: oracledb.Connection;
  private config: OracleConfig;
  constructor(config: OracleConfig) {
    this.config = config;
  }
  async connect() {
    this.connection = await oracledb.getConnection({
      user: this.config.user,
      password: this.config.password,
      connectString: this.config.connectString,
    });
  }
  async close() {
    await this.connection?.close();
  }
  async listTables(): Promise<string[]> {
    if (!this.connection) throw new Error('Not connected');
    const result = await this.connection.execute<{ TABLE_NAME: string }>(
      `SELECT table_name FROM user_tables ORDER BY table_name`,
    );
    return result.rows?.map((r) => (r as any)[0] as string) ?? [];
  }
  async *exportTable(table: string): AsyncGenerator<any> {
    if (!this.connection) throw new Error('Not connected');
    const result = await this.connection.execute(`SELECT * FROM ${table}`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (result.rows) {
      for (const row of result.rows) {
        yield row;
      }
    }
  }
  async getSchema(): Promise<SchemaIR> {
    if (!this.connection) throw new Error('Not connected');
    const tables = await this.listTables();
    const tableIRs: TableIR[] = [];
    for (const table of tables) {
      const colRes = await this.connection.execute(
        `SELECT column_name, data_type, data_length, data_precision, data_scale, nullable, data_default
         FROM user_tab_columns WHERE table_name = :tbl ORDER BY column_id`,
        [table],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const cols: ColumnIR[] = [];
      if (colRes.rows) {
        for (const row of colRes.rows as any[]) {
          let type: ColumnIR['type'];
          const dt = (row.DATA_TYPE as string).toLowerCase();
          switch (dt) {
            case 'number':
              // number tipinin ölçek ve hassasiyetine göre int/numeric ayrımı yapılabilir
              if (row.DATA_SCALE === 0) {
                type = 'int';
              } else {
                type = 'numeric';
              }
              break;
            case 'varchar2':
            case 'char':
              type = 'varchar';
              break;
            case 'nvarchar2':
            case 'nchar':
              type = 'nvarchar';
              break;
            case 'date':
              type = 'date';
              break;
            case 'timestamp':
            case 'timestamp with time zone':
            case 'timestamp with local time zone':
              type = 'datetime';
              break;
            case 'clob':
            case 'nclob':
              type = 'text';
              break;
            case 'blob':
            case 'raw':
            case 'long raw':
              type = 'binary';
              break;
            default:
              type = 'varchar';
          }
          cols.push({
            name: row.COLUMN_NAME,
            type,
            length: row.DATA_LENGTH ? Number(row.DATA_LENGTH) : undefined,
            precision: row.DATA_PRECISION ? Number(row.DATA_PRECISION) : undefined,
            scale: row.DATA_SCALE ? Number(row.DATA_SCALE) : undefined,
            nullable: row.NULLABLE === 'Y',
            default: row.DATA_DEFAULT ?? undefined,
            // Oracle identity tespiti için user_tab_identity_cols kullanılabilir. Basit bırakıldı.
          } as ColumnIR);
        }
      }
      // primary key
      const pkRes = await this.connection.execute(
        `SELECT cols.column_name
           FROM user_constraints cons, user_cons_columns cols
          WHERE cons.constraint_type = 'P'
            AND cons.constraint_name = cols.constraint_name
            AND cons.table_name = :tbl`,
        [table],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const pkCols: string[] = pkRes.rows ? pkRes.rows.map((r: any) => r.COLUMN_NAME as string) : [];
      tableIRs.push({ name: table, columns: cols, primaryKey: pkCols.length > 0 ? { columns: pkCols } : undefined });
    }
    return { dbName: this.config.connectString, tables: tableIRs };
  }
}