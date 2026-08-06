/**
 * Minimal storage stub for M07 resume deletes.
 * Full storage service lands in M08.
 */
export function getStorageService() {
  return {
    async delete(_path: string): Promise<void> {
      // no-op until M08
    },
  };
}
