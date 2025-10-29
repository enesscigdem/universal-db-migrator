declare module 'archiver' {
  const archiver: any
  export default archiver
}

declare module 'mssql' {
  const mssql: any
  export = mssql
}

declare module 'mysql2/promise' {
  export const createPool: any
  export type Pool = any
  export type RowDataPacket = any
}

declare module 'oracledb' {
  const oracledb: any
  export default oracledb
}

declare module 'pg' {
  export const Client: any
}

declare module 'mongodb' {
  export class MongoClient {
    constructor(uri: string)
    connect(): Promise<void>
    close(): Promise<void>
    db(name: string): any
  }
  export type Db = any
}

