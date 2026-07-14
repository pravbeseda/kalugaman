// Invariants that span several documents, checked at build time against the parsed,
// schema-validated collections. A zod schema only ever sees one entry, and the parity
// script only sees file names — neither can tell that two languages disagree.

import { getCollection } from 'astro:content';
import { locales } from '../i18n/config';

// Same lifetime as the data: this module imports astro:content, so Vite invalidates it
// when the content changes and the checks run again on the next request.
let checked: Promise<void> | null = null;

/** Runs once per build; every page awaits it through Base. */
export function assertContentInvariants(): Promise<void> {
  checked ??= runChecks();
  return checked;
}

async function runChecks(): Promise<void> {
  const resumes = await getCollection('resume');

  const perLocale = locales.map((lang) => {
    const resume = resumes.find((entry) => entry.id === lang);
    if (!resume) throw new Error(`Missing resume for ${lang}`);
    return { lang, experience: resume.data.experience };
  });

  sameJobsInEveryLanguage(perLocale);
  currentJobAgreesAcrossLanguages(perLocale);
}

type PerLocale = { lang: string; experience: { id: string; current: boolean }[] }[];

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
