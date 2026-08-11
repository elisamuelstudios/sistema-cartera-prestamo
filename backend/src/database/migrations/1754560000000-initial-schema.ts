import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1754560000000 implements MigrationInterface {
  name = 'InitialSchema1754560000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username varchar(60) NOT NULL UNIQUE,
        password_hash varchar NOT NULL, full_name varchar(150) NOT NULL, role varchar(30) NOT NULL DEFAULT 'Operador',
        active boolean NOT NULL DEFAULT true, must_change_password boolean NOT NULL DEFAULT true,
        last_login_at timestamptz NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`
      CREATE TABLE routes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(20) NOT NULL UNIQUE, name varchar(160) NOT NULL,
        collector varchar(160), zone varchar(160), description text, active boolean NOT NULL DEFAULT true,
        created_by varchar(60), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`
      CREATE TABLE clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(20) NOT NULL UNIQUE, first_names varchar(160) NOT NULL,
        last_names varchar(160) NOT NULL, identification varchar(50), birth_date date, address text, neighborhood varchar(160),
        city varchar(160), primary_phone varchar(40), alternate_phone varchar(40), email varchar(160), occupation varchar(160),
        workplace varchar(160), monthly_income numeric(16,2) NOT NULL DEFAULT 0, personal_references text, family_references text,
        observations text, status varchar(30) NOT NULL DEFAULT 'Activo', photo_path text, route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
        created_by varchar(60), updated_by varchar(60), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query('CREATE INDEX idx_clients_identification ON clients(identification)');
    await queryRunner.query(`
      CREATE TABLE loans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number varchar(24) NOT NULL UNIQUE,
        client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        requested_amount numeric(16,2) NOT NULL, disbursed_amount numeric(16,2) NOT NULL, loan_date date NOT NULL,
        installment_count integer NOT NULL, frequency varchar(20) NOT NULL DEFAULT 'Diario', interest_rate numeric(10,6) NOT NULL,
        interest_type varchar(30) NOT NULL DEFAULT 'Fijo', administrative_fee numeric(16,2) NOT NULL DEFAULT 0,
        insurance numeric(16,2) NOT NULL DEFAULT 0, additional_costs numeric(16,2) NOT NULL DEFAULT 0,
        daily_installment numeric(16,2) NOT NULL, generated_interest numeric(16,2) NOT NULL,
        outstanding_principal numeric(16,2) NOT NULL, overdue_amount numeric(16,2) NOT NULL DEFAULT 0,
        total_paid numeric(16,2) NOT NULL DEFAULT 0, status varchar(30) NOT NULL DEFAULT 'Activo', cancelled_at date,
        advisor varchar(160), observations text, route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
        charge_mode varchar(40) NOT NULL DEFAULT 'Financiados', operation_type varchar(30) NOT NULL DEFAULT 'Nuevo',
        origin_loan_id uuid REFERENCES loans(id) ON DELETE SET NULL, refinanced_in varchar(24), refinanced_at date,
        created_by varchar(60), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query('CREATE INDEX idx_loans_client ON loans(client_id)');
    await queryRunner.query('CREATE INDEX idx_loans_status ON loans(status)');
    await queryRunner.query(`
      CREATE TABLE installments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        number integer NOT NULL, due_date date NOT NULL, capital numeric(16,2) NOT NULL, interest numeric(16,2) NOT NULL,
        amount numeric(16,2) NOT NULL, remaining_balance numeric(16,2) NOT NULL, paid_amount numeric(16,2) NOT NULL DEFAULT 0,
        status varchar(24) NOT NULL DEFAULT 'Pendiente', days_late integer NOT NULL DEFAULT 0, paid_at date,
        CONSTRAINT uq_installment_loan_number UNIQUE(loan_id, number)
      )`);
    await queryRunner.query('CREATE INDEX idx_installments_due_date ON installments(due_date)');
    await queryRunner.query(`
      CREATE TABLE payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receipt varchar(24) NOT NULL UNIQUE,
        loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE RESTRICT, client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        payment_date date NOT NULL, amount numeric(16,2) NOT NULL, method varchar(30) NOT NULL DEFAULT 'Efectivo',
        responsible varchar(160), observations text, route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
        created_by varchar(60), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query('CREATE INDEX idx_payments_date ON payments(payment_date)');
    await queryRunner.query(`
      CREATE TABLE payment_allocations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        installment_id uuid NOT NULL REFERENCES installments(id) ON DELETE CASCADE, amount numeric(16,2) NOT NULL
      )`);
    await queryRunner.query(`
      CREATE TABLE cash_closures (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number varchar(24) NOT NULL UNIQUE, date date NOT NULL,
        route_id uuid NOT NULL REFERENCES routes(id) ON DELETE RESTRICT, collector varchar(160),
        expected_amount numeric(16,2) NOT NULL DEFAULT 0, received_amount numeric(16,2) NOT NULL DEFAULT 0,
        total_expenses numeric(16,2) NOT NULL DEFAULT 0, initial_cash numeric(16,2) NOT NULL DEFAULT 0,
        final_cash numeric(16,2) NOT NULL DEFAULT 0, cash_count numeric(16,2) NOT NULL DEFAULT 0,
        difference numeric(16,2) NOT NULL DEFAULT 0, effectiveness numeric(8,4) NOT NULL DEFAULT 0,
        invoices_in integer NOT NULL DEFAULT 0, invoices_out integer NOT NULL DEFAULT 0, paid_invoices integer NOT NULL DEFAULT 0,
        waiting_invoices integer NOT NULL DEFAULT 0, refinanced_loans integer NOT NULL DEFAULT 0,
        details jsonb NOT NULL DEFAULT '{}'::jsonb, notes text, created_by varchar(60), created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query('CREATE INDEX idx_cash_closures_date ON cash_closures(date)');
    await queryRunner.query(`
      CREATE TABLE settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key varchar(100) NOT NULL, value text NOT NULL, note text,
        value_type varchar(30) NOT NULL DEFAULT 'text', editable boolean NOT NULL DEFAULT true,
        updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_settings_key_value UNIQUE(key, value)
      )`);
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username varchar(60) NOT NULL, module varchar(80) NOT NULL,
        action varchar(80) NOT NULL, record_key varchar(100), changes jsonb, ip_address varchar(64),
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query('CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['audit_logs', 'settings', 'cash_closures', 'payment_allocations', 'payments', 'installments', 'loans', 'clients', 'routes', 'users']) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  }
}

