declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(location: string, options?: Record<string, unknown>);
    close(): void;
    exec(sql: string): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prepare(sql: string): StatementSync;
  }

  export class StatementSync {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all(...params: any[]): any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(...params: any[]): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  }
}
