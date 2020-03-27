import Router from '@koa/router';
import { sitemapIndex, generalSitemap, postsSitemap } from './sitemaps.ctrl';

const sitemaps = new Router();

sitemaps.get('/index.xml', sitemapIndex);
sitemaps.get('/general.xml', generalSitemap);
sitemaps.get('/posts-:month.xml', postsSitemap);

export default sitemaps;
