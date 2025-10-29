import 'server-only'
import type { DbConnector } from './base';
import type { SchemaIR, TableIR, ColumnIR } from '@/ir/types';

export interface MSSQLConfig {
  server: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  encrypt?: boolean;
}

/**
 * MSSQLConnector, Microsoft SQL Server veritabanlarından şema ve veri çekmek için adaptör.
 */
export class MSSQLConnector implements DbConnector {
  private pool?: any;
  private config: MSSQLConfig;
  constructor(config: MSSQLConfig) {
    this.config = config;
  }
  async connect() {
    const mssql = await import('mssql');
    this.pool = await mssql.connect({
      user: this.config.user,
      password: this.config.password,
      server: this.config.server,
      port: this.config.port ?? 1433,
      database: this.config.database,
      options: {
        encrypt: this.config.encrypt ?? false,
        trustServerCertificate: true,
      },
    });
  }
  async close() {
    await this.pool?.close();
  }
  async listTables(): Promise<string[]> {
    if (!this.pool) throw new Error('Not connected');
    const result = await this.pool.request().query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_CATALOG='${this.config.database.replace(/'/g, "''")}'`
    );
    return result.recordset.map((r) => r.TABLE_NAME as string);
  }
  async *exportTable(table: string): AsyncGenerator<any> {
    if (!this.pool) throw new Error('Not connected');
    const result = await this.pool.request().query(`SELECT * FROM [${table}]`);
    for (const row of result.recordset) {
      yield row;
    }
  }
  async getSchema(): Promise<SchemaIR> {
    if (!this.pool) throw new Error('Not connected');
    const mssqlLib = await import('mssql');
    const tables = await this.listTables();
    const tableIRs: TableIR[] = [];
    for (const table of tables) {
      const colsRes = await this.pool.request().input('table', mssqlLib.VarChar, table).query(
        `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE, COLUMN_DEFAULT, COLUMNPROPERTY(object_id(TABLE_SCHEMA+'.'+TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS IsIdentity
         FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table ORDER BY ORDINAL_POSITION`,
      );
      const cols: ColumnIR[] = colsRes.recordset.map((col: any) => {
        let type: ColumnIR['type'];
        const dt = (col.DATA_TYPE as string).toLowerCase();
        switch (dt) {
          case 'int':
          case 'smallint':
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
            type = 'bool';
            break;
          case 'varchar':
          case 'char':
          case 'nchar':
          case 'nvarchar':
            type = dt === 'nvarchar' || dt === 'nchar' ? 'nvarchar' : 'varchar';
            break;
          case 'text':
          case 'ntext':
            type = 'text';
            break;
          case 'date':
            type = 'date';
            break;
          case 'datetime':
          case 'datetime2':
          case 'smalldatetime':
            type = 'datetime';
            break;
          case 'timestamp':
            type = 'timestamp';
            break;
          case 'xml':
          case 'json':
            type = 'json';
            break;
          case 'binary':
          case 'varbinary':
          case 'image':
            type = 'binary';
            break;
          case 'uniqueidentifier':
            type = 'uuid';
            break;
          default:
            type = 'varchar';
        }
        return {
          name: col.COLUMN_NAME,
          type,
          length: col.CHARACTER_MAXIMUM_LENGTH ? Number(col.CHARACTER_MAXIMUM_LENGTH) : undefined,
          precision: col.NUMERIC_PRECISION ? Number(col.NUMERIC_PRECISION) : undefined,
          scale: col.NUMERIC_SCALE ? Number(col.NUMERIC_SCALE) : undefined,
          nullable: col.IS_NULLABLE === 'YES',
          default: col.COLUMN_DEFAULT ?? undefined,
          identity: col.IsIdentity === 1 ? { seed: 1, step: 1 } : undefined,
        } as ColumnIR;
      });
      // primary keys
      const pkRes = await this.pool.request().input('table', mssqlLib.VarChar, table).query(
        `SELECT k.COLUMN_NAME
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS t
         JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
           ON t.CONSTRAINT_NAME = k.CONSTRAINT_NAME
         WHERE t.TABLE_NAME = @table AND t.CONSTRAINT_TYPE = 'PRIMARY KEY'
         ORDER BY k.ORDINAL_POSITION`,
      );
      const pkCols = pkRes.recordset.map((r: any) => r.COLUMN_NAME as string);
      tableIRs.push({
        name: table,
        columns: cols,
        primaryKey: pkCols.length > 0 ? { columns: pkCols } : undefined,
      });
    }
    return { dbName: this.config.database, tables: tableIRs };
  }
}