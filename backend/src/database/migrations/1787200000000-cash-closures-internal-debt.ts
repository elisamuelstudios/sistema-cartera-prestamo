import { MigrationInterface, QueryRunner } from 'typeorm';

export class CashClosuresInternalDebt1787200000000
  implements MigrationInterface
{
  name = 'CashClosuresInternalDebt1787200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS internal_debt_charge numeric(16,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS cash_abono numeric(16,2) NOT NULL DEFAULT 0`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cash_closures DROP COLUMN IF EXISTS cash_abono`,
    );
    await queryRunner.query(
      `ALTER TABLE cash_closures DROP COLUMN IF EXISTS internal_debt_charge`,
    );
  }
}
