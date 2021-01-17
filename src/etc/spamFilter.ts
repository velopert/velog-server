// hard coded spam filter
export default function spamFilter(text: string) {
  const replaced = text.replace(/[^a-zA-Zㄱ-힣0-9]/g, '').toLowerCase();
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
    replaced.includes('www.game.tv') ||
    (replaced.includes('reddit') && replaced.includes('live')) ||
    (replaced.includes('deviantart') && replaced.includes('live')) ||
    replaced.includes('allsportslives') ||
    (replaced.includes('arsenal') && replaced.includes('stream'))
  )
    return true;
  return false;
}
