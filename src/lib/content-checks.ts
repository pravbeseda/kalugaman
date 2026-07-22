// Invariants that span several documents, checked at build time against the parsed,
// schema-validated collections. A zod schema only ever sees one entry, and the parity
// script only sees file names — neither can tell that two languages disagree.

import { getCollection } from 'astro:content';
import { locales } from '../i18n/config';

// Same lifetime as the data: a content edit tears this module down with the memo, so the
// checks run again on the next request (verified in dev — breaking the resume parity
// turns the page 500 without a restart).
let checked: Promise<void> | null = null;

/** Runs once per build; every page awaits it through Base. */
export function assertContentInvariants(): Promise<void> {
  checked ??= runChecks();
  return checked;
}

async function runChecks(): Promise<void> {
  await projectKindAgreesAcrossLanguages();

  const resumes = await getCollection('resume');

  const perLocale = locales.map((lang) => {
    const resume = resumes.find((entry) => entry.id === lang);
    if (!resume) throw new Error(`Missing resume for ${lang}`);
    return { lang, experience: resume.data.experience };
  });

  sameJobsInEveryLanguage(perLocale);
  currentJobAgreesAcrossLanguages(perLocale);
  projectLinkAgreesAcrossLanguages(perLocale);
}

/**
 * `kind` decides which group a project is listed under and is repeated in every
 * language's copy of the document. It also has a default, so omitting it in one language
 * does not fail the schema — the project simply moves to the other group there. The slug
 * parity script cannot see this: it only compares file names.
 */
async function projectKindAgreesAcrossLanguages(): Promise<void> {
  const projects = await getCollection('projects');

  const kindsBySlug = (lang: string) =>
    new Map(
      projects
        .filter((entry) => entry.id.startsWith(`${lang}/`))
        .map((entry) => [entry.id.slice(lang.length + 1), entry.data.kind]),
    );

  const [first, ...rest] = locales;
  const expected = kindsBySlug(first);

  for (const lang of rest) {
    const kinds = kindsBySlug(lang);
    for (const [slug, kind] of expected) {
      if (kinds.get(slug) !== kind) {
        throw new Error(
          `The projects disagree about the kind of '${slug}' ` +
            `(${first}: ${kind} — ${lang}: ${kinds.get(slug) ?? 'missing'}). ` +
            '`kind` groups the project on the list and must match in every language.',
        );
      }
    }
  }
}

type PerLocale = {
  lang: string;
  experience: { id: string; current: boolean; projectSlug?: string }[];
}[];

/** A job written up in one language only would silently vanish from the other resume. */
function sameJobsInEveryLanguage(perLocale: PerLocale): void {
  const [first, ...rest] = perLocale;
  const expected = [...first.experience.map((job) => job.id)].sort();

  for (const { lang, experience } of rest) {
    const ids = [...experience.map((job) => job.id)].sort();
    if (ids.join() !== expected.join()) {
      throw new Error(
        `The resumes list different jobs (${first.lang}: ${expected.join(', ')} — ` +
          `${lang}: ${ids.join(', ')}). Every job must be written up in every language.`,
      );
    }
  }
}

/**
 * `current` drives `worksFor` in the JSON-LD and lives in every language's resume.
 * Set it in one language only, or move it to another job, and that language alone would
 * claim an employer — a difference invisible on the built site. Compared by `id`, since
 * the entries need not be in the same order and the company names are translated.
 */
function currentJobAgreesAcrossLanguages(perLocale: PerLocale): void {
  const flagged = perLocale.map(({ lang, experience }) => ({
    lang,
    job: experience.find((entry) => entry.current)?.id ?? 'none',
  }));

  const [first, ...rest] = flagged;
  if (rest.some((other) => other.job !== first.job)) {
    const shown = flagged.map(({ lang, job }) => `${lang}: ${job}`).join(', ');
    throw new Error(
      `The resumes disagree about the current job (${shown}). \`current\` marks the job ` +
        `still held; it must be on the same job in every language.`,
    );
  }
}

/**
 * `projectSlug` links a job to its project case study and is language-independent, so it
 * must match in every language. Set it in one language only, or to a different slug, and
 * that locale's "more about the project" link would go missing or point elsewhere — a
 * difference invisible on the built site. Compared by `id`; `sameJobsInEveryLanguage` has
 * already guaranteed the id sets agree.
 */
function projectLinkAgreesAcrossLanguages(perLocale: PerLocale): void {
  const slugsById = ({ experience }: PerLocale[number]) =>
    new Map(experience.map((job) => [job.id, job.projectSlug]));

  const [first, ...rest] = perLocale;
  const expected = slugsById(first);

  for (const other of rest) {
    const slugs = slugsById(other);
    for (const [id, slug] of expected) {
      if (slugs.get(id) !== slug) {
        throw new Error(
          `The resumes disagree about the project link for job '${id}' ` +
            `(${first.lang}: ${slug ?? 'none'} — ${other.lang}: ${slugs.get(id) ?? 'none'}). ` +
            '`projectSlug` is language-independent and must match in every language.',
        );
      }
    }
  }
}
