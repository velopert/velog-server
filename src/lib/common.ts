import { generateToken } from './token';

export function generateUnsubscribeToken(userId: string, meta: string) {
  return generateToken(
    {
      meta,
      user_id: userId
    },
    {
      subject: 'unsubscribe-email'
    }
  );
}

export default function optimizeImage(url: string, width: number) {
  if (!url.includes('https://images.velog.io')) return url;
  return url.replace('://images', '://img').concat(`?w=${width}`);
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(() => resolve(), ms));
