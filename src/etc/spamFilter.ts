// hard coded spam filter
export default function spamFilter(text: string) {
  let replaced = text
    .replace(/[^a-zA-Zㄱ-힣0-9\n]/g, '')
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

  if (replaced.includes('watch') && replaced.includes('free') && noKorean) return true;
  if (replaced.includes('besflix')) return true;
  if (replaced.includes('dumpspanda')) return true;
  if (replaced.includes('dump') && noKorean) return true;
  if (replaced.includes('instructurecom')) return true;

  if (replaced.includes('mfd8') && replaced.includes('카톡')) {
    return true;
  }
  if (replaced.includes('ghtk') && replaced.includes('카톡')) {
    return true;
  }
  if (replaced.includes('낙태')) return true;
  if (replaced.includes('dumpsarchive')) return true;
  if (replaced.includes('dumpsvision')) return true;
  if (
    (replaced.includes('barcelona') && replaced.includes('reddit')) ||
    replaced.includes('pelicansvclippers')
  )
    return true;
  if (
    replaced.includes('wwwgametv') ||
    (replaced.includes('reddit') && replaced.includes('live')) ||
    (replaced.includes('deviantart') && replaced.includes('live')) ||
    replaced.includes('allsportslives') ||
    (replaced.includes('arsenal') && replaced.includes('stream')) ||
    replaced.includes('handballonline')
  )
    return true;

  const bannedKeywords = [
    'electrum',
    'coinomi',
    'reset password',
    'mycelium',
    '8103554365',
    'support phone',
    'customer support',
    'customer care number',
    'support phone service',
    'account recovery',
    'find password',
    'reset password',
    '3554365',
    ':phone:',
    'helpline',
    'airlines reservations',
  ];

  const keywords = ['airline', 'flight', 'booking', 'customer', 'center', 'how to', 'helpline'];

  const score = keywords.reduce((acc, current) => {
    if (replaced.includes(current)) {
      return acc + 1;
    }
    return acc;
  }, 0);

  if (score >= 2) return true;
  if (bannedKeywords.some(keyword => replaced.includes(keyword))) {
    return true;
  }

  return false;
}

export function commentSpamFilter(text: string) {
  const noKorean = !/[ㄱ-힣]/g.test(text);
  if (noKorean && text.includes('http')) {
    return true;
  }
  return false;
}
