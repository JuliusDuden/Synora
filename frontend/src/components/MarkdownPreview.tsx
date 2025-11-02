'use client';

import { useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    let processedContent = content.replace(
      /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g,
      (match, link, _, alias) => {
        return `<a href="#" data-wiki-link="${link}" class="wiki-link">${alias || link}</a>`;
      }
    );

    // Process attachment images: ![alt](attachment:filename) -> actual URL
    processedContent = processedContent.replace(
      /!\[([^\]]*)\]\(attachment:([^)]+)\)/g,
      (match, alt, filename) => {
        return `![${alt}](${API_URL}/api/attachments/${filename})`;
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
    <>
      <style jsx global>{`
        .markdown-preview ul {
          list-style-type: disc;
          padding-left: 1.625em;
          margin-top: 1.25em;
          margin-bottom: 1.25em;
        }
        .markdown-preview ol {
          list-style-type: decimal;
          padding-left: 1.625em;
          margin-top: 1.25em;
          margin-bottom: 1.25em;
        }
        .markdown-preview li {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .markdown-preview ul ul,
        .markdown-preview ol ol,
        .markdown-preview ul ol,
        .markdown-preview ol ul {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
      `}</style>
      <div
        ref={containerRef}
        className="markdown-preview prose dark:prose-invert max-w-none"
      />
    </>
  );
}
