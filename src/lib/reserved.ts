// Reserved first path segments — forbidden as a redirect "who", a user slug, and a provider id.
export const RESERVED_TOP = new Set(["index", "about", ".well-known"]);

// Reserved page slugs under /index/{provider}/ — an authored collection slug may not be one of these.
export const RESERVED_VIEW = new Set(["deprecated"]);
