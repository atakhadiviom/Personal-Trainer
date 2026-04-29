export const generateYouTubeSearchUrl = (query) => {
  try {
    const url = new URL('https://www.youtube.com/results');
    url.searchParams.set('search_query', `how to properly do ${query}`);
    return url.toString();
  } catch (e) {
    console.error('Failed to generate YouTube search URL:', e);
    return '#';
  }
};
