'use client';

import { useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

interface MarkdownPreviewProps {
  content: string;
  onLinkClick?: (link: string) => void;
}

export default function MarkdownPreview({ content, onLinkClick }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Process wiki links
    const processedContent = content.replace(
      /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g,
      (match, link, _, alias) => {
        return `<a href="#" data-wiki-link="${link}" class="wiki-link">${alias || link}</a>`;
      }
    );

    // Render markdown
    const html = md.render(processedContent);
    containerRef.current.innerHTML = html;

    // Handle wiki link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('wiki-link')) {
        e.preventDefault();
        const link = target.getAttribute('data-wiki-link');
        if (link && onLinkClick) {
          onLinkClick(link);
        }
      }
    };

    containerRef.current.addEventListener('click', handleClick);

    return () => {
      containerRef.current?.removeEventListener('click', handleClick);
    };
  }, [content, onLinkClick]);

  return (
    <div
      ref={containerRef}
      className="markdown-preview prose dark:prose-invert max-w-none"
    />
  );
}
