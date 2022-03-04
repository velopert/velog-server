import axios from 'axios';

export function purge(query: string) {
  return axios.post(
    'https://admin.graphcdn.io/velog',
    {
      query,
    },
    {
      headers: {
        'graphcdn-token': process.env.GRAPHCDN_TOKEN,
      },
    }
  );
}

export function purgePost(id: string) {
  return purge(`
mutation {
  purgePost(id: "${id}")
}
  `);
}

export function purgeRecentPosts() {
  return purge(`
  mutation {
    _purgeOperationName(names: ["RecentPosts"])
  }
  `);
}

export function purgeUser(id: string) {
  return purge(`
  mutation {
    purgeUser(id: "${id}")
  }`);
}
