import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { ApolloServer, gql, IResolvers } from 'apollo-server-koa';
import { createConnection, getConnection, getManager, getRepository } from 'typeorm';
import GraphQLJSON from 'graphql-type-json';
import routes from './routes';
import { Post } from './entity/Post';
import { User } from './entity/User';
import { UserProfile } from './entity/UserProfile';

const app = new Koa();

/* setup middlewares */
app.use(bodyParser());
app.use(routes.routes()).use(routes.allowedMethods());

/* integrate GraphQL */
const typeDefs = gql`
  scalar JSON

  type User {
    id: ID!
    username: String
    email: String
    created_at: String
    updated_at: String
    is_certified: Boolean
    profile: UserProfile
  }
  type UserProfile {
    id: ID!
    display_name: String
    short_bio: String
    thumbnail: String
    created_at: String
    updated_at: String
    about: String
    profile_links: JSON
  }
  type Post {
    id: ID!
    title: String
    body: String
    thumbnail: String
    is_markdown: Boolean
    is_temp: Boolean
    user: User
    url_slug: String
    likes: Int
    meta: JSON
    views: Int
    is_private: Boolean
    released_at: String
    created_at: String
  }
  type Query {
    user(id: ID): User
    post(id: ID): Post
  }
`;

const resolvers: IResolvers = {
  Query: {
    user: async (parent: any, { id }) => {
      const user = await getManager()
        .createQueryBuilder(User, 'user')
        .where('id = :id', { id })
        .getOne();
      return user;
    },
    post: async (parent: any, { id }) => {
      const post = await getRepository(Post).findOne({
        loadEagerRelations: true,
        where: {
          id
        }
      });
      return post;
    }
  },
  User: {
    profile: async (parent: User) => {
      console.log(parent);
      const profile = await getManager()
        .createQueryBuilder(UserProfile, 'user_profile')
        .where('fk_user_id = :id', { id: parent.id })
        .getOne();
      return profile;
    }
  },
  Post: {
    user: (parent: Post) => {
      // TODO: fetch user if null
      return parent.user;
    }
  },
  JSON: GraphQLJSON
};

const apollo = new ApolloServer({ typeDefs, resolvers });
apollo.applyMiddleware({ app });

/**
 * initial tasks except Koa middlewares
 */
async function initialize() {
  try {
    await createConnection();
    const posts = await getManager()
      .createQueryBuilder(Post, 'post')
      .getMany();

    console.log('Postgres RDBMS connection is established');
  } catch (e) {
    console.log(e);
  }
}

initialize();

export default app;
