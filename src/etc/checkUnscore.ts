const unscoredCategory = (process.env.UNSCORED_CATEGORY || '').split(',');
const unscoredWords = (process.env.UNSCORED_WORDS || '').split(',');

export default function checkUnscore(text: string) {
  const lowerText = text.toLowerCase().replace(/ /g, '');
  const isUnscoredCategory = unscoredCategory.some(category => lowerText.includes(category));
  const hasUnscoredWords = unscoredWords.some(word => lowerText.includes(word));
  return isUnscoredCategory && hasUnscoredWords;
}
