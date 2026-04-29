import { describe, it, expect } from 'vitest';
import { generateYoutubeSearchUrl } from '../utils/urlHelpers';

describe('generateYoutubeSearchUrl', () => {
  it('should generate a correct URL for a simple query', () => {
    const url = generateYoutubeSearchUrl('how to pushup');
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+pushup');
  });

  it('should properly encode special characters in the query', () => {
    const url = generateYoutubeSearchUrl('how to "special" & <test> / \\');
    expect(url).toContain('search_query=how+to+%22special%22+%26+%3Ctest%3E+%2F+%5C');
  });

  it('should prevent XSS/injection by encoding potential HTML/JS payloads', () => {
    const maliciousQuery = 'how to <script>alert(1)</script>';
    const url = generateYoutubeSearchUrl(maliciousQuery);
    expect(url).toBe('https://www.youtube.com/results?search_query=how+to+%3Cscript%3Ealert%281%29%3C%2Fscript%3E');
    expect(url).not.toContain('<script>');
  });
});
