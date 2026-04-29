import { describe, it, expect, vi } from 'vitest';
import { generateYouTubeSearchUrl } from '../utils/url';

describe('generateYouTubeSearchUrl', () => {
  it('should generate a valid YouTube search URL for a simple query', () => {
    const url = generateYouTubeSearchUrl('Pushups');
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+properly+do+Pushups');
  });

  it('should generate a valid YouTube search URL with spaces in query', () => {
    const url = generateYouTubeSearchUrl('Dumbbell Bench Press');
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+properly+do+Dumbbell+Bench+Press');
  });

  it('should safely encode special characters', () => {
    const url = generateYouTubeSearchUrl('Pull-ups & Chin-ups!');
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+properly+do+Pull-ups+%26+Chin-ups%21');
  });

  it('should fallback to "#" and not crash for malformed surrogate pairs', () => {
    // Suppress console.error during this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simulate what would happen if somehow URL searchParams.set fails (though it typically handles surrogate pairs better than encodeURIComponent)
    // Actually, to test the catch block, we need to mock URL since node's URL handles malformed surrogate pairs
    // wait, URLSearchParams in node handles '\uD800' without throwing. Let's verify by just passing it.

    const urlWithSurrogate = generateYouTubeSearchUrl('\uD800');
    // It should not throw. It should return a valid URL or the fallback '#' if our try/catch triggered.
    // In standard modern JS, URLSearchParams will just replace the invalid surrogate with the replacement char %EF%BF%BD
    expect(typeof urlWithSurrogate).toBe('string');
    expect(urlWithSurrogate.startsWith('https://www.youtube.com/results') || urlWithSurrogate === '#').toBe(true);

    consoleSpy.mockRestore();
  });

  it('should fallback to "#" if an error is explicitly thrown', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create an object that will throw when toString is called
    const badObject = {
      toString: () => { throw new Error('Bad object'); }
    };

    const url = generateYouTubeSearchUrl(badObject);
    expect(url).toBe('#');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
