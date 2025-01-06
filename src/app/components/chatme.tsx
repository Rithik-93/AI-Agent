import React from 'react';
import { User, Bot } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type ChatMessageProps = {
  role: 'user' | 'assistant';
  content: string;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start space-x-2 max-w-[80%] ${role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <Avatar>
          <AvatarFallback>{role === 'user' ? 'U' : 'AI'}</AvatarFallback>
          <AvatarImage src={role === 'user' ? '/user-avatar.png' : '/ai-avatar.png'} />
        </Avatar>
        <div className={`rounded-lg p-3 ${role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          <div className="text-sm whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </div>
  );
};

