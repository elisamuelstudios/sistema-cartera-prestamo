import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExcelLogicAlignment1786813200000 implements MigrationInterface {
  name = 'ExcelLogicAlignment1786813200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS cash_brought_by_collector numeric(16,2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS collector_carry_cash numeric(16,2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS total_sales numeric(16,2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS mochi numeric(16,2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(`
      UPDATE cash_closures SET
        cash_brought_by_collector = CASE WHEN details->>'cashBroughtByCollector' ~ '^[0-9]+([.][0-9]+)?$' THEN (details->>'cashBroughtByCollector')::numeric ELSE 0 END,
        collector_carry_cash = CASE WHEN details->>'collectorCarryCash' ~ '^[0-9]+([.][0-9]+)?$' THEN (details->>'collectorCarryCash')::numeric ELSE 0 END,
        total_sales = CASE WHEN details->>'totalSales' ~ '^[0-9]+([.][0-9]+)?$' THEN (details->>'totalSales')::numeric ELSE 0 END,
        mochi = CASE WHEN details->>'mochi' ~ '^[0-9]+([.][0-9]+)?$' THEN (details->>'mochi')::numeric ELSE 0 END
    `);
    await queryRunner.query(`
      UPDATE loans loan SET outstanding_principal = COALESCE((
        SELECT SUM(GREATEST(installment.amount-installment.paid_amount,0))
        FROM installments installment WHERE installment.loan_id=loan.id
      ),0)
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_loans_route_date ON loans(route_id, loan_date)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_loans_origin ON loans(origin_loan_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_cash_closures_route_date ON cash_closures(route_id, date DESC, created_at DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_cash_closures_route_date',
    );
    await queryRunner.query('DROP INDEX IF EXISTS idx_loans_origin');
    await queryRunner.query('DROP INDEX IF EXISTS idx_loans_route_date');
    await queryRunner.query(
      'ALTER TABLE cash_closures DROP COLUMN IF EXISTS mochi',
    );
    await queryRunner.query(
      'ALTER TABLE cash_closures DROP COLUMN IF EXISTS total_sales',
    );
    await queryRunner.query(
      'ALTER TABLE cash_closures DROP COLUMN IF EXISTS collector_carry_cash',
    );
    await queryRunner.query(
      'ALTER TABLE cash_closures DROP COLUMN IF EXISTS cash_brought_by_collector',
    );
  }
}
