import { nextCode, toMoney } from './codes';

describe('Utilidades de códigos y moneda', () => {
  it('genera el siguiente consecutivo conservando el prefijo', () => {
    expect(nextCode('PR', ['PR-000001', 'PR-000041'], 6)).toBe('PR-000042');
    expect(nextCode('RF', [], 6)).toBe('RF-000001');
  });

  it('redondea valores monetarios a dos decimales', () => {
    expect(toMoney(66666.666)).toBe(66666.67);
    expect(toMoney(undefined)).toBe(0);
    expect(toMoney('no-numérico')).toBe(0);
  });
});
