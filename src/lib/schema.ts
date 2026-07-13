// JSON-LD builders. The data comes from the content collections — nothing is
// restated here, so the markup cannot drift from the page.

import type { CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/config';

/**
 * One identity per language: the name and the job title are given in that language,
 * so a single cross-language @id would have the entity claiming two different names.
 * The two projections are tied together by the profiles they share in `sameAs`.
 * Within a language every page emits the same node.
 */
const personIdFor = (site: URL, lang: Locale) => new URL(`/${lang}/#person`, site).href;

interface PersonInput {
  lang: Locale;
  site: URL;
  resume: CollectionEntry<'resume'>['data'];
  contacts: CollectionEntry<'pages'>['data'];
  /** Home page frontmatter — the one text that describes the person, not a page. */
  home: CollectionEntry<'pages'>['data'];
  /** Built URL of the portrait (astro:assets), absolute-ised against `site`. */
  image: string;
}

export function personSchema({ lang, site, resume, contacts, home, image }: PersonInput) {
  const employer = resume.experience.find((job) => job.current)?.company;

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personIdFor(site, lang),
    name: resume.name,
    jobTitle: resume.role,
    description: home.description,
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
interface ProjectInput {
  entry: CollectionEntry<'projects'>;
  lang: Locale;
  site: URL;
  canonical: string;
  authorName: string;
}

export function projectSchema({ entry, lang, site, canonical, authorName }: ProjectInput) {
  const { title, description, tags, links } = entry.data;
  if (!links.repo) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: title,
    description,
    url: canonical,
    codeRepository: links.repo,
    // Tags are technologies, not languages — mostly libraries and frameworks. `keywords`
    // says exactly that; `programmingLanguage` would claim Tailwind is one.
    ...(tags.length > 0 && { keywords: tags }),
    ...(links.demo && { targetProduct: { '@type': 'SoftwareApplication', url: links.demo } }),
    author: { '@type': 'Person', '@id': personIdFor(site, lang), name: authorName },
  };
}
