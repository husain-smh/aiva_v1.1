'use client';

import { FC, useState, ReactNode } from 'react';
import { Copy } from 'lucide-react';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';
import { containsMarkdown } from '@/utils/markdown';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function Message({ role, content }: MessageProps) {
  const isUser = role === 'user';
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const isMarkdown = containsMarkdown(content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Function to convert URLs in text to clickable links (only for plain text)
  const linkifyText = (text: string): ReactNode[] => {
    if (isMarkdown) {
      return [
        <div key="markdown" className="markdown-content">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="markdown-p">{children}</p>,
              h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
              h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
              h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
              h4: ({ children }) => <h4 className="markdown-h4">{children}</h4>,
              h5: ({ children }) => <h5 className="markdown-h5">{children}</h5>,
              h6: ({ children }) => <h6 className="markdown-h6">{children}</h6>,
              code: ({ children }) => <code className="markdown-code">{children}</code>,
              pre: ({ children }) => <pre className="markdown-pre">{children}</pre>,
              ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
              ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
              li: ({ children }) => <li className="markdown-li">{children}</li>,
              blockquote: ({ children }) => <blockquote className="markdown-blockquote">{children}</blockquote>,
              a: ({ href, children }) => <a href={href} className="markdown-a" target="_blank" rel="noopener noreferrer">{children}</a>,
              table: ({ children }) => <table className="markdown-table">{children}</table>,
              thead: ({ children }) => <thead className="markdown-thead">{children}</thead>,
              tbody: ({ children }) => <tbody className="markdown-tbody">{children}</tbody>,
              tr: ({ children }) => <tr className="markdown-tr">{children}</tr>,
              th: ({ children }) => <th className="markdown-th">{children}</th>,
              td: ({ children }) => <td className="markdown-td">{children}</td>,
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      ];
    }
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    const urls = text.match(urlRegex) || [];
    const result: ReactNode[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        result.push(<span key={`text-${i}`}>{parts[i]}</span>);
      }
      if (urls[i - Math.floor(i/2)]) {
        const url = urls[i - Math.floor(i/2)];
        result.push(
          <a 
            key={`link-${i}`} 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {url}
          </a>
        );
      }
    }
    
    return result;
  };

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} my-2`}
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
      style={{ position: 'relative' }}
    >
      {isUser ? (
        <div className="user-message text-foreground break-words whitespace-pre-wrap max-w-[70%] ml-auto min-w-[40px]">
          {linkifyText(content)}
          {showCopy && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="absolute -bottom-2 right-0 p-1 rounded-md hover:bg-primary/20 transition-opacity translate-y-full"
              title={copied ? 'Copied!' : 'Copy to clipboard'}
              style={{ zIndex: 2 }}
            >
              <Copy size={14} className="opacity-70" />
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg p-3 text-sm text-card-foreground break-words whitespace-pre-wrap max-w-[70%] mr-auto min-w-[40px]">
          {linkifyText(content)}
        </div>
      )}
    </div>
  );
} 