import type { CurrencyCode } from "../../shared/types.js";

export const currencyOptions: Array<{ code: CurrencyCode; label: string; symbol: string }> = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
];

export const defaultCurrency: CurrencyCode = "USD";
export const currencyStorageKey = "skynode:currency";
export const currencyChangedEvent = "skynode:currency-changed";

const supportedCurrencies = new Set<CurrencyCode>(currencyOptions.map((option) => option.code));

export function normalizeCurrency(value: string | null | undefined): CurrencyCode {
  const code = value?.toUpperCase() as CurrencyCode | undefined;
  return code && supportedCurrencies.has(code) ? code : defaultCurrency;
}

export function getStoredCurrency(): CurrencyCode {
  if (typeof window === "undefined") return defaultCurrency;
  return normalizeCurrency(window.localStorage.getItem(currencyStorageKey));
}

export function storeCurrency(currency: CurrencyCode) {
  window.localStorage.setItem(currencyStorageKey, currency);
  window.dispatchEvent(new CustomEvent(currencyChangedEvent, { detail: currency }));
}

export function formatCurrencyAmount(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 0,
  }).format(amount);
}
