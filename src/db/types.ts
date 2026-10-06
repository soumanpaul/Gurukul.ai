export type SqlValue = string | number | null;
export interface SqlExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<Result>(sql: string, ...params: SqlValue[]): Promise<Result | null>;
  getAllAsync<Result>(sql: string, ...params: SqlValue[]): Promise<Result[]>;
}
export interface Database extends SqlExecutor {
  withExclusiveTransactionAsync(work: (transaction: SqlExecutor) => Promise<void>): Promise<void>;
}
export interface Migration {
  version: number;
  apply(transaction: SqlExecutor): Promise<void>;
}
