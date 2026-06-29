import type { Entry } from "./types";

const files = import.meta.glob("../../data/entries/*.json", {
  import: "default",
  eager: true,
}) as Record<string, Entry[]>;

export const entries: Entry[] = Object.values(files).flat();
