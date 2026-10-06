import type { SqlExecutor } from '../../db/types.ts';
import type { Installation, ModelManifest } from '../../domain/model.ts';

export function createModelRepository(database: SqlExecutor, manifest: ModelManifest) {
  return {
    async pendingRemoval(name: string) {
      return !!await database.getFirstAsync('SELECT filename FROM file_cleanup WHERE filename=?', name);
    },
    async read(): Promise<Installation | null> {
      return database.getFirstAsync<Installation>(`SELECT status, filename, partial, received
        FROM model_installations WHERE id = ? AND source_revision = ? AND sha256 = ? AND bytes = ?`,
      manifest.id, manifest.revision, manifest.sha256, manifest.bytes);
    },
    async save(record: Installation) {
      await database.runAsync(`INSERT INTO model_installations
        (id, source_revision, sha256, bytes, license_ref, runtime_version, filename, partial, received, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET source_revision=excluded.source_revision, sha256=excluded.sha256,
        bytes=excluded.bytes, license_ref=excluded.license_ref, runtime_version=excluded.runtime_version,
        filename=excluded.filename, partial=excluded.partial, received=excluded.received,
        status=excluded.status, updated_at=excluded.updated_at`,
      manifest.id, manifest.revision, manifest.sha256, manifest.bytes, manifest.licenseUrl,
      manifest.runtime, record.filename, record.partial, record.received, record.status, new Date().toISOString());
    },
  };
}
