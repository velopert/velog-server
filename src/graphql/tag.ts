import { gql, IResolvers } from 'apollo-server-koa';
import { ApolloContext } from '../app';

export const typeDef = gql`
  type Tag {
    id: ID!
    name: String;
    description: String;
    thumbnail: String;
    created_at: String;
  }

  extend type Query {
    tags(sort: String!, cursor: ID): [Tag]
    tag(name: String!): Tag
  }
`;

export const resolvers: IResolvers<any, ApolloContext> = {
  Query: {
    tag: async (parent: any, name: { name: string }, ctx) => {
      return null;
    },
    tags: async (
      parent: any,
      { sort, cursor }: { sort: 'name' | 'trending'; cursor?: string },
      ctx
    ) => {
      return null;
    }
  }
};
