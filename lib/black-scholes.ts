// Abramowitz-Stegun 7.1.26 erf approximation (|error| < 1.5e-7).
// Avoids depending on mathjs's erf, which is not exported consistently.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * Math.abs(x));
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

/** Standard normal CDF via N(x) = 0.5 * (1 + erf(x / sqrt(2))) */
export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export interface BinaryCallParams {
  /** spot price of the underlying */
  S: number;
  /** strike / threshold */
  K: number;
  /** time to expiry in years */
  T: number;
  /** continuously compounded risk-free rate */
  r: number;
  /** volatility, decimal (e.g. 0.5 = 50%) */
  sigma: number;
}

/**
 * Discounted risk-neutral probability of S_T >= K under Black-Scholes:
 *   d2 = (ln(S/K) + (r - sigma^2/2) * T) / (sigma * sqrt(T))
 *   result = exp(-rT) * N(d2)
 */
export function binaryCallProbability({
  S,
  K,
  T,
  r,
  sigma,
}: BinaryCallParams): number {
  if (S <= 0 || K <= 0 || sigma <= 0) {
    throw new Error("S, K and sigma must be positive");
  }
  if (T <= 0) return S >= K ? 1 : 0;
  const d2 =
    (Math.log(S / K) + (r - 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  return Math.exp(-r * T) * normalCdf(d2);
}
