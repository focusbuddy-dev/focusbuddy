/** @jest-environment node */

import { jest } from '@jest/globals';

const headersMock: jest.Mock<() => Promise<Headers>> = jest.fn();

jest.unstable_mockModule('next/headers', () => ({
  headers: headersMock,
}));

describe('slide-poc share page metadata', () => {
  beforeEach(() => {
    headersMock.mockReset();
    headersMock.mockResolvedValue(
      new Headers({
        host: 'example.com',
        'x-forwarded-proto': 'https',
      }),
    );
  });

  it('emits OGP and Twitter card metadata pointing to the og route', async () => {
    const { generateMetadata } = await import('@/app/slide-poc/share/page');
    const { encodeSlideContent } = await import('@/app/slide-poc/slide-content');

    const markdown = '# 共有タイトル\n\n本文の概要を OGP の description に乗せたい。';
    const encoded = encodeSlideContent(markdown);

    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ d: encoded }),
    });

    expect(metadata.title).toBe('共有タイトル | Markdown Slide PoC');
    expect(metadata.description).toBe('本文の概要を OGP の description に乗せたい。');

    expect(metadata.openGraph).toMatchObject({
      title: '共有タイトル',
      type: 'article',
      images: [
        {
          url: `https://example.com/slide-poc/og?d=${encoded}`,
          width: 1200,
          height: 630,
        },
      ],
    });

    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: '共有タイトル',
      images: [`https://example.com/slide-poc/og?d=${encoded}`],
    });
  });

  it('returns a fallback metadata object when the d parameter is missing', async () => {
    const { generateMetadata } = await import('@/app/slide-poc/share/page');

    const metadata = await generateMetadata({
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe('Markdown Slide PoC');
    expect(metadata.openGraph).toBeUndefined();
    expect(metadata.twitter).toBeUndefined();
  });

  it('returns a fallback metadata object for invalid encoded content', async () => {
    const { generateMetadata } = await import('@/app/slide-poc/share/page');

    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ d: '!!!not-base64!!!' }),
    });

    expect(metadata.title).toBe('Markdown Slide PoC');
    expect(metadata.openGraph).toBeUndefined();
  });
});
