import { describe, it, expect, vi } from 'vitest';
import { generateYouTubeSearchUrl } from '../utils/urlHelper.js';

describe('generateYouTubeSearchUrl', () => {
  it('generates a URL for a simple exercise name', () => {
    const url = generateYouTubeSearchUrl('squats');
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+squats');
  });

  it('generates a URL handling spaces and ampersands correctly', () => {
    const url = generateYouTubeSearchUrl('squats & lunges');
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+squats+%26+lunges');
  });

  it('generates a URL with a custom prefix', () => {
    const url = generateYouTubeSearchUrl('squats', 'how to properly do ');
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+properly+do+squats');
  });

  it('handles empty or undefined exercise names gracefully', () => {
    const url1 = generateYouTubeSearchUrl();
    expect(url1).toBe('https://www.youtube.com/results?search_query=how+to+');

    const url2 = generateYouTubeSearchUrl(null);
    expect(url2).toBe('https://www.youtube.com/results?search_query=how+to+');
  });

  it('does not throw an error and encodes gracefully for invalid characters (unmatched surrogates)', () => {
    // encodeURIComponent('\uD800') would throw URIError: URI malformed
    const url = generateYouTubeSearchUrl('\uD800');
    // URLSearchParams cleanly replaces invalid characters with the replacement character (%EF%BF%BD)
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+%EF%BF%BD');
  });

  it('returns "#" if an unexpected error occurs during URL generation', () => {
    // Mock the URL constructor to force an error
    const originalURL = global.URL;
    global.URL = class {
      constructor() {
        throw new Error('Simulated URL error');
      }
    };

    // Silence console.warn for the test
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const url = generateYouTubeSearchUrl('squats');
    expect(url).toBe('#');

    // Restore
    global.URL = originalURL;
    consoleSpy.mockRestore();
  });
});
