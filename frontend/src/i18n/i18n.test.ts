import { describe, expect, it } from "vitest";
import { ar } from "./locales/ar";
import { en } from "./locales/en";
import { fr } from "./locales/fr";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("locales", () => {
  for (const [name, catalog] of [["fr", fr], ["ar", ar]] as const) {
    it(`${name} has exactly the same keys as en`, () => {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(en).sort());
    });

    it(`${name} keeps every {placeholder} used in en`, () => {
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(placeholders(catalog[key]), key).toEqual(placeholders(en[key]));
      }
    });

    it(`${name} has no empty strings`, () => {
      for (const [key, value] of Object.entries(catalog)) expect(value.trim(), key).not.toBe("");
    });
  }
});
