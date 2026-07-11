import React, { type ReactNode } from 'react';

interface Props {
  text: string;
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_([^_\n]+)_|\[[^\]\n]+\]\([^)\n]+\)|https?:\/\/[^\s<]+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(...renderBreaks(text.slice(cursor, match.index), `${keyPrefix}-plain-${index}`));
    const token = match[0];
    const key = `${keyPrefix}-${index}`;

    if (token.startsWith('`')) {
      nodes.push(<code key={key} className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[0.9em] text-slate-900">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={key} className="font-semibold text-slate-950">{renderInline(token.slice(2, -2), `${key}-strong`)}</strong>);
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), `${key}-em`)}</em>);
    } else if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = link ? safeUrl(link[2]) : null;
      nodes.push(href ? (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900">
          {link?.[1]}
        </a>
      ) : <span key={key}>{token}</span>);
    } else {
      const href = safeUrl(token);
      nodes.push(href ? <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline decoration-sky-300 underline-offset-2">{token}</a> : token);
    }

    cursor = match.index + token.length;
    index += 1;
  }

  if (cursor < text.length) nodes.push(...renderBreaks(text.slice(cursor), `${keyPrefix}-tail`));
  return nodes;
}

function renderBreaks(text: string, keyPrefix: string): ReactNode[] {
  const lines = text.split('\n');
  return lines.flatMap((line, index) => index === 0 ? [line] : [<br key={`${keyPrefix}-br-${index}`} />, line]);
}

function startsBlock(line: string): boolean {
  return /^(#{1,6})\s+/.test(line) || /^\s*(```|~~~)/.test(line) || /^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line) || /^\s*>/.test(line) || /^\s*(?:[-+*]|\d+[.)])\s+/.test(line);
}

function renderBlocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let cursor = 0;
  let blockIndex = 0;

  while (cursor < lines.length) {
    if (!lines[cursor].trim()) {
      cursor += 1;
      continue;
    }
    const key = `block-${blockIndex++}`;
    const fence = lines[cursor].match(/^\s*(```|~~~)(.*)$/);
    if (fence) {
      const marker = fence[1];
      const language = fence[2].trim();
      const code: string[] = [];
      cursor += 1;
      while (cursor < lines.length && !lines[cursor].trimStart().startsWith(marker)) code.push(lines[cursor++]);
      if (cursor < lines.length) cursor += 1;
      blocks.push(
        <div key={key} className="my-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 text-slate-100">
          {language && <div className="border-b border-slate-800 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">{language}</div>}
          <pre className="overflow-x-auto p-3 text-xs leading-relaxed"><code>{code.join('\n')}</code></pre>
        </div>,
      );
      continue;
    }

    const heading = lines[cursor].match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const classes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm', 'text-xs'][level - 1];
      blocks.push(React.createElement(`h${level}`, { key, className: `mb-2 mt-4 font-semibold text-slate-950 first:mt-0 ${classes}` }, renderInline(heading[2], `${key}-heading`)));
      cursor += 1;
      continue;
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(lines[cursor])) {
      blocks.push(<hr key={key} className="my-4 border-slate-200" />);
      cursor += 1;
      continue;
    }

    if (/^\s*>/.test(lines[cursor])) {
      const quote: string[] = [];
      while (cursor < lines.length && /^\s*>/.test(lines[cursor])) quote.push(lines[cursor++].replace(/^\s*>\s?/, ''));
      blocks.push(<blockquote key={key} className="my-3 border-l-4 border-sky-200 bg-sky-50 px-3 py-2 text-slate-700">{renderInline(quote.join('\n'), `${key}-quote`)}</blockquote>);
      continue;
    }

    const list = lines[cursor].match(/^\s*(?:(\d+)[.)]|([-+*]))\s+(.+)$/);
    if (list) {
      const ordered = Boolean(list[1]);
      const items: string[] = [];
      const start = ordered ? Number(list[1]) : undefined;
      while (cursor < lines.length) {
        const item = lines[cursor].match(/^\s*(?:(\d+)[.)]|([-+*]))\s+(.+)$/);
        if (!item || Boolean(item[1]) !== ordered) break;
        items.push(item[3]);
        cursor += 1;
      }
      const children = items.map((item, index) => <li key={`${key}-${index}`} className="pl-1">{renderInline(item, `${key}-${index}`)}</li>);
      blocks.push(ordered
        ? <ol key={key} start={start} className="my-3 list-decimal space-y-1 pl-6">{children}</ol>
        : <ul key={key} className="my-3 list-disc space-y-1 pl-6">{children}</ul>);
      continue;
    }

    const paragraph = [lines[cursor++]];
    while (cursor < lines.length && lines[cursor].trim() && !startsBlock(lines[cursor])) paragraph.push(lines[cursor++]);
    blocks.push(<p key={key} className="my-3 first:mt-0 last:mb-0">{renderInline(paragraph.join('\n'), `${key}-paragraph`)}</p>);
  }

  return blocks;
}

export default function MarkdownText({ text }: Props) {
  return <div className="min-w-0 break-words leading-relaxed">{renderBlocks(text)}</div>;
}
