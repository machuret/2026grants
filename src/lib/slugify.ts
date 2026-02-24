export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toPathSegment(text: string | null | undefined): string {
  if (!text) return "";
  return slugify(text);
}

/** Build the canonical public URL for a grant */
export function grantPublicUrl(grant: {
  country?: string | null;
  state?: string | null;
  industry?: string | null;
  slug?: string | null;
}): string | null {
  const country = toPathSegment(grant.country);
  const state = toPathSegment(grant.state);
  const industry = toPathSegment(grant.industry);
  const slug = grant.slug;
  if (!country || !slug) return null;
  const parts = [country, state, industry, slug].filter(Boolean);
  return "/" + parts.join("/");
}

/** Generate a unique-ish slug from grant name + country */
export function generateSlug(name: string, country?: string | null): string {
  const base = slugify(name);
  const suffix = country ? "-" + slugify(country) : "";
  return base + suffix;
}
