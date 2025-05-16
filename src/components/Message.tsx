'use client';

import { FC, useState, ReactNode } from 'react';
import { Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function Message({ role, content }: MessageProps) {
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

  // Function to convert URLs in text to clickable links
  const linkifyText = (text: string): ReactNode[] => {
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Split the text by URLs
    const parts = text.split(urlRegex);
    
    // Find all URLs in the text
    const urls = text.match(urlRegex) || [];
    
    // Combine parts and URLs
    const result: ReactNode[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      // Add the text part
      if (parts[i]) {
        result.push(<span key={`text-${i}`}>{parts[i]}</span>);
      }
      
      // Add the URL part (if there is one)
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