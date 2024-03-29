import { IResolvers, gql } from 'apollo-server-koa';
import { ApolloContext } from '../app';
import adService from '../services/adService';

export const typeDef = gql`
  type Ad {
    id: ID!
    title: String!
    body: String!
    image: String!
    type: String!
    start_date: Date!
    end_date: Date!
    is_disabled: Boolean!
    url: String!
  }
  extend type Query {
    bannerAds(writer_username: String!): [Ad!]!
  }
`;

export const resolvers: IResolvers<any, ApolloContext> = {
  Query: {
    bannerAds: async (_, { writer_username }: BannerAdsArgs) => {
      return await adService.getBannerTypeAdList(writer_username);
    },
  },
};

type BannerAdsArgs = {
  writer_username: string;
};
