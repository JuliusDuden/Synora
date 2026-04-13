'use client';

import { useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

md.use(markdownItTaskLists, {
  enabled: true,
  label: true,
  labelAfter: true,
});

const normalizeLegacyStrikethrough = (text: string) => {
  // Backward compatibility for notes saved as ~text~ instead of ~~text~~.
  return text.replace(/(^|[^~`])~([^~\n]+)~(?=[^~`]|$)/g, '$1~~$2~~');
};

interface MarkdownPreviewProps {
  content: string;
  onLinkClick?: (link: string) => void;
  onTaskToggle?: (taskIndex: number, checked: boolean) => void;
}

export default function MarkdownPreview({ content, onLinkClick, onTaskToggle }: MarkdownPreviewProps) {
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
    const html = md.render(normalizeLegacyStrikethrough(processedContent));
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

    const handleCheckboxChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (!input || input.type !== 'checkbox' || !onTaskToggle) return;

      const allCheckboxes = Array.from(
        containerRef.current?.querySelectorAll('li.task-list-item > input[type="checkbox"]') || []
      );
      const index = allCheckboxes.indexOf(input);
      if (index >= 0) {
        onTaskToggle(index, input.checked);
      }
    };

    containerRef.current.addEventListener('click', handleClick);
    containerRef.current.addEventListener('change', handleCheckboxChange);

    return () => {
      containerRef.current?.removeEventListener('click', handleClick);
      containerRef.current?.removeEventListener('change', handleCheckboxChange);
    };
  }, [content, onLinkClick, onTaskToggle]);

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
        .markdown-preview del,
        .markdown-preview s {
          text-decoration-line: line-through;
          text-decoration-thickness: 2px;
          text-decoration-color: rgba(99, 102, 241, 0.7);
          text-underline-offset: 0.14em;
          opacity: 0.88;
        }
        .dark .markdown-preview del,
        .dark .markdown-preview s {
          text-decoration-color: rgba(129, 140, 248, 0.82);
          opacity: 0.92;
        }
        .markdown-preview ul.contains-task-list {
          list-style: none;
          padding-left: 0;
        }
        .markdown-preview li.task-list-item {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          margin: 0.55rem 0;
        }
        .markdown-preview li.task-list-item > input[type='checkbox'] {
          appearance: none;
          -webkit-appearance: none;
          width: 1rem;
          height: 1rem;
          margin-top: 0.2rem;
          border-radius: 9999px;
          border: 1.5px solid rgba(120, 140, 180, 0.55);
          background: transparent;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
          position: relative;
          cursor: pointer;
        }
        .dark .markdown-preview li.task-list-item > input[type='checkbox'] {
          background: transparent;
          border-color: rgba(140, 170, 220, 0.5);
        }
        .markdown-preview li.task-list-item > input[type='checkbox']:checked {
          background: linear-gradient(145deg, #36c1ff, #1f7cff);
          border-color: #1f7cff;
        }
        .markdown-preview li.task-list-item > input[type='checkbox']:checked::after {
          content: '';
          position: absolute;
          left: 0.31rem;
          top: 0.08rem;
          width: 0.32rem;
          height: 0.58rem;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .markdown-preview li.task-list-item label {
          margin: 0;
          flex: 1;
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
