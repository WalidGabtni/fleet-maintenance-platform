export const SUPPORTED_CURRENCIES = ["CAD", "USD", "EUR"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function formatCurrency(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(amount);
}
