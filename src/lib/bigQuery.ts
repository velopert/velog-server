import { BigQuery } from '@google-cloud/bigquery';

const bigQueryClient = new BigQuery({
  projectId: 'velog-14',
});

const postReads = bigQueryClient.dataset('velog_user_logs').table('post_reads');
const postLikes = bigQueryClient.dataset('velog_user_logs').table('post_likes');

export function createReadLog(params: { postId: string; userId: string | null; ip: string }) {
  return postReads.insert({
    ...params,
    createdAt: new Date(),
  });
}

export function createLikeLog(params: { postId: string; userId: string | null; ip: string }) {
  return postLikes.insert({
    ...params,
    createdAt: new Date(),
  });
}
