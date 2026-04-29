/** @jest-environment node */

import {
  decodeSlideContent,
  encodeSlideContent,
  extractSlideExcerpt,
  extractSlideTitle,
  splitSlides,
} from '@/app/slide-poc/slide-content';

describe('slide-content utilities', () => {
  describe('splitSlides', () => {
    it('splits markdown on horizontal rules', () => {
      const markdown = '# A\n\nfirst\n\n---\n\n# B\n\nsecond';
      expect(splitSlides(markdown)).toEqual(['# A\n\nfirst', '# B\n\nsecond']);
    });

    it('returns the entire markdown as a single slide when no separator exists', () => {
      const markdown = '# only one\n\nbody';
      expect(splitSlides(markdown)).toEqual(['# only one\n\nbody']);
    });

    it('drops empty slide segments', () => {
      const markdown = '\n---\n\n# A\n\n---\n\n';
      expect(splitSlides(markdown)).toEqual(['# A']);
    });
  });

  describe('extractSlideTitle', () => {
    it('returns the heading text', () => {
      expect(extractSlideTitle('# Hello world\n\nbody', 'fallback')).toBe('Hello world');
    });

    it('falls back to first non-empty line when no heading exists', () => {
      expect(extractSlideTitle('intro line\nnext line', 'fallback')).toBe('intro line');
    });

    it('falls back to the supplied default for empty content', () => {
      expect(extractSlideTitle('   ', 'fallback')).toBe('fallback');
    });
  });

  describe('extractSlideExcerpt', () => {
    it('joins body lines with spaces and strips markdown markers', () => {
      const slide = '# Title\n\n- **bold** point\n- second point';
      expect(extractSlideExcerpt(slide)).toBe('bold point second point');
    });

    it('truncates long excerpts with an ellipsis', () => {
      const longBody = 'abcdefghij '.repeat(40).trim();
      const slide = `# Title\n\n${longBody}`;
      const excerpt = extractSlideExcerpt(slide, 30);
      expect(excerpt.length).toBe(30);
      expect(excerpt.endsWith('…')).toBe(true);
    });
  });

  describe('encodeSlideContent / decodeSlideContent', () => {
    it('roundtrips ASCII content', () => {
      const text = '# Hello\n\n- one\n- two\n\n---\n\n# Bye';
      const encoded = encodeSlideContent(text);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
      expect(decodeSlideContent(encoded)).toBe(text);
    });

    it('roundtrips multibyte content', () => {
      const text = '# 日本語タイトル\n\n本文に絵文字 🎌 と中黒・も含む';
      const encoded = encodeSlideContent(text);
      expect(decodeSlideContent(encoded)).toBe(text);
    });
  });
});
