import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentBalanceIndexes1786466000000 implements MigrationInterface {
  name = 'PaymentBalanceIndexes1786466000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_payments_loan_history ON payments(loan_id, payment_date, created_at, id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_loans_client_status ON loans(client_id, status)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_loans_client_status');
    await queryRunner.query('DROP INDEX IF EXISTS idx_payments_loan_history');
  }
}
