import { shuffleArray } from './shuffleArray';

export function pickRandomItems<T>(array: T[], count: number) {
  // shuffle array
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}
