import type { DatabaseClient, DatabaseTransaction } from "../storage/types.js";
import type { PluginDefinition, PluginStorageContext } from "./types.js";

export function createPluginStorageContext(
  rawDb: DatabaseClient,
  plugin: Pick<PluginDefinition, "name" | "version">,
): PluginStorageContext {
  return {
    pluginName: plugin.name,
    pluginVersion: plugin.version,
    rawDb,
    exec: async (sql: string) => {
      await rawDb.executeMultiple(sql);
    },
    transaction: async <T>(fn: (tx: DatabaseTransaction) => Promise<T> | T): Promise<T> => {
      const txn = await rawDb.transaction("write");
      try {
        const result = await fn(txn);
        await txn.commit();
        return result;
      } catch (e) {
        if (!txn.closed) {
          await txn.rollback();
        }
        throw e;
      } finally {
        txn.close();
      }
    },
  };
}
