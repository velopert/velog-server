import { ApolloError, IResolvers, gql } from 'apollo-server-koa';
import { ApolloContext } from '../app';
import adService from '../services/adService';
import { isJobCategory, wantedService } from '../services/wantedService';

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
  type JobPosition {
    id: ID!
    name: String!
    companyName: String!
    companyLogo: String!
    thumbnail: String!
    url: String!
  }
  extend type Query {
    bannerAds(writer_username: String!): [Ad!]!
    jobPositions(category: String): [JobPosition!]!
  }
`;

export const resolvers: IResolvers<any, ApolloContext> = {
  Query: {
    bannerAds: async (_, { writer_username }: BannerAdsArgs) => {
      return await adService.getBannerTypeAdList(writer_username);
    },
    jobPositions: async (_, { category }: { category?: string }) => {
      if (isJobCategory(category)) {
        return wantedService.getJobPositions(category);
      }
      throw new ApolloError('Bad Request');
    },
  },
};

type BannerAdsArgs = {
  writer_username: string;
};
