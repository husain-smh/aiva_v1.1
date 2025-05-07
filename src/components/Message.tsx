'use client';

import { FC, useState } from 'react';
import { Copy } from 'lucide-react';

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
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
      style={{ position: 'relative' }}
    >
      <div
        className={`relative rounded-lg p-3 text-sm chat-bubble-text break-words whitespace-pre-wrap ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'} min-w-[40px] max-w-[90%]'}`}
      >
        {content}
      </div>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="absolute -bottom-2 right-0 p-1 rounded-md hover:bg-primary/20 transition-opacity translate-y-full"
          title={copied ? 'Copied!' : 'Copy to clipboard'}
          style={{ zIndex: 2 }}
        >
          <Copy size={14} className="opacity-70" />
        </button>
      )}
    </div>
  );
} 