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
  | 'projects.lastUpdated'
  | 'movies.title'
  | 'movies.description'
  | 'movies.syncedAt'
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
  | 'movies.byRatingGap'
  | 'movies.myVsDouban'
  | 'movies.gap'
  | 'movies.filterAll'
  | 'movies.filterMovie'
  | 'movies.filterTv'
  // 关于
  | 'about.title'
  | 'about.description'
  // 页脚
  | 'footer.tagline'
  | 'footer.rights'
  | 'footer.poweredBy'
  // 首页
  | 'hero.workingWith'
  // 聊天入口（内页迷你黑洞按钮）
  | 'chat.label'
  | 'chat.comingSoon';

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
    'records.description': '博客、笔记与思考',
    'projects.title': '项目',
    'projects.description': 'pyai 的一些开源作品。',
    'projects.lastUpdated': '最后更新于 {date} by GitHub Action',
    'movies.title': '观影',
    'movies.description': 'pyai 的观影记录',
    'movies.syncedAt': '最后更新于 {date} by GitHub Action',
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
    'movies.byRatingGap': '并不觉得好的电影 Top 10',
    'movies.myVsDouban': '我的 / 豆瓣',
    'movies.gap': '差距',
    'movies.filterAll': '全部',
    'movies.filterMovie': '电影',
    'movies.filterTv': '剧集',
    'about.title': '关于',
    'about.description': '关于 pyai。',
    'footer.tagline': '记录 · 沉淀 · 炼化 · 创造',
    'footer.rights': '保留所有权利',
    'footer.poweredBy': 'Powered by',
    'hero.workingWith': 'working with',
    'chat.label': '与 pyai 分身聊天',
    'chat.comingSoon': '真身炼化中，pyai chat 不一定啥时候有。',
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
    'records.description': 'Blog, notes and thoughts',
    'projects.title': 'Projects',
    'projects.description': 'Some open-source work of pyai.',
    'projects.lastUpdated': 'Last updated {date} by GitHub Action',
    'movies.title': 'Movies',
    'movies.description': "pyai's movie diary",
    'movies.syncedAt': 'Last updated {date} by GitHub Action',
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
    'movies.byRatingGap': "Top 10 movies I didn't think were good",
    'movies.myVsDouban': 'Mine / Douban',
    'movies.gap': 'Gap',
    'movies.filterAll': 'All',
    'movies.filterMovie': 'Films',
    'movies.filterTv': 'Series',
    'about.title': 'About',
    'about.description': 'About pyai.',
    'footer.tagline': 'Record · Distill · Refine · Create',
    'footer.rights': 'All rights reserved',
    'footer.poweredBy': 'Powered by',
    'hero.workingWith': 'working with',
    'chat.label': 'Chat with pyai',
    'chat.comingSoon': 'Still refining the real me — pyai chat has no ETA yet.',
  },
};
