/**
 * Utilidades de redondeo monetario.
 *
 * El sistema Excel usa la función `Round()` de VBA, que aplica **redondeo
 * bancario** (half-to-even), no el "half-away-from-zero" de `Math.round()`.
 *
 *   VBA:  Round(1312.5, 0) = 1312      JS: Math.round(1312.5) = 1313
 *   VBA:  Round(4687.5, 0) = 4688      JS: Math.round(4687.5) = 4688
 *
 * Verificado contra PR-000001 de la hoja BD_PlanPagos (interés cuota 1 = 1.312).
 * Replicarlo es obligatorio para que el sistema web produzca planes de pago
 * idénticos a los del Excel peso a peso.
 */
export function roundBankers(value: number, digits = 0): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  const EPSILON = 1e-9;

  let rounded: number;
  if (Math.abs(diff - 0.5) < EPSILON) {
    // Empate exacto: se elige el entero par.
    rounded = floor % 2 === 0 ? floor : floor + 1;
  } else {
    rounded = Math.round(scaled);
  }
  return rounded / factor;
}

/** Normaliza cualquier entrada a un número monetario con 2 decimales. */
export function toMoney(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}
