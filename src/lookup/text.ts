/** Lower-cases, strips accents and punctuation, and collapses spaces. Keeps letters of every script. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const withoutExtras = (title: string) =>
  normalizeText(title.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+(single|ep)$/i, ''));

const withoutArticle = (name: string) => normalizeText(name).replace(/^(the|a|an) /, '');

/** True when two artist and title pairs look like the same album. */
export function sameAlbum(a: { artist: string; title: string }, b: { artist: string; title: string }): boolean {
  const [ta, tb] = [withoutExtras(a.title), withoutExtras(b.title)];
  const [aa, ab] = [withoutArticle(a.artist), withoutArticle(b.artist)];
  if (!ta || !tb || !aa || !ab) return false;
  return ta === tb && (aa === ab || aa.includes(ab) || ab.includes(aa));
}
