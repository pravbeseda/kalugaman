import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Locale is derived from the entry id (en/<slug> | ru/<slug>).

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    period: z.string(),
    // A button per link, rendered in array order. `type` drives the default label
    // (i18n key `projects.<type>`) and the JSON-LD mapping in src/lib/schema.ts;
    // `label` overrides the caption when the default does not fit.
    links: z
      .array(
        z.object({
          type: z.enum(['repo', 'website', 'docs', 'article']),
          url: z.url(),
          label: z.string().optional(),
        }),
      )
      .default([]),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

const resume = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resume' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    location: z.string(),
    experience: z
      .array(
        z.object({
          // Language-independent handle for the job. Company names are translated, so
          // nothing else identifies the same entry across the two resumes.
          id: z.string(),
          company: z.string(),
          position: z.string(),
          period: z.string(),
          // The job still held. `period` is free-form prose, so being current cannot be
          // read off it, and it must not be inferred from the order of the entries.
          current: z.boolean().default(false),
          // Slug of a related project page (`src/content/projects/<lang>/<slug>`). When set,
          // the CV shows a screen-only "more about the project" link — the resume entry stays
          // a self-contained summary; the project page is the expanded case study. Omitted in
          // print, where a link cannot be followed. Language-independent: same slug both langs.
          projectSlug: z.string().optional(),
          // The job's one-line summary, rendered as a lead paragraph above the bullets.
          summary: z.string(),
          // Achievement bullets under the summary. A job may have none (a one-line entry).
          highlights: z.array(z.string()).default([]),
        }),
      )
      // Two current jobs would make `worksFor` fall back to file order — the very thing
      // the flag exists to avoid.
      .refine((jobs) => jobs.filter((job) => job.current).length <= 1, {
        message: 'at most one experience entry may be marked `current`',
      })
      // The id identifies a job across languages, which it cannot do if two jobs share
      // one: the cross-language checks would still line up and the lookups would fall
      // back to file order.
      .refine((jobs) => new Set(jobs.map((job) => job.id)).size === jobs.length, {
        message: 'experience ids must be unique within a resume',
      }),
    skills: z.array(
      z.object({
        group: z.string(),
        items: z.array(z.string()),
      }),
    ),
    education: z.array(
      z.object({
        place: z.string(),
        degree: z.string(),
        period: z.string(),
      }),
    ),
    languages: z.array(z.object({ name: z.string(), level: z.string() })),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // page-specific optional frontmatter (home, contacts)
    tagline: z.string().optional(),
    email: z.string().optional(),
    socials: z.array(z.object({ label: z.string(), url: z.url() })).optional(),
  }),
});

export const collections = { projects, resume, pages };
