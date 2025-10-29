import type { DbConnector } from './base';
import type { MySQLConfig } from './mysql';
import type { PostgresConfig } from './postgres';
import type { MSSQLConfig } from './mssql';
import type { MongoConfig } from './mongo';
import type { OracleConfig } from './oracle';

export type ConnectorType = 'mysql' | 'postgresql' | 'mssql' | 'mongodb' | 'oracle';

export interface ConnectorParams {
  type: ConnectorType;
  config: any;
}

export async function createConnector(params: ConnectorParams): Promise<DbConnector> {
  switch (params.type) {
    case 'mysql': {
      const { MySQLConnector } = await import('./mysql');
      return new MySQLConnector(params.config as MySQLConfig);
    }
    case 'postgresql': {
      const { PostgresConnector } = await import('./postgres');
      return new PostgresConnector(params.config as PostgresConfig);
    }
    case 'mssql': {
      const { MSSQLConnector } = await import('./mssql');
      return new MSSQLConnector(params.config as MSSQLConfig);
    }
    case 'mongodb': {
      const { MongoConnector } = await import('./mongo');
      return new MongoConnector(params.config as MongoConfig);
    }
    case 'oracle': {
      const { OracleConnector } = await import('./oracle');
      return new OracleConnector(params.config as OracleConfig);
    }
    default:
      throw new Error(`Unsupported connector type: ${params.type}`);
  }
}
