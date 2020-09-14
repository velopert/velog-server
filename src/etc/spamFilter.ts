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
  return false;
}
