'use client';

import { FC, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Mail, AtSign, FileText, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

// Simple Gmail SVG icon
const GmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
    <rect width="48" height="48" rx="10" fill="#fff"/>
    <path d="M6 14v20c0 2.2 1.8 4 4 4h28c2.2 0 4-1.8 4-4V14c0-2.2-1.8-4-4-4H10c-2.2 0-4 1.8-4 4z" fill="#EA4335"/>
    <path d="M42 14l-18 13L6 14" fill="#fff"/>
    <path d="M6 14l18 13 18-13" stroke="#EA4335" strokeWidth="2"/>
  </svg>
);

interface Task {
  tool: string;
  input: any;
  output: any;
}

interface TaskPanelProps {
  tasks: Task[];
}

const toolIcon = (tool: string) => {
  if (tool.toLowerCase().includes('gmail')) return <GmailIcon />;
  // Add more tool icons as needed
  return <Info className="inline-block mr-1 text-muted-foreground" size={18} />;
};

const labelIcon = (label: string) => {
  switch (label.toLowerCase()) {
    case 'recipient_email':
      return <AtSign className="inline-block mr-1 text-primary" size={16} />;
    case 'subject':
      return <FileText className="inline-block mr-1 text-primary" size={16} />;
    case 'body':
      return <Mail className="inline-block mr-1 text-primary" size={16} />;
    default:
      return null;
  }
};

const formatTaskTitle = (tool: string) => {
  return tool
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const readableDetails = (input: any) => {
  if (!input || typeof input !== 'object') return null;
  return (
    <ul className="space-y-1 mt-1">
      {Object.entries(input).map(([key, value]) => (
        <li key={key} className="flex items-start text-sm">
          <span className="mr-2 mt-0.5">{labelIcon(key)}</span>
          <span className="font-medium capitalize text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
          <span className="ml-2 break-all text-foreground">{String(value)}</span>
        </li>
      ))}
    </ul>
  );
};

const TaskPanel: FC<TaskPanelProps> = ({ tasks }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Don't render until mounted (for hydration safety)
  if (!mounted) return null;

  return (
    <div
      className={`fixed right-0 top-0 h-full bg-background border-l shadow-2xl rounded-l-xl transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '400px', zIndex: 50 }}
    >
      {/* Centered toggle button */}
      <div className="absolute -left-10 top-1/2 -translate-y-1/2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full shadow-lg border bg-background"
        >
          {isOpen ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </Button>
      </div>

      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold tracking-tight">Tasks</h2>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-6">
            {tasks.map((task, index) => {
              const taskId = `${task.tool}-${index}`;
              const isExpanded = expandedTasks.has(taskId);
              const taskTitle = formatTaskTitle(task.tool);
              const toolName = task.tool;
              const details = task.input;
              const output = task.output;

              return (
                <Card
                  key={taskId}
                  className="overflow-hidden rounded-xl shadow-lg bg-card border border-muted w-full"
                >
                  <CardHeader className="pb-2 flex flex-row items-center gap-2">
                    <span>{toolIcon(toolName)}</span>
                    <CardTitle className="text-lg font-bold flex-1">{taskTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Tool:</span>
                        <span className="text-primary font-bold flex items-center gap-1">{toolIcon(toolName)}{toolName}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <span className="block text-xs text-muted-foreground font-semibold mb-1">Details:</span>
                        {details && (isExpanded ? (
                          readableDetails(details)
                        ) : (
                          <div className="truncate text-sm text-foreground">
                            {readableDetails(details)?.props.children?.slice(0,2)}
                            <span className="text-muted-foreground"> ...</span>
                          </div>
                        ))}
                      </div>
                      {output && (
                        <div className="border-t pt-2 mt-2">
                          <span className="block text-xs text-muted-foreground font-semibold mb-1">Result:</span>
                          <pre className="text-xs bg-muted p-2 rounded-lg overflow-x-auto max-h-32">
                            {isExpanded ? (typeof output === 'string' ? output : JSON.stringify(output, null, 2)) : (typeof output === 'string' ? output.slice(0, 100) + (output.length > 100 ? '...' : '') : JSON.stringify(output, null, 2).slice(0, 100) + '...')}
                          </pre>
                        </div>
                      )}
                      {(details || output) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => toggleTask(taskId)}
                        >
                          {isExpanded ? 'Show Less' : 'Show More'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TaskPanel; 