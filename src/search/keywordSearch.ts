import esClient from './esClient';

type KeywordSearchParams = {
  keyword: string;
  from: number;
  size: number;
  username?: string;
  signedUserId?: string | null;
};

export default async function keywordSearch({
  keyword,
  from = 0,
  size = 20,
  username,
  signedUserId
}: KeywordSearchParams) {
  const query = {
    script_score: {
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      title: {
                        query: keyword,
                        boost: 35
                      }
                    }
                  },
                  {
                    match_phrase: {
                      'title.raw': {
                        query: keyword,
                        boost: 35
                      }
                    }
                  },
                  {
                    match_phrase: {
                      body: {
                        query: keyword,
                        boost: 1
                      }
                    }
                  },
                  {
                    match_phrase: {
                      'body.raw': {
                        query: keyword,
                        boost: 1
                      }
                    }
                  }
                ]
              }
            }
          ] as any[]
        }
      },
      script: {
        source: "_score + doc['likes'].value * 3 + doc['views'].value * 0.005"
      }
    }
  };

  // handle user search
  if (username) {
    query.script_score.query.bool.must.push({
      term: {
        'user.username': {
          value: username,
          boost: 0
        }
      }
    });
  }

  // hides private posts except signed users's private posts
  const privatePostsQuery = {
    bool: {
      should: [
        {
          match: {
            is_private: {
              query: false,
              boost: 0
            }
          }
        }
      ] as any[]
    }
  };

  if (signedUserId) {
    privatePostsQuery.bool.should.push({
      bool: {
        must: [
          {
            match: {
              is_private: {
                query: true,
                boost: 0
              }
            }
          },
          {
            match_phrase: {
              'user.id': {
                query: signedUserId,
                boost: 0
              }
            }
          }
        ]
      }
    });
  }

  query.script_score.query.bool.must.push(privatePostsQuery);

  const result = await esClient.search({
    index: 'posts',
    body: {
      from,
      size,
      query
    }
  });

  const posts = result.body.hits.hits.map((hit: any) => hit._source);
  posts.forEach((p: any) => {
    p.released_at = new Date(p.released_at);
  });
  const data = {
    count: result.body.hits.total.value,
    posts: result.body.hits.hits.map((hit: any) => hit._source)
  };

  return data;
}
