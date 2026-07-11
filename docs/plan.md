# План: kalugaman.ru — сайт-визитка разработчика

## 1. Цели и требования

Личный сайт-визитка: резюме, проекты, контакты. Делается «для себя», без БД и админки.

Зафиксированные решения:

| Вопрос | Решение |
|---|---|
| Стек | **Astro** (SSG, ноль JS по умолчанию) |
| Структура | **Многостраничник**: главная, `/resume`, `/projects`, `/projects/<slug>`, `/contacts` |
| Доп. разделы | Не сейчас; архитектура допускает добавление (блог, about, uses) без перестройки |
| Контент | Markdown-файлы + Content Collections (типизация через zod), никакой БД |
| Мультиязычность | EN (дефолт) + RU, оба с префиксом: `/en/...`, `/ru/...`; корень `/` — серверный редирект по `Accept-Language` |
| Темы | День/ночь через CSS-токены + `data-theme`; задел под произвольные темы |
| Стили | Ванильный CSS, дизайн-токены (custom properties), mobile-first |
| PDF-резюме | Playwright print-to-PDF на этапе сборки, `cv-en.pdf` / `cv-ru.pdf` |
| Хостинг | **Свой VPS + nginx**, деплой через GitHub Actions (CI/CD) |

## 2. Архитектура

### 2.1 Принцип: контент отделён от представления

- **Контент** — только md-файлы в `src/content/` и словари UI-строк в `src/i18n/`.
- **Представление** — layouts и компоненты `.astro`, которые получают контент как данные.
- **Оформление** — дизайн-токены в одном файле; тема = набор значений токенов.

Смена дизайна/темы не трогает контент; правка текста не трогает код.

### 2.2 Структура проекта

```
kalugaman/
├── docs/
│   └── plan.md
├── public/                      # статика как есть (favicon, robots.txt)
│   └── cv/                      # cv-en.pdf, cv-ru.pdf (кладутся сборкой)
├── src/
│   ├── content/                 # ВЕСЬ контент — только md
│   │   ├── config.ts            # zod-схемы коллекций
│   │   ├── projects/
│   │   │   ├── en/<slug>.md
│   │   │   └── ru/<slug>.md
│   │   ├── resume/
│   │   │   ├── en.md            # + структурированный frontmatter (опыт, навыки)
│   │   │   └── ru.md
│   │   └── pages/               # тексты главной, контактов
│   │       ├── en/...
│   │       └── ru/...
│   ├── i18n/
│   │   ├── config.ts            # locales: ['en','ru'], default 'en'
│   │   ├── en.ts                # словарь UI-строк (навигация, кнопки, подписи)
│   │   └── ru.ts
│   ├── layouts/
│   │   ├── Base.astro           # <head>, meta, hreflang, тема-скрипт, шапка/подвал
│   │   └── PrintResume.astro    # печатный layout для PDF
│   ├── components/              # Header, Footer, ThemeToggle, LangSwitch, ProjectCard...
│   ├── styles/
│   │   ├── tokens.css           # дизайн-токены: цвета, шрифты, отступы, радиусы
│   │   ├── themes.css           # [data-theme="dark"] / "light" переопределения
│   │   └── global.css           # reset, базовая типографика
│   └── pages/
│       ├── index.astro          # корень: fallback-редирект (основной делает nginx)
│       └── [lang]/
│           ├── index.astro      # главная
│           ├── resume/
│           │   ├── index.astro
│           │   └── print.astro  # источник для PDF (noindex)
│           ├── projects/
│           │   ├── index.astro
│           │   └── [slug].astro
│           └── contacts.astro
├── scripts/
│   └── generate-pdf.mjs         # Playwright: /[lang]/resume/print → public/cv/*.pdf
├── .github/workflows/deploy.yml
└── astro.config.mjs
```

### 2.3 Контент-модель (Content Collections)

- `projects`: frontmatter — `title`, `description`, `tags[]`, `period`, `links{repo,demo}`, `featured`, `order`, `lang`; тело md — подробное описание.
- `resume`: frontmatter — структурированные данные (позиции с датами, навыки по группам, образование, языки); тело md — свободное «summary». Один источник для веб-страницы **и** PDF.
- Схемы в `src/content/config.ts` через zod: опечатка в frontmatter = ошибка сборки.

Правило паритета языков: каждый документ существует в `en/` и `ru/` с одинаковым slug. Проверка паритета — скриптом в CI (предупреждение, не ошибка).

## 3. Мультиязычность

- Astro built-in i18n: `locales: ['en', 'ru']`, `prefixDefaultLocale: true` → все страницы под `/en/` и `/ru/`.
- Корень `/`: **nginx** разбирает `Accept-Language` и отдаёт 302 на `/en/` или `/ru/`. В `src/pages/index.astro` — meta-refresh на `/en/` как fallback (если открыли build локально без nginx).
- Переключатель языка в шапке: ведёт на ту же страницу другой локали (маппинг по текущему pathname).
- `hreflang` (en, ru, x-default) — в `Base.astro` автоматически для каждой страницы.
- UI-строки — типизированные словари `src/i18n/{en,ru}.ts`; helper `t(lang, key)`. Добавление языка: локаль в конфиг + словарь + папки контента.

## 4. Темы (день/ночь)

1. Все визуальные значения — custom properties в `tokens.css` (`--color-bg`, `--color-text`, `--color-accent`, ...).
2. `themes.css`: блоки `:root` (light) и `[data-theme="dark"]`.
3. Инлайн-скрипт в `<head>` (до отрисовки): читает `localStorage.theme`, иначе `prefers-color-scheme`, ставит `data-theme` на `<html>` → нет мигания темой (FOUC).
4. `ThemeToggle` — маленький vanilla-JS островок: переключает атрибут, пишет в localStorage.
5. Новая тема в будущем = ещё один блок значений токенов.

