'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useMutation } from '@tanstack/react-query';
import { copilotApi } from '@/lib/api/copilot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Bot, Send, User, Loader2, Sparkles, ShieldAlert, BookOpen, AlertTriangle, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CopilotQueryRequest, CopilotResponse, CopilotCitation } from '@/types/api';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: CopilotResponse['citations'];
  sif_context_used?: boolean;
};

export default function CopilotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([{
    id: 'initial-msg',
    role: 'assistant',
    content: "Hello. I am the SIF Sentinel AI Copilot. How can I assist you with safety analysis, hazard prediction, or OSHA guidelines today?"
  }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages]);

  const mutation = useMutation({
    mutationFn: (req: CopilotQueryRequest) => copilotApi.ask(req),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        sif_context_used: data.sif_context_used
      }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I encountered an error connecting to the safety knowledge base. Please try again later."
      }]);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || mutation.isPending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userMessage }]);
    
    mutation.mutate({
      query: userMessage
    });
  };

  const getCitationIcon = (type: string) => {
    switch(type) {
      case 'report': return <AlertTriangle className="w-3 h-3" />;
      case 'osha_rule': return <BookOpen className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4 max-w-5xl mx-auto w-full">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          AI Safety Copilot
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Powered by Gemini Pro • Trained on OSHA standards and SIF precursor models
        </p>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm rounded-2xl">
        <ScrollArea className="flex-1 p-6">
          <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:text-slate-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>

                  {/* SIF Context Indicator */}
                  {msg.sif_context_used && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200/50">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      SIF precursor patterns detected in query
                    </div>
                  )}

              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {msg.citations.map((cite: CopilotCitation, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-100/80 hover:bg-slate-200/80 cursor-pointer px-2.5 py-1 rounded-md border border-slate-200 transition-colors">
                      {getCitationIcon(cite.type)}
                      <span className="truncate max-w-[150px]">{cite.title}</span>
                          <span className="text-slate-400">({(cite.relevance_score * 100).toFixed(0)}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto w-full relative items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about safety protocols, risk analysis, or precursor patterns..."
              className="resize-none min-h-[52px] max-h-32 py-3.5 px-4 pr-14 text-[15px] bg-slate-50 border-slate-200 focus-visible:ring-blue-600 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!input.trim() || mutation.isPending}
              className="absolute right-2 bottom-2 w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-100 disabled:text-slate-400"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="text-center mt-3">
             <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Copilot can make mistakes. Verify critical safety decisions.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
