export type ScalarType =
  | 'int'
  | 'bigint'
  | 'numeric'
  | 'bool'
  | 'varchar'
  | 'nvarchar'
  | 'text'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'json'
  | 'binary'
  | 'uuid';

export interface ColumnIR {
  name: string;
  type: ScalarType;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  default?: string;
  identity?: { seed?: number; step?: number };
}

export interface TableIR {
  name: string;
  columns: ColumnIR[];
  primaryKey?: { columns: string[] };
  uniques?: { name?: string; columns: string[] }[];
  indexes?: { name?: string; columns: string[]; unique?: boolean }[];
  foreignKeys?: {
    name?: string;
    columns: string[];
    refTable: string;
    refColumns: string[];
    onUpdate?: 'cascade' | 'restrict' | 'set null' | 'no action';
    onDelete?: 'cascade' | 'restrict' | 'set null' | 'no action';
  }[];
}

export interface SchemaIR {
  dbName: string;
  tables: TableIR[];
  views?: { name: string; definitionSql: string }[];
  sequences?: { name: string; start?: number; increment?: number }[];
  routines?: {
    name: string;
    kind: 'function' | 'procedure';
    definitionSql: string;
  }[];
}