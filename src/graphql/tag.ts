import { gql, IResolvers, ApolloError, AuthenticationError } from 'apollo-server-koa';
import { ApolloContext } from '../app';
import { getRepository, getManager } from 'typeorm';
import Tag from '../entity/Tag';
import PostsTags from '../entity/PostsTags';
import AdminUser from '../entity/AdminUser';
import TagAlias from '../entity/TagAlias';

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
    mergeTag(selected: String, merge_to: String): Boolean
  }
`;

type MergeTagParams = {
  selected: string;
  merge_to: string;
};
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
      if (!['trending', 'alphabetical'].includes(sort)) {
        throw new ApolloError('Invalid variable "sort"', 'BAD_REQUEST');
      }

      if (sort === 'trending') {
        return PostsTags.getTrendingTags(cursor);
      }

      return PostsTags.getTags(cursor);
    }
  },
  Mutation: {
    mergeTag: async (parent: any, { selected, merge_to }: MergeTagParams, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }
      const isAdmin = await AdminUser.checkAdmin(ctx.user_id);
      if (!isAdmin) {
        throw new ApolloError('You are not admin', 'NO_PERMISSION');
      }
      const tagRepo = getRepository(Tag);

      // 0. check tag validity
      const [selectedTag, mergeToTag] = await Promise.all(
        [selected, merge_to].map(tag => tagRepo.findOne(tag))
      );

      if (!selectedTag) {
        throw new ApolloError(`Tag ${selected} is not found`, 'NOT_FOUND');
      }

      if (!mergeToTag) {
        throw new ApolloError(`Tag ${merge_to} is not found`, 'NOT_FOUND');
      }

      // 0.5 find posts where two tags exist
      const intersectionPosts = await PostsTags.getInstersectionPost(selected, merge_to);

      // 0.75 remove selected tag from those posts
      const postsTagsRepo = getRepository(PostsTags);
      if (intersectionPosts.length > 0) {
        await postsTagsRepo
          .createQueryBuilder()
          .delete()
          .where('fk_tag_id = :tagId', { tagId: selected })
          .andWhere('fk_post_id IN (:...postIds)', { postIds: intersectionPosts })
          .execute();
      }

      // 1. update all PostsTags selected -> merge_to

      await postsTagsRepo
        .createQueryBuilder()
        .update()
        .set({
          fk_tag_id: merge_to
        })
        .where('fk_tag_id = :tagId', { tagId: selected })
        .execute();

      // 2. update selected Tag: is_alias -> true
      selectedTag.is_alias = true;
      await postsTagsRepo.save(selectedTag);

      // 3. create TagAlias
      const tagAliasRepo = getRepository(TagAlias);
      const tagAlias = new TagAlias();
      tagAlias.fk_tag_id = selected;
      tagAlias.fk_alias_tag_id = merge_to;
      await tagAliasRepo.save(tagAlias);

      return true;
    }
  }
};
