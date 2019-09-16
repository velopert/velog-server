import esClient from './esClient';

export default async function keywordSearch(keyword: string, from: number = 0, size: number = 20) {
  const result = await esClient.search({
    index: 'posts',
    body: {
      from,
      size,
      query: {
        script_score: {
          query: {
            bool: {
              should: [
                {
                  match_phrase: {
                    title: {
                      query: keyword,
                      boost: 15
                    }
                  }
                },
                {
                  match_phrase: {
                    'title.raw': {
                      query: keyword,
                      boost: 15
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
          },
          script: {
            source: "_score + doc['likes'].value * 5 + doc['views'].value * 0.005"
          }
        }
      }
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
