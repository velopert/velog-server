import { ApolloError, AuthenticationError } from 'apollo-server-koa';
import { ApolloContext } from './../app';
import { getRepository } from 'typeorm';
import Post from '../entity/Post';
import PostHistory from '../entity/PostHistory';
import searchSync from '../search/searchSync';

const postHistoryService = {
  async createPostHistory(args: CreatePostHistoryArgs, ctx: ApolloContext) {
    if (!ctx.user_id) {
      throw new AuthenticationError('Not Logged In');
    }

    // check ownPost
    const { post_id, title, body, is_markdown } = args;

    const postRepo = getRepository(Post);
    const post = await postRepo.findOne(post_id);

    if (!post) {
      throw new ApolloError('Post not found', 'NOT_FOUND');
    }
    if (post.fk_user_id !== ctx.user_id) {
      throw new ApolloError('This post is not yours', 'NO_PERMISSION');
    }

    // create postHistory
    const postHistoryRepo = getRepository(PostHistory);
    const postHistory = new PostHistory();
    Object.assign(postHistory, { title, body, is_markdown, fk_post_id: post_id });

    await postHistoryRepo.save(postHistory);

    const [data, count] = await postHistoryRepo.findAndCount({
      where: {
        fk_post_id: post_id,
      },
      order: {
        created_at: 'DESC',
      },
    });

    if (count > 10) {
      await postHistoryRepo
        .createQueryBuilder('post_history')
        .delete()
        .where('fk_post_id = :postId', {
          postId: post_id,
        })
        .andWhere('created_at < :createdAt', { createdAt: data[9].created_at })
        .execute();

      setTimeout(() => {
        searchSync.update(post.id).catch(console.error);
      }, 0);
    }

    return postHistory;
  },
};

export type CreatePostHistoryArgs = {
  post_id: string;
  title: string;
  body: string;
  is_markdown: boolean;
};

export default postHistoryService;
