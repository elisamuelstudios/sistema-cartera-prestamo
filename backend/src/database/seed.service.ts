import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Repository } from 'typeorm';
import { ClientStatus, InstallmentStatus, LoanStatus, PaymentFrequency, PaymentMethod, UserRole } from '../common/enums';
import { AuditLog, Client, Installment, Loan, Payment, Route, Setting, User } from '../entities';

type SheetData = { headers: Array<string | null>; rows: unknown[][] };

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);
  private readonly directory: string;

  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Route) private readonly routes: Repository<Route>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(Installment) private readonly installments: Repository<Installment>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Setting) private readonly settings: Repository<Setting>,
    @InjectRepository(AuditLog) private readonly audit: Repository<AuditLog>,
  ) { this.directory = config.get('SEED_DATA_DIR', path.resolve(process.cwd(), '../database/seed-data')); }

  async onApplicationBootstrap() {
    if (await this.clients.count() > 0) return;
    try { await this.seed(); } catch (error) { this.logger.error('No se pudo cargar la migración inicial', error instanceof Error ? error.stack : String(error)); throw error; }
  }

  private async seed() {
    this.logger.log(`Cargando datos migrados desde ${this.directory}`);
    const [routeData, clientData, loanData, installmentData, paymentData, userData, configData, auditData] = await Promise.all([
      this.read('rutas.json'), this.read('clientes.json'), this.read('prestamos.json'), this.read('planpagos.json'),
      this.read('pagos.json'), this.read('usuarios.json'), this.read('config.json'), this.read('auditoria.json'),
    ]);

    for (const row of this.objects(routeData)) await this.routes.save(this.routes.create({
      code: this.text(row.CodigoRuta), name: this.text(row.NombreRuta) || 'Ruta sin nombre', collector: this.nullText(row.CobradorResponsable),
      zone: this.nullText(row.Zona), description: this.nullText(row.Descripcion), active: this.text(row.Estado).toLowerCase() !== 'inactiva',
      createdBy: this.nullText(row.UsuarioCreacion), createdAt: this.date(row.FechaCreacion) ?? new Date(),
    }));
    const routeMap = new Map((await this.routes.find()).map((route) => [route.code, route]));

    for (const row of this.objects(userData)) await this.users.save(this.users.create({
      username: this.text(row.Usuario).toLowerCase() || 'admin', passwordHash: await bcrypt.hash(this.text(row.Clave) || '1234', 12),
      fullName: this.text(row.NombreCompleto) || 'Administrador', role: this.text(row.Rol) === UserRole.OPERATOR ? UserRole.OPERATOR : UserRole.ADMIN,
      active: this.text(row.Estado).toLowerCase() !== 'inactivo', mustChangePassword: this.text(row.DebeCambiarClave).toLowerCase() !== 'no',
      createdAt: this.date(row.FechaCreacion) ?? new Date(), lastLoginAt: this.date(row.UltimoIngreso),
    }));

    const clients: Client[] = [];
    for (const row of this.objects(clientData)) clients.push(this.clients.create({
      code: this.text(row.CodigoCliente), firstNames: this.text(row.Nombres) || 'SIN NOMBRE', lastNames: this.text(row.Apellidos) || 'SIN APELLIDO',
      identification: this.nullText(row.Identificacion), birthDate: this.dateOnly(row.FechaNacimiento), address: this.nullText(row.Direccion),
      neighborhood: this.nullText(row.Barrio), city: this.nullText(row.Ciudad), primaryPhone: this.nullText(row.TelefonoPrincipal),
      alternatePhone: this.nullText(row.TelefonoAlterno), email: this.nullText(row.Correo), occupation: this.nullText(row.Ocupacion),
      workplace: this.nullText(row.EmpresaTrabajo), monthlyIncome: this.number(row.IngresosMensuales),
      personalReferences: this.nullText(row.ReferenciasPersonales), familyReferences: this.nullText(row.ReferenciasFamiliares),
      observations: this.nullText(row.Observaciones), status: this.clientStatus(row.Estado), photoPath: this.nullText(row.FotoRuta),
      routeId: routeMap.get(this.text(row.RutaAsignada))?.id ?? null, createdBy: this.nullText(row.UsuarioRegistro),
      updatedBy: this.nullText(row.UsuarioModificacion), createdAt: this.date(row.FechaRegistro) ?? new Date(), updatedAt: this.date(row.FechaModificacion) ?? new Date(),
    }));
    await this.clients.save(clients, { chunk: 100 });
    const clientMap = new Map((await this.clients.find()).map((client) => [client.code, client]));

    const loans: Loan[] = [];
    for (const row of this.objects(loanData)) {
      const client = clientMap.get(this.text(row.CodigoCliente)); if (!client) continue;
      const principal = this.number(row.ValorDesembolsado); const interest = this.number(row.InteresesGenerados);
      const count = Math.max(1, this.number(row.NumeroCuotas));
      loans.push(this.loans.create({
        number: this.text(row.NumeroPrestamo), clientId: client.id, requestedAmount: this.number(row.ValorSolicitado), disbursedAmount: principal,
        loanDate: this.dateOnly(row.FechaPrestamo) ?? new Date().toISOString().slice(0, 10), installmentCount: count,
        frequency: this.frequency(row.FrecuenciaPago), interestRate: this.number(row.TasaInteres), interestType: this.text(row.TipoInteres) || 'Fijo',
        administrativeFee: this.number(row.ComisionAdministrativa), insurance: this.number(row.Seguro), additionalCosts: this.number(row.GastosAdicionales),
        dailyInstallment: (principal + interest + this.number(row.ComisionAdministrativa) + this.number(row.Seguro) + this.number(row.GastosAdicionales)) / count,
        generatedInterest: interest, outstandingPrincipal: this.number(row.CapitalPendiente), overdueAmount: this.number(row.ValorVencido),
        totalPaid: this.number(row.TotalPagado), status: this.loanStatus(row.Estado), cancelledAt: this.dateOnly(row.FechaCancelacion),
        advisor: this.nullText(row.AsesorResponsable), observations: this.nullText(row.Observaciones), routeId: routeMap.get(this.text(row.RutaCobro))?.id ?? null,
        chargeMode: this.text(row.ModoCargos) || 'Financiados', operationType: this.text(row.TipoOperacion) || 'Nuevo',
        refinancedIn: this.nullText(row.RefinanciadoEn), refinancedAt: this.dateOnly(row.FechaRefinanciacion), createdBy: this.nullText(row.UsuarioRegistro),
      }));
    }
    await this.loans.save(loans, { chunk: 100 });
    const loanMap = new Map((await this.loans.find()).map((loan) => [loan.number, loan]));
    for (const row of this.objects(loanData)) {
      const loan = loanMap.get(this.text(row.NumeroPrestamo)); const origin = loanMap.get(this.text(row.PrestamoOrigen));
      if (loan && origin) { loan.originLoanId = origin.id; await this.loans.save(loan); }
    }

    const installments: Installment[] = [];
    for (const row of this.objects(installmentData)) {
      const loan = loanMap.get(this.text(row.NumeroPrestamo)); if (!loan) continue;
      installments.push(this.installments.create({
        loanId: loan.id, number: this.number(row.NumeroCuota), dueDate: this.dateOnly(row.FechaVencimiento) ?? loan.loanDate,
        capital: this.number(row.Capital), interest: this.number(row.Interes), amount: this.number(row.ValorCuota),
        remainingBalance: this.number(row.SaldoRestante), paidAmount: this.number(row.ValorPagado), status: this.installmentStatus(row.EstadoCuota),
        daysLate: this.number(row.DiasMora), paidAt: this.dateOnly(row.FechaPago),
      }));
    }
    await this.installments.save(installments, { chunk: 200 });

    const payments: Payment[] = [];
    for (const row of this.objects(paymentData)) {
      const loan = loanMap.get(this.text(row.NumeroPrestamo)); const client = clientMap.get(this.text(row.CodigoCliente));
      if (!loan || !client) continue;
      payments.push(this.payments.create({
        receipt: this.text(row.Recibo), loanId: loan.id, clientId: client.id, paymentDate: this.dateOnly(row.FechaPago) ?? new Date().toISOString().slice(0, 10),
        amount: this.number(row.ValorPagado), method: this.paymentMethod(row.MetodoPago), responsible: this.nullText(row.Responsable),
        observations: this.nullText(row.Observaciones), routeId: routeMap.get(this.text(row.RutaCobro))?.id ?? loan.routeId,
        createdBy: this.nullText(row.Responsable), createdAt: this.date(row.FechaRegistro) ?? new Date(),
      }));
    }
    await this.payments.save(payments, { chunk: 100 });

    for (const row of configData.rows.slice(1)) {
      const key = this.text(row[0]); if (!key) continue;
      const raw = row[1]; const value = raw === null || raw === undefined ? '' : this.text(raw);
      const valueType = typeof raw === 'number' ? 'number' : 'text';
      await this.settings.save(this.settings.create({ key, value, note: this.nullText(row[2]), valueType, editable: true }));
    }

    const audit: AuditLog[] = [];
    for (const row of this.objects(auditData)) audit.push(this.audit.create({
      username: this.text(row.Usuario) || 'admin', module: this.text(row.Modulo) || 'Migración', action: this.text(row.Accion) || 'Importar',
      recordKey: this.nullText(row.Registro), changes: { detalle: this.nullText(row.Detalle) }, ipAddress: null,
      createdAt: this.date(row.FechaHora ?? row.Fecha) ?? new Date(),
    }));
    if (audit.length) await this.audit.save(audit, { chunk: 200 });
    this.logger.log(`Migración finalizada: ${clients.length} clientes, ${loans.length} préstamos, ${installments.length} cuotas y ${payments.length} pagos`);
  }

  private async read(file: string): Promise<SheetData> { return JSON.parse(await fs.readFile(path.join(this.directory, file), 'utf8')) as SheetData; }
  private objects(data: SheetData) {
    return data.rows.map((row) => Object.fromEntries(data.headers.map((header, index) => [header ?? `_${index}`, row[index]]))) as Array<Record<string, unknown>>;
  }
  private text(value: unknown) {
    let result = String(value ?? '').trim().replace(/\s+/g, ' ');
    if (/[ÃÂ]/.test(result)) { try { result = Buffer.from(result, 'latin1').toString('utf8'); } catch { /* conserva el original */ } }
    return result;
  }
  private nullText(value: unknown) { return this.text(value) || null; }
  private number(value: unknown) { const result = Number(value ?? 0); return Number.isFinite(result) ? Math.round(result * 1000000) / 1000000 : 0; }
  private date(value: unknown): Date | null {
    if (!value) return null; if (typeof value === 'number') return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    const parsed = new Date(String(value)); return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  private dateOnly(value: unknown) { return this.date(value)?.toISOString().slice(0, 10) ?? null; }
  private clientStatus(value: unknown) { const status = this.text(value).toLowerCase(); return status.includes('lista') || status.includes('bloq') ? ClientStatus.BLACKLISTED : status.includes('inactivo') ? ClientStatus.INACTIVE : ClientStatus.ACTIVE; }
  private loanStatus(value: unknown) { const state = this.text(value).toLowerCase(); return state.includes('refin') ? LoanStatus.REFINANCED : state.includes('cancel') ? LoanStatus.PAID : state.includes('mora') ? LoanStatus.OVERDUE : LoanStatus.ACTIVE; }
  private installmentStatus(value: unknown) { const state = this.text(value).toLowerCase(); return state.includes('pag') ? InstallmentStatus.PAID : state.includes('venc') || state.includes('mora') ? InstallmentStatus.OVERDUE : state.includes('abono') || state.includes('parcial') ? InstallmentStatus.PARTIAL : InstallmentStatus.PENDING; }
  private frequency(value: unknown) { return Object.values(PaymentFrequency).find((item) => item.toLowerCase() === this.text(value).toLowerCase()) ?? PaymentFrequency.DAILY; }
  private paymentMethod(value: unknown) { return Object.values(PaymentMethod).find((item) => item.toLowerCase() === this.text(value).toLowerCase()) ?? PaymentMethod.CASH; }
}

