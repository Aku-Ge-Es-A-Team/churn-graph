import { describe, expect, test } from "bun:test";
import { pageCount, pageOf } from "@/lib/paginate";

describe("pageOf", () => {
  const items = Array.from({ length: 14 }, (_, i) => i);

  test("splits into pages of 6 (3 × 2 grid)", () => {
    expect(pageCount(14, 6)).toBe(3);
    expect(pageOf(items, 0, 6).items).toEqual([0, 1, 2, 3, 4, 5]);
    expect(pageOf(items, 2, 6).items).toEqual([12, 13]);
  });

  test("clamps the page into range", () => {
    expect(pageOf(items, 9, 6).page).toBe(2);
    expect(pageOf(items, -1, 6).page).toBe(0);
  });

  test("an empty list still has one page", () => {
    expect(pageOf([], 0, 6)).toEqual({ items: [], page: 0, pages: 1 });
  });
});
