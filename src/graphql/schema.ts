import merge from 'lodash/merge';
import * as post from './post';
import * as user from './user';
import * as comment from './comment';
import * as series from './series';
import * as tag from './tag';
import * as ad from './ad';
import * as notification from './notification';
import { gql, IResolvers, makeExecutableSchema } from 'apollo-server-koa';

const typeDef = gql`
  scalar JSON
  scalar Date
  type Query {
    _version: String
  }
  type Mutation {
    _empty: String
  }
`;

const resolvers: IResolvers = {
  Query: {
    _version: () => '1.0',
  },
  Mutation: {},
};

const schema = makeExecutableSchema({
  typeDefs: [
    typeDef,
    user.typeDef,
    post.typeDef,
    comment.typeDef,
    series.typeDef,
    tag.typeDef,
    ad.typeDef,
    notification.typeDef,
  ],
  resolvers: merge(
    resolvers,
    user.resolvers,
    post.resolvers,
    comment.resolvers,
    series.resolvers,
    tag.resolvers,
    ad.resolvers,
    notification.resovlers
  ),
});

export default schema;
