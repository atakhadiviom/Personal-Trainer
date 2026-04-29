import { describe, it, expect } from 'vitest';
import { getSafeYoutubeUrl } from './url.js';

describe('getSafeYoutubeUrl', () => {
  it('generates a valid YouTube search URL', () => {
    expect(getSafeYoutubeUrl('squat')).toBe('https://www.youtube.com/results?search_query=how+to+squat');
  });

  it('allows custom prefixes', () => {
    expect(getSafeYoutubeUrl('squat', 'how to properly do')).toBe('https://www.youtube.com/results?search_query=how+to+properly+do+squat');
  });

  it('handles empty prefixes', () => {
    expect(getSafeYoutubeUrl('squat', '')).toBe('https://www.youtube.com/results?search_query=squat');
  });

  it('safely encodes potentially malicious input', () => {
    const url = getSafeYoutubeUrl('<script>alert("xss")</script>');
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+%3Cscript%3Ealert%28%22xss%22%29%3C%2Fscript%3E');
  });

  it('returns # for empty queries', () => {
    expect(getSafeYoutubeUrl('')).toBe('#');
    expect(getSafeYoutubeUrl(null)).toBe('#');
    expect(getSafeYoutubeUrl(undefined)).toBe('#');
  });
});
