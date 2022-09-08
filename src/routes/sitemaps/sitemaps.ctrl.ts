import format from 'date-fns/format';
import subMonths from 'date-fns/subMonths';
import { Middleware } from '@koa/router';
import { getRepository, Not } from 'typeorm';
import Post from '../../entity/Post';

type SitemapLink = {
  location: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
};

function listAllMonths() {
  let date = new Date();
  const months: string[] = [];

  while (format(date, 'yyyy-MM') !== '2018-08') {
    months.push(format(date, 'yyyy-MM'));
    date = subMonths(date, 1);
  }

  return months;
}

function generateSitemap(links: SitemapLink[]) {
  const urls = links
    .map(
      link => `<url>
<loc>${link.location}</loc>
${link.lastmod ? `<lastmod>${link.lastmod}</lastmod>` : ''}
${link.changefreq ? `<changefreq>${link.changefreq}</changefreq>` : ''}
${link.priority ? `<priority>${link.priority}</priority>` : ''}
</url>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;
  return xml;
}

export const sitemapIndex: Middleware = async ctx => {
  const months = listAllMonths();

  const postCount = await getRepository(Post).count({
    where: {
      is_temp: false,
      is_private: false,
    },
  });

  const pages = Math.floor(postCount / 2500);
  const array = new Array(pages).fill(0).map((_, i) => i + 1);

  const sitemaps = array
    .map(page => `https://velog.io/sitemaps/posts-${page}.xml`)
    .concat('https://velog.io/sitemaps/general.xml')
    .map(location => `<sitemap><loc>${location}</loc></sitemap>`)
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  ctx.set('Content-Type', 'text/xml');
  ctx.body = xml;
};

export const generalSitemap: Middleware = ctx => {
  const links: SitemapLink[] = [
    {
      location: 'https://velog.io/',
      changefreq: 'daily',
      priority: 1,
    },
    {
      location: 'https://velog.io/recent',
      changefreq: 'always',
      priority: 1,
    },
    {
      location: 'https://velog.io/tags',
      changefreq: 'weekly',
      priority: 0.8,
    },
  ];

  ctx.set('Content-Type', 'text/xml');
  ctx.body = generateSitemap(links);
};

export const postsSitemap: Middleware = async ctx => {
  ctx.set('Content-Type', 'text/xml');
  const page = parseInt(ctx.params.page, 10);

  // ctx.body = { firstDay, lastDay };
  try {
    const posts = await getRepository(Post)
      .createQueryBuilder('post')
      .select(['post.id', 'user', 'post.url_slug', 'post.updated_at', 'post.released_at'])
      .leftJoin('post.user', 'user')
      .where('is_temp = false')
      .andWhere('is_private = false')
      .offset((page - 1) * 2500)
      .limit(2500)
      .orderBy('released_at', 'ASC')
      .getMany();

    console.log(posts);
    const links: SitemapLink[] = posts.map(post => ({
      location: `https://velog.io/@${post.user.username}/${encodeURI(post.url_slug)}`,
      // TODO: implement release_updated_at
      // lastmod: new Date(post.updated_at).toISOString(),
      priority: 0.5,
      changefreq: 'weekly',
    }));
    ctx.body = generateSitemap(links);
  } catch (e) {
    console.log(e);
  }
};
