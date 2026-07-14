export default {
  'nav.home': 'Home',
  'nav.resume': 'Resume',
  'nav.projects': 'Projects',
  'nav.contacts': 'Contacts',
  // Names a landmark, so it does not name the role: the screen reader appends that itself
  // ("Primary" → "Primary navigation"). The Russian label follows the same rule.
  'nav.primary': 'Primary',
  'nav.menu': 'Menu',
  'a11y.skip': 'Skip to content',
  'home.cta.projects': 'View projects',
  'home.cta.resume': 'Read resume',
  'home.featured': 'Featured projects',
  'resume.experience': 'Experience',
  'resume.skills': 'Skills',
  'resume.education': 'Education',
  'resume.languages': 'Languages',
  'resume.download': 'Download PDF',
  'projects.all': 'All projects',
  'projects.tags': 'Stack',
  'projects.repo': 'Source',
  'projects.demo': 'Live demo',
  'projects.back': 'Back to projects',
  'contacts.title': 'Get in touch',
  'contacts.email': 'Email',
  // The button's *name*: the theme it turns on, not the act of switching — it is a toggle
  // button, and aria-pressed says whether that theme is the one in force. A name that named
  // the action ("Switch to light theme") would contradict the state it is paired with.
  'theme.dark': 'Dark theme',
  // The button's *tooltip*, which is a different audience: a sighted mouse user, who never
  // hears aria-pressed and can already see the theme in the icon. What they lack is the
  // knowledge that the icon is a control at all — so the tooltip names the action.
  'theme.toggle': 'Toggle theme',
  'lang.switch': 'Русский',
  'notfound.title': 'Page not found',
  'notfound.text': 'The page you are looking for does not exist, or has moved.',
  'notfound.home': 'Go to the homepage',
  'footer.built': 'Built with Astro · content in Markdown',
} as const;
