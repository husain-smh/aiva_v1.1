'use client';

import { FC, useState } from 'react';
import { Copy } from 'lucide-react';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

const Message: FC<MessageProps> = ({ role, content }) => {
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
    >
      <div
        className={`flex max-w-[80%] rounded-lg p-4 my-2 relative group ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-card text-card-foreground rounded-bl-none border border-border'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {showCopy && (
          <button
            onClick={handleCopy}
            className={`absolute top-2 right-2 p-1 rounded-md transition-opacity ${
              isUser ? 'hover:bg-primary-foreground/20' : 'hover:bg-card-foreground/20'
            }`}
            title={copied ? "Copied!" : "Copy to clipboard"}
          >
            <Copy 
              size={16} 
              className={isUser ? 'text-primary-foreground/70' : 'text-card-foreground/70'} 
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default Message; 