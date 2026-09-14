import { describe, expect, it } from "vitest";
import { binaryCallProbability } from "./black-scholes";

describe("binaryCallProbability", () => {
  it("ATM 30-day call: S=100 K=100 T=30/365 r=0 sigma=0.5", () => {
    const p = binaryCallProbability({
      S: 100,
      K: 100,
      T: 30 / 365,
      r: 0,
      sigma: 0.5,
    });
    expect(Math.abs(p - 0.4714)).toBeLessThan(0.003);
  });

  it("deep ITM 1y call: S=100 K=50 T=1 r=0.05 sigma=0.2", () => {
    const p = binaryCallProbability({
      S: 100,
      K: 50,
      T: 1,
      r: 0.05,
      sigma: 0.2,
    });
    expect(Math.abs(p - 0.951)).toBeLessThan(0.003);
  });
});
