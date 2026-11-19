/**
 * A typed or pasted query as lowercase search terms. A pasted URL loses its
 * scheme, `www.`, query string and trailing slash, because addresses are stored
 * bare and the paste would otherwise never match.
 */
export const normalizeQuery = (raw: string): string[] =>
  raw
    .toLowerCase()
    .split(/\s+/)
    .map((term) =>
      term
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/[#?].*$/, "")
        .replace(/\/+$/, ""),
    )
    .filter(Boolean);
