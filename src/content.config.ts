import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Общая часть: язык извлекаем из id (en/<slug> | ru/<slug>).
// Схемы через zod — опечатка во frontmatter = ошибка сборки.

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    period: z.string(),
    links: z
      .object({
        repo: z.string().url().optional(),
        demo: z.string().url().optional(),
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
    experience: z.array(
      z.object({
        company: z.string(),
        position: z.string(),
        period: z.string(),
        highlights: z.array(z.string()),
      })
    ),
    skills: z.array(
      z.object({
        group: z.string(),
        items: z.array(z.string()),
      })
    ),
    education: z.array(
      z.object({
        place: z.string(),
        degree: z.string(),
        period: z.string(),
      })
    ),
    languages: z.array(z.object({ name: z.string(), level: z.string() })),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // произвольный frontmatter для конкретных страниц (главная, контакты)
    tagline: z.string().optional(),
    email: z.string().optional(),
    socials: z
      .array(z.object({ label: z.string(), url: z.string().url() }))
      .optional(),
  }),
});

export const collections = { projects, resume, pages };
