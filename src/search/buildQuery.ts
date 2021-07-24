import Post from '../entity/Post';

export function buildRecommendedPostsQuery(post: Post, minimumView: number = 1000) {
  const tagsQuery = post.tags.map(tag => ({
    match_phrase: {
      tags: tag.name,
    },
  }));
  return {
    bool: {
      must_not: {
        term: {
          _id: post.id,
        },
      },
      must: [
        {
          bool: {
            should: [
              {
                more_like_this: {
                  fields: ['title'],
                  like: post.title,
                  min_term_freq: 1,
                  min_doc_freq: 1,
                },
              },
              {
                more_like_this: {
                  fields: ['body'],
                  like: post.body,
                },
              },
              ...tagsQuery,
            ],
          },
        },
        {
          range: {
            views: {
              gte: minimumView,
            },
          },
        },
        {
          match: {
            is_private: {
              query: false,
              boost: 0,
            },
          },
        },
      ],
    },
  };
}

export function buildFallbackRecommendedPosts() {
  return {
    bool: {
      should: [
        {
          range: {
            likes: {
              gte: 25,
              boost: 2,
            },
          },
        },
        {
          range: {
            views: {
              gte: 1000,
              boost: 10,
            },
          },
        },
      ],
      must: [
        {
          range: {
            released_at: {
              gte: 'now-100d/d',
            },
          },
        },
      ],
    },
  };
}
