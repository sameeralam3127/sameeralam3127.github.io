/**
 * Site-level settings that aren't profile content.
 *
 * Analytics is OFF by default. To enable a privacy-friendly, cookieless
 * provider, replace `{ provider: "none" }` with one of:
 *
 *   { provider: "goatcounter", code: "your-code" }        // https://www.goatcounter.com
 *   { provider: "plausible", domain: "sameeralam3127.github.io" }  // https://plausible.io
 *
 * Neither sets cookies or collects personal data, so no consent banner is
 * needed. Visitors with Do Not Track or Global Privacy Control enabled are
 * never counted.
 */
export type AnalyticsConfig =
  | { provider: "none" }
  | { provider: "goatcounter"; code: string }
  | { provider: "plausible"; domain: string; scriptSrc?: string };

export const analytics: AnalyticsConfig = { provider: "none" };
