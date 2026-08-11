export function nextCode(prefix: string, values: string[], digits: number): string {
  const maximum = values.reduce((current, value) => {
    const number = Number(value.replace(/\D/g, ''));
    return Number.isFinite(number) ? Math.max(current, number) : current;
  }, 0);
  return `${prefix}-${String(maximum + 1).padStart(digits, '0')}`;
}

export function toMoney(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

