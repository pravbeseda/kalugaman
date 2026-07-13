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
  'notfound.title': 'Страница не найдена',
  'notfound.text': 'Такой страницы нет — возможно, она переехала или в ссылке опечатка.',
  'notfound.home': 'На главную',
  'footer.built': 'Собрано на Astro · контент в Markdown',
  'og.alt': 'Александр Иванов — Senior Angular-разработчик',
};

export default ru;
