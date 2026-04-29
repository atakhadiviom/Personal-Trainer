export const generateYouTubeSearchUrl = (exerciseName, prefix = 'how to ') => {
  try {
    const url = new URL('https://www.youtube.com/results');
    url.searchParams.set('search_query', `${prefix}${exerciseName || ''}`);
    return url.toString();
  } catch (error) {
    console.warn('Invalid exercise name for URL generation:', error);
    return '#';
  }
};
