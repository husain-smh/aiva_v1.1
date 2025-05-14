'use client';

import { FC, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function Message({ role, content }) {
  const isUser = role === 'user';
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} my-2`}
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
      style={{ position: 'relative' }}
    >
      {isUser ? (
        <div className="relative rounded-lg p-3 text-sm bg-muted text-foreground break-words whitespace-pre-wrap max-w-[70%] min-w-[40px]">
          {content}
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
        <div className="rounded-lg p-3 text-sm bg-card text-card-foreground break-words whitespace-pre-wrap max-w-[70%] min-w-[40px]">
          {content}
        </div>
      )}
    </div>
  );
} 