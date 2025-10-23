import { ApolloContext } from './../app';
import { gql, IResolvers } from 'apollo-server-koa';
import reportService, { type WriteReportArgs } from '../services/reportService';

export const typeDef = gql`
  type Report {
    id: ID!
    type: string
    fk_user_id: String!
    body: String
    user: User
    created_at: Date
    updated_at: Date
  }

  extend type Mutation {
    writeReport(
      type: string
      target_id: string
      body: string
    ): Report
  }
`;

export const resolvers: IResolvers<WriteReportArgs, ApolloContext> = {
  Mutation: {
    writeReport: async (parent, args, ctx) => {
      return await reportService.write(args, ctx.cookies, ctx.ip);
    },
  },
};
