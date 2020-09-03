// hard coded spam filter
export default function spamFilter(text: string) {
  if (text.includes('MFD8') && text.includes('카톡')) {
    return true;
  }
  if (text.includes('ghtk') && text.includes('카톡')) {
    return true;
  }
  return false;
}
