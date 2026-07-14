// Invariants that span several documents, checked at build time against the parsed,
// schema-validated collections. A zod schema only ever sees one entry, and the parity
// script only sees file names — neither can tell that two languages disagree.

import { getCollection } from 'astro:content';
import { locales } from '../i18n/config';

let checked: Promise<void> | null = null;

/** Runs once per build; every page awaits it through Base. */
export function assertContentInvariants(): Promise<void> {
  checked ??= runChecks();
  return checked;
}

async function runChecks(): Promise<void> {
  await currentJobAgreesAcrossLanguages();
}

/**
 * `current` drives `worksFor` in the JSON-LD and lives in every language's resume.
 * Set it in one language only and that language alone would claim an employer — a
 * difference invisible on the built site.
 */
async function currentJobAgreesAcrossLanguages(): Promise<void> {
  const resumes = await getCollection('resume');

  const flagged = locales.map((lang) => {
    const resume = resumes.find((entry) => entry.id === lang);
    if (!resume) throw new Error(`Missing resume for ${lang}`);
    return { lang, index: resume.data.experience.findIndex((job) => job.current) };
  });

  const [first, ...rest] = flagged;
  if (rest.some((other) => other.index !== first.index)) {
    const shown = flagged
      .map(({ lang, index }) => `${lang}: ${index === -1 ? 'none' : `job #${index + 1}`}`)
      .join(', ');
    throw new Error(
      `The resumes disagree about the current job (${shown}). \`current\` marks the job ` +
        `still held; it must be on the same entry in every language.`,
    );
  }
}
