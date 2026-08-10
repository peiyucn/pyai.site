// 站点支持的两种语言
export const languages = {
  zh: '中文',
  en: 'English',
} as const;

export type Locale = keyof typeof languages;

// 站点所有 UI 文案的 key
export type UIKey =
  // 导航
  | 'nav.home'
  | 'nav.blog'
  | 'nav.notes'
  | 'nav.projects'
  | 'nav.about'
  // 通用
  | 'common.readMore'
  | 'common.backHome'
  | 'common.publishedAt'
  | 'common.updatedAt'
  | 'common.tags'
  | 'common.noContent'
  | 'common.viewAll'
  | 'common.language'
  // 主页
  | 'home.heroTitle'
  | 'home.heroSubtitle'
  | 'home.recentPosts'
  | 'home.recentNotes'
  | 'home.featuredProjects'
  // 博客 / 笔记
  | 'blog.title'
  | 'blog.description'
  | 'notes.title'
  | 'notes.description'
  | 'projects.title'
  | 'projects.description'
  // 关于
  | 'about.title'
  | 'about.description'
  // 页脚
  | 'footer.tagline'
  | 'footer.rights';

// 各语言 UI 文案
export const ui: Record<Locale, Record<UIKey, string>> = {
  zh: {
    'nav.home': '首页',
    'nav.blog': '博客',
    'nav.notes': '笔记',
    'nav.projects': '项目',
    'nav.about': '关于',
    'common.readMore': '阅读全文',
    'common.backHome': '返回首页',
    'common.publishedAt': '发布于',
    'common.updatedAt': '更新于',
    'common.tags': '标签',
    'common.noContent': '暂无内容',
    'common.viewAll': '查看全部',
    'common.language': '语言',
    'home.heroTitle': '你好，我是 Pei 👋',
    'home.heroSubtitle': '用技术记录生活，用 AI 加速创造。这里是博客、笔记与项目的集合。',
    'home.recentPosts': '最新文章',
    'home.recentNotes': '最近笔记',
    'home.featuredProjects': '精选项目',
    'blog.title': '博客',
    'blog.description': '技术、生活与思考。',
    'notes.title': '笔记',
    'notes.description': '学习过程中的知识沉淀。',
    'projects.title': '项目',
    'projects.description': '我的一些开源作品。',
    'about.title': '关于',
    'about.description': '关于我。',
    'footer.tagline': '记录 · 沉淀 · 创造',
    'footer.rights': '保留所有权利',
  },
  en: {
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.notes': 'Notes',
    'nav.projects': 'Projects',
    'nav.about': 'About',
    'common.readMore': 'Read more',
    'common.backHome': 'Back to home',
    'common.publishedAt': 'Published',
    'common.updatedAt': 'Updated',
    'common.tags': 'Tags',
    'common.noContent': 'No content yet',
    'common.viewAll': 'View all',
    'common.language': 'Language',
    'home.heroTitle': "Hi, I'm Pei 👋",
    'home.heroSubtitle': 'Building with code, learning with AI. A collection of blog posts, notes and projects.',
    'home.recentPosts': 'Latest Posts',
    'home.recentNotes': 'Recent Notes',
    'home.featuredProjects': 'Featured Projects',
    'blog.title': 'Blog',
    'blog.description': 'Technology, life and thoughts.',
    'notes.title': 'Notes',
    'notes.description': 'Knowledge distilled from learning.',
    'projects.title': 'Projects',
    'projects.description': 'Some of my open-source work.',
    'about.title': 'About',
    'about.description': 'About me.',
    'footer.tagline': 'Record · Distill · Create',
    'footer.rights': 'All rights reserved',
  },
};
