import { gql, IResolvers, ApolloError } from 'apollo-server-koa';
import { ApolloContext } from '../app';
import { getRepository, getManager } from 'typeorm';
import Tag from '../entity/Tag';
import PostsTags from '../entity/PostsTags';

export const typeDef = gql`
  type Tag {
    id: ID!
    name: String
    description: String
    thumbnail: String
    created_at: String
    posts_count: Int
  }

  extend type Query {
    tags(sort: String!, cursor: ID): [Tag]
    tag(name: String!): Tag
  }

  extend type Mutation {
    mergeTag(target: String, merge_to: String): Boolean
  }
`;

export const resolvers: IResolvers<any, ApolloContext> = {
  Query: {
    tag: async (parent: any, name: { name: string }, ctx) => {
      return null;
    },
    tags: async (
      parent: any,
      { sort, cursor }: { sort: 'alphabetical' | 'trending'; cursor?: string },
      ctx
    ) => {
      if (!['name', 'alphabetical'].includes(sort)) {
        throw new ApolloError('Invalid variable "sort"', 'BAD_REQUEST');
      }

      if (sort === 'trending') {
        return PostsTags.getTrendingTags(cursor);
      }

      return PostsTags.getTags(cursor);
    }
  }
};
