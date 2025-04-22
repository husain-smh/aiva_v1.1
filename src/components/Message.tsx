'use client';

import { FC } from 'react';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

const Message: FC<MessageProps> = ({ role, content }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex max-w-[80%] rounded-lg p-4 my-2 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-card text-card-foreground rounded-bl-none border border-border'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};

export default Message; 