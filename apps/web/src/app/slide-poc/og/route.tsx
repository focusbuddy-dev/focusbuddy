import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import {
  decodeSlideContent,
  extractSlideExcerpt,
  extractSlideTitle,
  maxSlidePayloadLength,
  splitSlides,
} from '@/app/slide-poc/slide-content';

export const runtime = 'edge';

const ogImageWidth = 1200;
const ogImageHeight = 630;

export function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('d');
  if (!raw) {
    return new Response('missing slide content', { status: 400 });
  }
  if (raw.length > maxSlidePayloadLength) {
    return new Response('slide content too large', { status: 400 });
  }

  let title = 'Markdown Slide';
  let excerpt = '';
  try {
    const markdown = decodeSlideContent(raw);
    const slides = splitSlides(markdown);
    const firstSlide = slides[0];
    if (firstSlide) {
      title = extractSlideTitle(firstSlide, title);
      excerpt = extractSlideExcerpt(firstSlide);
    }
  } catch {
    return new Response('invalid slide content', { status: 400 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: 4,
            color: '#94a3b8',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          Markdown Slide PoC
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.2,
            display: 'flex',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#cbd5f5',
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          {excerpt.length > 0 ? excerpt : 'Markdown を貼ってスライドを共有しよう'}
        </div>
      </div>
    ),
    {
      width: ogImageWidth,
      height: ogImageHeight,
    },
  );
}
