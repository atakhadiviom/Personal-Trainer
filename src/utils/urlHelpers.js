export const generateYoutubeSearchUrl = (query) => {
  const url = new URL('https://www.youtube.com/results');
  url.searchParams.set('search_query', query);
  return url.toString();
};
