import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `settings` tenía UNIQUE(key, value), lo que permitía varias filas con la misma
 * clave. SettingsService.getValue() devolvía entonces una fila arbitraria.
 * Se deduplica conservando la fila actualizada más recientemente y se pasa a
 * UNIQUE(key).
 */
export class SettingsUniqueKey1787100000000 implements MigrationInterface {
  name = 'SettingsUniqueKey1787100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM settings survivor
      USING settings duplicate
      WHERE survivor.key = duplicate.key
        AND (survivor.updated_at, survivor.id) < (duplicate.updated_at, duplicate.id)
    `);
    await queryRunner.query(
      'ALTER TABLE settings DROP CONSTRAINT IF EXISTS uq_settings_key_value',
    );
    await queryRunner.query(
      'ALTER TABLE settings ADD CONSTRAINT uq_settings_key UNIQUE (key)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE settings DROP CONSTRAINT IF EXISTS uq_settings_key',
    );
    await queryRunner.query(
      'ALTER TABLE settings ADD CONSTRAINT uq_settings_key_value UNIQUE (key, value)',
    );
  }
}
