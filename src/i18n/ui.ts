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
  | 'nav.records'
  | 'nav.projects'
  | 'nav.movies'
  | 'nav.about'
  // 通用
  | 'common.readMore'
  | 'common.publishedAt'
  | 'common.updatedAt'
  | 'common.tags'
  | 'common.noContent'
  | 'common.allTags'
  // 记录
  | 'records.title'
  | 'records.description'
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
  | 'movies.doubanRating'
  | 'movies.myRating'
  | 'movies.country'
  | 'movies.prevPage'
  | 'movies.nextPage'
  | 'movies.cardNav'
  | 'movies.mine'
  | 'movies.douban'
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
    'nav.records': '记录',
    'nav.projects': '项目',
    'nav.movies': '观影',
    'nav.about': '关于',
    'common.readMore': '阅读全文',
    'common.publishedAt': '发布于',
    'common.updatedAt': '更新于',
    'common.tags': '标签',
    'common.noContent': '暂无内容',
    'common.allTags': '全部',
    'records.title': '记录',
    'records.description': '博客、笔记与思考，用标签区分内容类型。',
    'projects.title': '项目',
    'projects.description': 'pyai 的一些开源作品。',
    'movies.title': '观影',
    'movies.description': 'pyai 的观影记录，每日自动同步。',
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
    'movies.doubanRating': '豆瓣评分',
    'movies.myRating': '我的评分',
    'movies.country': '制片地区',
    'movies.prevPage': '上一页',
    'movies.nextPage': '下一页',
    'movies.cardNav': '统计卡片',
    'movies.mine': '我的',
    'movies.douban': '豆瓣',
    'movies.viewStats': '查看统计',
    'movies.backToList': '返回明细',
    'about.title': '关于',
    'about.description': '关于 pyai。',
    'footer.tagline': '记录 · 沉淀 · 创造',
    'footer.rights': '保留所有权利',
  },
  en: {
    'nav.home': 'Home',
    'nav.records': 'Records',
    'nav.projects': 'Projects',
    'nav.movies': 'Movies',
    'nav.about': 'About',
    'common.readMore': 'Read more',
    'common.publishedAt': 'Published',
    'common.updatedAt': 'Updated',
    'common.tags': 'Tags',
    'common.noContent': 'No content yet',
    'common.allTags': 'All',
    'records.title': 'Records',
    'records.description': 'Blog, notes and thoughts, tagged by content type.',
    'projects.title': 'Projects',
    'projects.description': 'Some open-source work of pyai.',
    'movies.title': 'Movies',
    'movies.description': "pyai's movie diary, auto-synced daily.",
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
    'movies.doubanRating': 'Douban rating',
    'movies.myRating': 'My rating',
    'movies.country': 'Country',
    'movies.prevPage': 'Prev',
    'movies.nextPage': 'Next',
    'movies.cardNav': 'Stat cards',
    'movies.mine': 'Mine',
    'movies.douban': 'Douban',
    'movies.viewStats': 'View stats',
    'movies.backToList': 'Back to list',
    'about.title': 'About',
    'about.description': 'About pyai.',
    'footer.tagline': 'Record · Distill · Create',
    'footer.rights': 'All rights reserved',
  },
};
