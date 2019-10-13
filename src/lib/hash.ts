import crypto from 'crypto';

const { HASH_KEY } = process.env;
if (!HASH_KEY) {
  throw new Error('Please set HASH_KEY Environment variable');
}
export default function hash(text: string) {
  if (!HASH_KEY) {
    throw new Error('Please set HASH_KEY Environment variable');
  }

  const hashed = crypto
    .createHmac('sha256', HASH_KEY)
    .update(text)
    .digest('hex');

  return hashed;
}
