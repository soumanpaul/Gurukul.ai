import { openDatabaseAsync } from 'expo-sqlite';
import { initializeFoundation } from '../../services/foundation';
import type { Database } from '../../db/types';

let opening: ReturnType<typeof openFoundation> | undefined;

async function openFoundation() {
  const database = await openDatabaseAsync('gurukul.db', { finalizeUnusedStatementsBeforeClosing: false });
  try {
    const connection: Database = {
      execAsync: sql => database.execAsync(sql),
      runAsync: (sql, ...params) => database.runAsync(sql, ...params),
      getFirstAsync: (sql, ...params) => database.getFirstAsync(sql, ...params),
      getAllAsync: (sql, ...params) => database.getAllAsync(sql, ...params),
      async withExclusiveTransactionAsync(work) {
        const transaction = await openDatabaseAsync('gurukul.db', { useNewConnection: true, finalizeUnusedStatementsBeforeClosing: false });
        try {
          await transaction.execAsync('PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;');
          try {
            await work(transaction);
            await transaction.execAsync('COMMIT');
          } catch (error) {
            await transaction.execAsync('ROLLBACK');
            throw error;
          }
        } finally {
          await transaction.closeAsync();
        }
      },
    };
    return await initializeFoundation(connection);
  } catch (error) {
    await database.closeAsync();
    throw error;
  }
}

export function getFoundation() {
  if (!opening) {
    opening = openFoundation().catch(error => {
      opening = undefined;
      throw error;
    });
  }
  return opening.then(async foundation => ({
    ...foundation,
    profile: await foundation.repository.readProfile(),
    notebooks: await foundation.repository.listNotebooks(),
  }));
}
