'use client';

import { useMemo, useState } from 'react';

import {
  encodeSlideContent,
  extractSlideTitle,
  splitSlides,
} from '@/app/slide-poc/slide-content';
import styles from '@/app/slide-poc/styles.module.css';

const initialMarkdown = `# Markdown Slide PoC

このエディタに Markdown を書いて「スライド化」を押すとスライド表示になります。

---

## スライドを増やすには

\`---\` で区切るだけ。

- 箇条書きも書けます
- 見出しはタイトルになります

---

## 共有 URL を生成

「共有 URL を生成」を押すと OGP カード化用 URL がコピーされます。
`;

type ShareLink = {
  url: string;
  ogImageUrl: string;
};

export function SlidePocEditor() {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [slides, setSlides] = useState<string[] | undefined>(undefined);
  const [shareLink, setShareLink] = useState<ShareLink | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState('Markdown を編集して「スライド化」を押してください。');

  const handleSlidify = () => {
    const nextSlides = splitSlides(markdown);
    setSlides(nextSlides);
    setShareLink(undefined);
    setStatusMessage(
      nextSlides.length > 0
        ? `${nextSlides.length} 枚のスライドを生成しました。`
        : 'スライドにできる内容がありません。',
    );
  };

  const handleGenerateShareLink = async () => {
    if (!slides || slides.length === 0) {
      setStatusMessage('まず「スライド化」を押してください。');
      return;
    }
    const encoded = encodeSlideContent(markdown);
    const origin = window.location.origin;
    const shareUrl = `${origin}/slide-poc/share?d=${encoded}`;
    const ogImageUrl = `${origin}/slide-poc/og?d=${encoded}`;
    setShareLink({ url: shareUrl, ogImageUrl });
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setStatusMessage('共有 URL をクリップボードにコピーしました。');
        return;
      } catch {
        // fall through to manual copy guidance
      }
    }
    setStatusMessage('共有 URL を生成しました。下のボックスから手動でコピーしてください。');
  };

  return (
    <div className={styles.layout}>
      <div>
        <h1 className={styles.heading}>Markdown Slide PoC</h1>
        <p className={styles.subheading}>
          Markdown をスライド化し、SNS 用 OGP カードを試すための実験ページです。
        </p>
      </div>
      <div className={styles.workspace}>
        <div className={styles.editorPane}>
          <textarea
            aria-label="Markdown editor"
            className={styles.editor}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck={false}
            value={markdown}
          />
          <div className={styles.actionRow}>
            <button className={styles.primaryButton} onClick={handleSlidify} type="button">
              スライド化
            </button>
            <button
              className={styles.secondaryButton}
              disabled={!slides || slides.length === 0}
              onClick={handleGenerateShareLink}
              type="button"
            >
              共有 URL を生成
            </button>
          </div>
          <p aria-live="polite" className={styles.statusLine}>
            {statusMessage}
          </p>
          {shareLink ? (
            <div>
              <input
                aria-label="共有 URL"
                className={styles.shareUrl}
                onFocus={(event) => event.currentTarget.select()}
                readOnly
                value={shareLink.url}
              />
              <p className={styles.statusLine}>
                OGP 画像プレビュー:{' '}
                <a href={shareLink.ogImageUrl} rel="noreferrer" target="_blank">
                  {shareLink.ogImageUrl}
                </a>
              </p>
            </div>
          ) : undefined}
        </div>
        <div className={styles.previewPane}>
          {slides && slides.length > 0 ? (
            slides.map((slide, index) => (
              <SlideCard
                index={index + 1}
                key={`slide-${index.toString()}-${slide.slice(0, 16)}`}
                markdown={slide}
                total={slides.length}
              />
            ))
          ) : (
            <div className={styles.previewEmpty}>「スライド化」を押すとプレビューが表示されます。</div>
          )}
        </div>
      </div>
    </div>
  );
}

type SlideCardProps = {
  index: number;
  markdown: string;
  total: number;
};

function SlideCard({ index, markdown, total }: SlideCardProps) {
  const { title, body } = useMemo(() => splitTitleAndBody(markdown), [markdown]);
  return (
    <article className={styles.slide}>
      <div className={styles.slideIndex}>
        Slide {index} / {total}
      </div>
      {title ? <h2 className={styles.slideHeading}>{title}</h2> : undefined}
      <div className={styles.slideBody}>{body}</div>
    </article>
  );
}

function splitTitleAndBody(markdown: string): { title: string | undefined; body: string } {
  const trimmed = markdown.trim();
  const lines = trimmed.split('\n');
  const headingIndex = lines.findIndex((line) => /^#{1,6}\s+/.test(line.trim()));
  if (headingIndex === -1) {
    return { title: undefined, body: trimmed };
  }
  const title = extractSlideTitle(trimmed, '');
  const body = lines.slice(headingIndex + 1).join('\n').trim();
  return { title: title.length > 0 ? title : undefined, body };
}
