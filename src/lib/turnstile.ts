import axios from 'axios';

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

console.log('verifyTurnstileToken', TURNSTILE_SECRET_KEY);
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  try {
    const res = await axios.post<{ success: boolean }>(VERIFY_URL, {
      secret: TURNSTILE_SECRET_KEY,
      response: token,
    });

    console.log('toklen', res);
    return res.data.success;
  } catch (error) {
    console.log('verifyTurnstileToken error', error);
    return false;
  }
}
