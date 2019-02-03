import { gql, IResolvers } from 'apollo-server-koa';
import Series from '../entity/Series';
import { seriesPostsLoader } from '../entity/SeriesPosts';

export const typeDef = gql`
  type Series {
    id: ID!
    user: User
    name: String
    description: String
    url_slug: String
    created_at: Date
    updated_at: Date
    series_posts: [SeriesPost]
  }
  type SeriesPost {
    id: ID!
    index: Int
    post: Post
  }
  extend type Query {
    series(series_id: String, username: String, url_slug: String): Series
  }
`;
export const resolvers: IResolvers = {
  Series: {
    series_posts: async (parent: Series) => {
      return seriesPostsLoader.load(parent.id);
    }
  },
  Query: {}
};
