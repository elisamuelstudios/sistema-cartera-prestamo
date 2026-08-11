export enum UserRole {
  ADMIN = 'Administrador',
  OPERATOR = 'Operador',
}

export enum ClientStatus {
  ACTIVE = 'Activo',
  INACTIVE = 'Inactivo',
  BLACKLISTED = 'Lista Negra',
}

export enum LoanStatus {
  ACTIVE = 'Activo',
  OVERDUE = 'En mora',
  PAID = 'Cancelado',
  REFINANCED = 'Refinanciado',
  CANCELLED = 'Anulado',
}

export enum InstallmentStatus {
  PENDING = 'Pendiente',
  PARTIAL = 'Abono',
  PAID = 'Pagada',
  OVERDUE = 'Vencida',
}

export enum PaymentFrequency {
  DAILY = 'Diario',
  WEEKLY = 'Semanal',
  BIWEEKLY = 'Quincenal',
  MONTHLY = 'Mensual',
}

export enum PaymentMethod {
  CASH = 'Efectivo',
  TRANSFER = 'Transferencia',
  OTHER = 'Otro',
}

