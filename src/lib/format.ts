/** The word for `count` of something: plural("entry", "entries", 1) is "entry". */
export const plural = (one: string, many: string, count: number): string =>
  count === 1 ? one : many;

/** A count with its noun: counted("entry", "entries", 43) is "43 entries". */
export const counted = (one: string, many: string, count: number): string =>
  `${count} ${plural(one, many, count)}`;
