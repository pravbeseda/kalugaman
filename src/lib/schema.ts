// JSON-LD builders. The data comes from the content collections — nothing is
// restated here, so the markup cannot drift from the page.

import type { CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/config';

/** Stable identity for the person across pages, so the graph is one entity. */
export const personId = 'https://kalugaman.ru/#person';

interface PersonInput {
  lang: Locale;
  site: URL;
  resume: CollectionEntry<'resume'>['data'];
  contacts: CollectionEntry<'pages'>['data'];
  /** Built URL of the portrait (astro:assets), absolute-ised against `site`. */
  image: string;
  description: string;
}

export function personSchema({ lang, site, resume, contacts, image, description }: PersonInput) {
  const employer = resume.experience[0]?.company;

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personId,
    name: resume.name,
    jobTitle: resume.role,
    description,
    url: new URL(`/${lang}/`, site).href,
    image: new URL(image, site).href,
    ...(contacts.email && { email: contacts.email }),
    ...(employer && { worksFor: { '@type': 'Organization', name: employer } }),
    knowsAbout: resume.skills.flatMap((group) => group.items),
    sameAs: (contacts.socials ?? []).map((s) => s.url),
  };
}

/**
 * Only for projects whose source is public: SoftwareSourceCode is a claim about
 * code someone can go and read. Closed commercial work gets no markup.
 */
export function projectSchema(
  entry: CollectionEntry<'projects'>,
  canonical: string,
  authorName: string,
) {
  const { title, description, tags, links } = entry.data;
  if (!links.repo) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: title,
    description,
    url: canonical,
    codeRepository: links.repo,
    ...(tags.length > 0 && { programmingLanguage: tags }),
    ...(links.demo && { targetProduct: { '@type': 'SoftwareApplication', url: links.demo } }),
    author: { '@type': 'Person', '@id': personId, name: authorName },
  };
}
