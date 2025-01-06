'use client';
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from './components/chatme';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

type Message = {
  role: 'user' | 'assistant';
  content: string;
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






      interface Content {
        answer: string;
        authentication?: string;
        limitations?: string;
        relatedEndpoints?: string[];
      }

      interface LLMResponse {
        content: Content;
        code?: {
          curl?: string;
          parameters?: string;
          response?: string;
        };
      }

      function parseResponse(response: string): LLMResponse {
        try {
          // Remove markdown code block syntax if present
          const cleanResponse = response.replace(/```json\n|\n```/g, '');
          const parsed = JSON.parse(cleanResponse);
          return parsed;
        } catch (error) {
          throw new Error(`Failed to parse response: ${error}`);
        }
      }

      const parsedResponse = parseResponse(data.response);
      const formattedContent = [
        parsedResponse.content.answer,
        parsedResponse.content.authentication && `\nAuthentication: ${parsedResponse.content.authentication}`,
        parsedResponse.content.limitations && `\nLimitations: ${parsedResponse.content.limitations}`,
        parsedResponse.code && `\nCode Example:\n${Object.entries(parsedResponse.code).map(([key, value]) =>
          `${key.toUpperCase()}:\n${value}`).join('\n')}`
      ].filter(Boolean).join('\n');

      const assistantMessage: Message = {
        role: 'assistant',
        content: formattedContent,
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

