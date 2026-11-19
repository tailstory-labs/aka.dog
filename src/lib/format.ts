/** The word for `count` of something: plural("entry", "entries", 1) is "entry". */
export const plural = (one: string, many: string, count: number): string =>
  count === 1 ? one : many;

/** A count with its noun: counted("entry", "entries", 43) is "43 entries". */
export const counted = (one: string, many: string, count: number): string =>
  `${count} ${plural(one, many, count)}`;

/** A provider slug as a name: providerName("microsoft") is "Microsoft". */
export const providerName = (provider: string): string =>
  provider.charAt(0).toUpperCase() + provider.slice(1);
