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
    links: z
      .object({
        repo: z.url().optional(),
        demo: z.url().optional(),
      })
      .default({}),
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
          company: z.string(),
          position: z.string(),
          period: z.string(),
          // The job still held. `period` is free-form prose, so being current cannot be
          // read off it, and it must not be inferred from the order of the entries.
          current: z.boolean().default(false),
          highlights: z.array(z.string()),
        }),
      )
      // Two current jobs would make `worksFor` fall back to file order — the very thing
      // the flag exists to avoid.
      .refine((jobs) => jobs.filter((job) => job.current).length <= 1, {
        message: 'at most one experience entry may be marked `current`',
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
