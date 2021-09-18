const bannedKeywords = (process.env.BANNED_KEYWORDS || '').split(',');
const bannedAltKeywords = (process.env.BANNED_ALT_KEYWORDS || '').split(',');

// hard coded spam filter
export default function spamFilter(text: string) {
  let replaced = text
    .replace(/[^a-zA-Zㄱ-힣0-9 \n]/g, '')
    .replace(/\n\s*\n/g, '\n')
    .toLowerCase();

  const linksAtEnd = text
    .replace(/\n\s*\n/g, '\n')
    .toLowerCase()
    .split('\n')
    .reverse()
    .reduce((acc, current, index, arr) => {
      if (/^http/.test(current) && (index === 0 || /^http/.test(arr[index - 1]))) {
        return acc + 1;
      }
      return acc;
    }, 0);

  const noKorean = !/[ㄱ-힣]/g.test(text);

  if (linksAtEnd > 4 && noKorean) {
    return true;
  }

  if (bannedKeywords.some(keyword => replaced.includes(keyword))) {
    return true;
  }

  const score = bannedAltKeywords.reduce((acc, current) => {
    if (replaced.includes(current)) {
      return acc + 1;
    }
    return acc;
  }, 0);

  if (score >= 2) return true;

  return false;
}

function hasKorean(text: string) {
  return /[ㄱ-힣]/g.test(text);
}

export function nextSpamFilter(text: string, isForeign: boolean, isTitle = false) {
  let replaced = text.replace(/```([\s\S]*?)```/g, ''); // remove code blocks
  // replace image markdown
  replaced = replaced.replace(/!\[([\s\S]*?)\]\(([\s\S]*?)\)/g, '');

  const alphanumericKorean = replaced
    .replace(/[^a-zA-Zㄱ-힣0-9 \n]/g, '') // remove non-korean
    .toLowerCase();

  const hasLink = /http/.test(replaced);

  if (!isTitle && isForeign && hasLink) {
    const lines = replaced.split('\n').filter(line => line.trim().length > 1);
    const koreanLinesCount = lines.filter(line => hasKorean(line)).length;
    const confidence = koreanLinesCount / lines.length;

    return confidence < 0.3;
  }

  if (bannedKeywords.some(keyword => alphanumericKorean.includes(keyword))) {
    return true;
  }

  const score = bannedAltKeywords.reduce((acc, current) => {
    if (alphanumericKorean.includes(current)) {
      return acc + 1;
    }
    return acc;
  }, 0);

  if (score >= 2 && isForeign) return true;
}

export function commentSpamFilter(text: string) {
  const noKorean = !/[ㄱ-힣]/g.test(text);
  if (noKorean && text.includes('http')) {
    return true;
  }
  return false;
}
