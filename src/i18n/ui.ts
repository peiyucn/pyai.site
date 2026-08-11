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
  | 'nav.movies'
  | 'nav.about'
  // 通用
  | 'common.readMore'
  | 'common.publishedAt'
  | 'common.updatedAt'
  | 'common.tags'
  | 'common.noContent'
  // 博客 / 笔记
  | 'blog.title'
  | 'blog.description'
  | 'notes.title'
  | 'notes.description'
  | 'projects.title'
  | 'projects.description'
  | 'movies.title'
  | 'movies.description'
  | 'movies.stats'
  | 'movies.watched'
  | 'movies.watching'
  | 'movies.wishlist'
  | 'movies.rating'
  | 'movies.date'
  | 'movies.comment'
  | 'movies.year'
  | 'movies.years'
  | 'movies.byYear'
  | 'movies.byRating'
  | 'movies.byStatus'
  | 'movies.byDirector'
  | 'movies.byGenre'
  | 'movies.byReleaseYear'
  | 'movies.total'
  | 'movies.viewStats'
  | 'movies.backToList'
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
    'nav.movies': '观影',
    'nav.about': '关于',
    'common.readMore': '阅读全文',
    'common.publishedAt': '发布于',
    'common.updatedAt': '更新于',
    'common.tags': '标签',
    'common.noContent': '暂无内容',
    'blog.title': '博客',
    'blog.description': '技术、生活与思考。',
    'notes.title': '笔记',
    'notes.description': '学习过程中的知识沉淀。',
    'projects.title': '项目',
    'projects.description': '我的一些开源作品。',
    'movies.title': '观影',
    'movies.description': '我的豆瓣观影记录，由 douban-sync 自动同步。',
    'movies.stats': '统计',
    'movies.watched': '看过',
    'movies.watching': '在看',
    'movies.wishlist': '想看',
    'movies.rating': '评分',
    'movies.date': '标记日期',
    'movies.comment': '短评',
    'movies.year': '年',
    'movies.years': '年',
    'movies.byYear': '按标记年份',
    'movies.byRating': '按评分',
    'movies.byStatus': '状态',
    'movies.byDirector': '导演 Top',
    'movies.byGenre': '类型 Top',
    'movies.byReleaseYear': '按上映年份',
    'movies.total': '共',
    'movies.viewStats': '查看统计',
    'movies.backToList': '返回明细',
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
    'nav.movies': 'Movies',
    'nav.about': 'About',
    'common.readMore': 'Read more',
    'common.publishedAt': 'Published',
    'common.updatedAt': 'Updated',
    'common.tags': 'Tags',
    'common.noContent': 'No content yet',
    'blog.title': 'Blog',
    'blog.description': 'Technology, life and thoughts.',
    'notes.title': 'Notes',
    'notes.description': 'Knowledge distilled from learning.',
    'projects.title': 'Projects',
    'projects.description': 'Some of my open-source work.',
    'movies.title': 'Movies',
    'movies.description': 'My Douban watchlist, auto-synced by douban-sync.',
    'movies.stats': 'Stats',
    'movies.watched': 'Watched',
    'movies.watching': 'Watching',
    'movies.wishlist': 'Wishlist',
    'movies.rating': 'Rating',
    'movies.date': 'Marked',
    'movies.comment': 'Comment',
    'movies.year': '',
    'movies.years': 'yrs',
    'movies.byYear': 'By marked year',
    'movies.byRating': 'By rating',
    'movies.byStatus': 'Status',
    'movies.byDirector': 'Top directors',
    'movies.byGenre': 'Top genres',
    'movies.byReleaseYear': 'By release year',
    'movies.total': 'Total',
    'movies.viewStats': 'View stats',
    'movies.backToList': 'Back to list',
    'about.title': 'About',
    'about.description': 'About me.',
    'footer.tagline': 'Record · Distill · Create',
    'footer.rights': 'All rights reserved',
  },
};
