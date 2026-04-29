/**
 * Safely generates a YouTube search URL for a given query.
 * @param {string} query - The exercise name to search for.
 * @param {string} [prefix='how to'] - Optional prefix to prepend to the query.
 * @returns {string} The safe URL or '#' if generation fails.
 */
export const getSafeYoutubeUrl = (query, prefix = 'how to') => {
  if (!query) return '#';
  try {
    const url = new URL('https://www.youtube.com/results');
    const searchStr = prefix ? `${prefix} ${query}` : query;
    url.searchParams.set('search_query', searchStr);
    return url.toString();
  } catch (e) {
    console.error('Failed to generate secure YouTube URL', e);
    return '#';
  }
};
