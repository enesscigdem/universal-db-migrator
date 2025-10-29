import type { DbConnector } from './base';
import { MySQLConnector, MySQLConfig } from './mysql';
import { PostgresConnector, PostgresConfig } from './postgres';
import { MSSQLConnector, MSSQLConfig } from './mssql';
import { MongoConnector, MongoConfig } from './mongo';
import { OracleConnector, OracleConfig } from './oracle';

export type ConnectorType = 'mysql' | 'postgresql' | 'mssql' | 'mongodb' | 'oracle';

export interface ConnectorParams {
  type: ConnectorType;
  config: any;
}

export function createConnector(params: ConnectorParams): DbConnector {
  switch (params.type) {
    case 'mysql':
      return new MySQLConnector(params.config as MySQLConfig);
    case 'postgresql':
      return new PostgresConnector(params.config as PostgresConfig);
    case 'mssql':
      return new MSSQLConnector(params.config as MSSQLConfig);
    case 'mongodb':
      return new MongoConnector(params.config as MongoConfig);
    case 'oracle':
      return new OracleConnector(params.config as OracleConfig);
    default:
      throw new Error(`Unsupported connector type: ${params.type}`);
  }
}