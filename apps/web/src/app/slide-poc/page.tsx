import type { Metadata } from 'next';

import { SlidePocEditor } from '@/app/slide-poc/slide-poc-editor';

export const metadata: Metadata = {
  title: 'Markdown Slide PoC | FocusBuddy',
  description: 'Markdown をスライド化し、OGP カードを生成するための実験ページ。',
};

export default function SlidePocPage() {
  return <SlidePocEditor />;
}
