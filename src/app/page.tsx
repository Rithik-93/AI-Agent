'use client';
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CodeBlock {
  curl?: string;
  example?: string;
}

interface ApiResponse {
  content: string;
  code?: CodeBlock;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  code?: CodeBlock;
}

const ChatMessage: React.FC<Message> = ({ role, content, code }) => {
  const isJson = content.startsWith('{') && content.endsWith('}');
  let parsedContent: ApiResponse | null = null;
  
  if (isJson) {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse JSON content:', e);
    }
  }

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`rounded-lg p-4 max-w-[80%] ${
        role === 'user' 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        {parsedContent ? (
          <div className="space-y-4">
            <div>{parsedContent.content}</div>
            {parsedContent.code && (
              <div className="mt-2 space-y-2">
                {parsedContent.code.curl && (
                  <div className="bg-gray-800 text-white p-3 rounded-md overflow-x-auto">
                    <code className="text-sm font-mono">
                      {parsedContent.code.curl}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>{content}</div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [prevValue, setPrevValue] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: input, prev: prevValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: JSON.stringify(data, null, 2),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setPrevValue(prev => [...prev, input]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  code={message.code}
                />
              ))}
              {isLoading && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <div className="animate-pulse flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                  </div>
                  <div>AI is thinking...</div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSubmit} className="flex w-full space-x-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a coding question..."
              className="flex-grow"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}