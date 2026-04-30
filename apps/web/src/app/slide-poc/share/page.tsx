import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';

import {
  decodeSlideContent,
  extractSlideExcerpt,
  extractSlideTitle,
  maxSlidePayloadLength,
  splitSlides,
} from '@/app/slide-poc/slide-content';
import styles from '@/app/slide-poc/styles.module.css';

type SharePageProps = {
  searchParams: Promise<{ d?: string | string[] }>;
};

type SlideShareSummary = {
  slides: string[];
  firstTitle: string;
  firstExcerpt: string;
  encoded: string;
};

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
  const summary = await readSharedSlides(searchParams);
  if (!summary) {
    return {
      title: 'Markdown Slide PoC',
      description: '共有 URL のスライド内容を表示します。',
    };
  }

  const baseUrl = await resolveBaseUrl();
  const ogImageUrl = `${baseUrl}/slide-poc/og?d=${summary.encoded}`;
  const description =
    summary.firstExcerpt.length > 0 ? summary.firstExcerpt : 'Markdown から生成されたスライド';

  return {
    title: `${summary.firstTitle} | Markdown Slide PoC`,
    description,
    openGraph: {
      title: summary.firstTitle,
      description,
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: summary.firstTitle,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function SlideSharePage({ searchParams }: SharePageProps) {
  const summary = await readSharedSlides(searchParams);

  if (!summary) {
    return (
      <div className={styles.layout}>
        <h1 className={styles.heading}>共有 URL を読み込めませんでした</h1>
        <p className={styles.subheading}>
          URL に <code>d</code> パラメータが含まれていないか、デコードに失敗しました。
        </p>
        <Link className={styles.secondaryButton} href="/slide-poc">
          エディタへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div>
        <h1 className={styles.heading}>{summary.firstTitle}</h1>
        <p className={styles.subheading}>共有された Markdown スライド ({summary.slides.length} 枚)</p>
      </div>
      <div className={styles.previewPane}>
        {summary.slides.map((slide, index) => (
          <article className={styles.slide} key={`shared-slide-${index.toString()}`}>
            <div className={styles.slideIndex}>
              Slide {index + 1} / {summary.slides.length}
            </div>
            <div className={styles.slideBody}>{slide}</div>
          </article>
        ))}
      </div>
      <Link className={styles.secondaryButton} href="/slide-poc">
        エディタへ戻る
      </Link>
    </div>
  );
}

async function readSharedSlides(
  searchParamsPromise: SharePageProps['searchParams'],
): Promise<SlideShareSummary | undefined> {
  const params = await searchParamsPromise;
  const raw = Array.isArray(params.d) ? params.d[0] : params.d;
  if (!raw) {
    return undefined;
  }
  if (raw.length > maxSlidePayloadLength) {
    return undefined;
  }
  try {
    const markdown = decodeSlideContent(raw);
    const slides = splitSlides(markdown);
    const firstSlide = slides[0];
    if (!firstSlide) {
      return undefined;
    }
    return {
      slides,
      firstTitle: extractSlideTitle(firstSlide, 'Markdown Slide'),
      firstExcerpt: extractSlideExcerpt(firstSlide),
      encoded: raw,
    };
  } catch {
    return undefined;
  }
}

async function resolveBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const protocol = headerList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}
