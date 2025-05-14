'use client';

import { FC, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface Task {
  tool: string;
  input: any;
  output: any;
}

interface TaskPanelProps {
  tasks: Task[];
}

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

  const formatTaskTitle = (tool: string) => {
    // Convert tool name to title case and remove underscores
    return tool
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const truncateText = (text: any, maxLength: number = 100) => {
    if (!text) return '';
    const stringText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    if (stringText.length <= maxLength) return stringText;
    return stringText.slice(0, maxLength) + '...';
  };

  // Don't render anything until the component is mounted on the client
  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`fixed right-0 top-0 h-full bg-background border-l transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '400px', zIndex: 50 }}
    >
      <div className="absolute -left-10 top-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full"
        >
          {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Tasks</h2>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {tasks.map((task, index) => {
              const taskId = `${task.tool}-${index}`;
              const isExpanded = expandedTasks.has(taskId);
              const taskTitle = formatTaskTitle(task.tool);
              const taskDetails = task.input ? JSON.stringify(task.input, null, 2) : '';
              const taskOutput = task.output ? JSON.stringify(task.output, null, 2) : '';

              return (
                <Card key={taskId} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{taskTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Tool:</strong> {task.tool}
                      </div>
                      {task.input && (
                        <div className="text-sm">
                          <strong>Details:</strong>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded">
                            {isExpanded ? taskDetails : truncateText(taskDetails)}
                          </pre>
                        </div>
                      )}
                      {task.output && (
                        <div className="text-sm">
                          <strong>Result:</strong>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded">
                            {isExpanded ? taskOutput : truncateText(taskOutput)}
                          </pre>
                        </div>
                      )}
                      {(task.input || task.output) && (
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