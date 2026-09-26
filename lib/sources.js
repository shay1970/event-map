// News feeds shown in the "חדשות" tab. Add a source with one line.
// Reuters and AP publish no public RSS; Google News covers their headlines.
export const SOURCES = [
  {"id":"gnews-geo","name":"Google News · גאופוליטיקה","lang":"en","url":"https://news.google.com/rss/search?q=(sanctions+OR+tariffs+OR+strike+OR+invasion+OR+ceasefire+OR+OPEC)+when:1d&hl=en-US&gl=US&ceid=US:en"},
  {"id":"gnews-biz","name":"Google News · Business","lang":"en","url":"https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en"},
  {"id":"bloomberg-markets","name":"Bloomberg Markets","lang":"en","url":"https://feeds.bloomberg.com/markets/news.rss"},
  {"id":"bloomberg-economics","name":"Bloomberg Economics","lang":"en","url":"https://feeds.bloomberg.com/economics/news.rss"},
  {"id":"wsj-markets","name":"Wall Street Journal","lang":"en","url":"https://feeds.content.dowjones.io/public/rss/RSSMarketsMain"},
  {"id":"ft","name":"Financial Times","lang":"en","url":"https://www.ft.com/rss/home/international"},
  {"id":"yahoo-finance","name":"Yahoo Finance","lang":"en","url":"https://finance.yahoo.com/news/rssindex"},
  {"id":"marketwatch","name":"MarketWatch","lang":"en","url":"https://feeds.content.dowjones.io/public/rss/mw_topstories"},
  {"id":"cnbc-world","name":"CNBC World","lang":"en","url":"https://www.cnbc.com/id/100727362/device/rss/rss.html"},
  {"id":"cnbc-economy","name":"CNBC Economy","lang":"en","url":"https://www.cnbc.com/id/20910258/device/rss/rss.html"},
  {"id":"bbc-world","name":"BBC World","lang":"en","url":"https://feeds.bbci.co.uk/news/world/rss.xml"},
  {"id":"bbc-biz","name":"BBC Business","lang":"en","url":"https://feeds.bbci.co.uk/news/business/rss.xml"},
  {"id":"aljazeera","name":"Al Jazeera","lang":"en","url":"https://www.aljazeera.com/xml/rss/all.xml"},
  {"id":"guardian-world","name":"The Guardian World","lang":"en","url":"https://www.theguardian.com/world/rss"},
  {"id":"nyt-world","name":"NYT World","lang":"en","url":"https://rss.nytimes.com/services/xml/rss/nyt/World.xml"},
];