## 5. Адаптивность

- Mobile-first: базовые стили под ~360px, расширение через `@media (min-width: ...)` (примерно 640/960/1200).
- Резиновая типографика: `clamp()` для заголовков.
- Навигация: на мобильном — компактная (бургер или нижняя панель — решить на этапе дизайна), на десктопе — обычная шапка.
- Изображения проектов — через `astro:assets` (автоматические размеры, webp/avif, lazy).

## 6. PDF-резюме

Пайплайн (этап сборки, `scripts/generate-pdf.mjs`):

1. `astro build` собирает сайт, включая печатные страницы `/en/resume/print` и `/ru/resume/print` (тот же контент из `resume`-коллекции, layout `PrintResume.astro`: одна колонка, `@page` поля, без навигации, `noindex`).
2. Скрипт поднимает `astro preview` (или отдаёт `dist/` статикой), Playwright открывает печатные страницы и делает `page.pdf()` → `dist/cv/cv-en.pdf`, `dist/cv/cv-ru.pdf`.
3. Кнопки «Download PDF» на `/resume` ссылаются на эти файлы.

Свойства результата: настоящий текстовый слой (селектится, парсится ATS/роботами), одноколоночная семантичная вёрстка, стандартные шрифты — «чистый» PDF. Один источник правды: правка `resume/en.md` обновляет и страницу, и PDF.

Обновление PDF происходит только при сборке в CI — для статического сайта это норма (контент меняется только через git).

## 7. SEO

- Чистый HTML без JS-рендеринга — контент виден роботам сразу.
- `@astrojs/sitemap` с i18n-связками; `robots.txt`.
- Мета: title/description на каждую страницу из frontmatter; Open Graph + Twitter cards.
- `hreflang` en/ru/x-default (см. §3).
- JSON-LD: `Person` на главной/резюме, `CreativeWork`/`SoftwareSourceCode` на проектах — по желанию, дёшево.
- Канонические URL; печатные страницы и корневой редирект — `noindex`.

## 8. Хостинг и CI/CD

### 8.1 VPS + nginx

- Сайт — статика в `/var/www/kalugaman/` (симлинк на релиз для атомарности: `releases/<ts>` → `current`).
- HTTPS: certbot (Let's Encrypt), автопродление; редирект 80→443 и www→apex.
- Языковой редирект корня:

```nginx
map $http_accept_language $lang_redirect {
    default   /en/;
    ~*^ru     /ru/;
    ~*,\s*ru  /ru/;
}

server {
    server_name kalugaman.ru;
    root /var/www/kalugaman/current;

    location = / {
        return 302 $lang_redirect;
    }

    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    # кэш: хэшированные ассеты Astro — навсегда, html — короткий
    location /_astro/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

- gzip/brotli, security-заголовки (CSP, X-Content-Type-Options) — на этапе настройки.

### 8.2 GitHub Actions

`deploy.yml`, триггер — push в `main`:

1. checkout → setup node → `npm ci`
2. `npm run build` (astro build)
3. `npx playwright install chromium --with-deps` → `node scripts/generate-pdf.mjs`
4. проверки: языковой паритет контента, валидность ссылок (опц. `astro check`)
5. деплой: `rsync -az --delete dist/` → VPS в `releases/<ts>`, переключение симлинка `current` (атомарно, мгновенный откат = вернуть симлинк)

Секреты в GitHub: `SSH_HOST`, `SSH_USER`, `SSH_KEY` (deploy-ключ с ограниченными правами).

## 9. Этапы работ

- [ ] **0. Каркас**: `npm create astro@latest`, git-репозиторий, структура папок, tokens/global CSS, Base layout
- [ ] **1. Контент-модель**: Content Collections + zod-схемы; черновые md (resume en/ru, 2–3 проекта en/ru, тексты главной/контактов)
- [ ] **2. i18n**: конфиг локалей, словари UI, `[lang]`-роутинг, переключатель языка, hreflang
- [ ] **3. Страницы**: главная, resume, projects (список + детальная), contacts — mobile-first вёрстка
- [ ] **4. Темы**: themes.css, инлайн-скрипт, ThemeToggle
- [ ] **5. PDF**: PrintResume layout, страница print, скрипт Playwright, кнопки скачивания
- [ ] **6. SEO**: sitemap, robots, OG/meta, JSON-LD, noindex служебных страниц
- [ ] **7. VPS**: nginx-конфиг (языковой редирект, кэш, gzip), certbot, DNS kalugaman.ru → VPS
- [ ] **8. CI/CD**: deploy.yml, секреты, атомарный rsync-деплой, проверка отката
- [ ] **9. Полировка**: Lighthouse (цель 95+ по всем метрикам), проверка ATS-парсинга PDF, реальный контент вместо черновиков

Порядок — «прогрессивный jpeg»: после этапа 3 сайт уже можно показывать, дальше каждый этап добавляет слой.

## 10. Риски и заметки

- **Мажорные апгрейды Astro** иногда меняют Content Collections API → фиксировать версию, обновляться осознанно.
- **Playwright в CI** тянет chromium (~1 мин на установку) → кэшировать браузер в Actions.
- **Паритет переводов** легко потерять → скрипт-проверка в CI (§2.3).
- **VPS** требует обслуживания (обновления, certbot) → минимизировать поверхность: только nginx + статика, без рантаймов.
- Возможные будущие разделы (блог, about, uses) = новая коллекция + страница; архитектура готова.
