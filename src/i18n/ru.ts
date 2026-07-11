import type en from './en';

const ru: Record<keyof typeof en, string> = {
  'nav.home': 'Главная',
  'nav.resume': 'Резюме',
  'nav.projects': 'Проекты',
  'nav.contacts': 'Контакты',
  'home.cta.projects': 'Смотреть проекты',
  'home.cta.resume': 'Читать резюме',
  'home.featured': 'Избранные проекты',
  'resume.experience': 'Опыт',
  'resume.skills': 'Навыки',
  'resume.education': 'Образование',
  'resume.languages': 'Языки',
  'resume.download': 'Скачать PDF',
  'projects.all': 'Все проекты',
  'projects.tags': 'Стек',
  'projects.repo': 'Исходники',
  'projects.demo': 'Демо',
  'projects.back': 'К списку проектов',
  'contacts.title': 'Связаться',
  'contacts.email': 'Почта',
  'theme.toggle': 'Сменить тему',
  'lang.switch': 'English',
  'footer.built': 'Собрано на Astro · контент в Markdown',
};

export default ru;
