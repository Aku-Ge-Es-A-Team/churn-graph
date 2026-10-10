/** Number of pages for `total` items at `size` per page (at least 1, so an empty list still has page 1). */
export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Items on page `page` (0-based), with the page clamped into range. */
export function pageOf<T>(items: readonly T[], page: number, size: number): { items: T[]; page: number; pages: number } {
  const pages = pageCount(items.length, size);
  const p = Math.min(Math.max(0, page), pages - 1);
  return { items: items.slice(p * size, p * size + size), page: p, pages };
}
