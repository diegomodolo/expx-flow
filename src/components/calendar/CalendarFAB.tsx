import { useState, useRef, useEffect } from "react";
import { Plus, Video, ListTodo } from "lucide-react";

interface CalendarFABProps {
  onNewMeeting: () => void;
  onNewTask: () => void;
}

export function CalendarFAB({ onNewMeeting, onNewTask }: CalendarFABProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={menuRef}>
      {open && (
        <div className="absolute bottom-16 right-0 bg-popover border rounded-lg shadow-lg py-1 min-w-[180px] animate-in fade-in slide-in-from-bottom-2">
          <button
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            onClick={() => {
              onNewMeeting();
              setOpen(false);
            }}
          >
            <Video className="h-4 w-4 text-green-500" />
            Nova Reunião
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            onClick={() => {
              onNewTask();
              setOpen(false);
            }}
          >
            <ListTodo className="h-4 w-4 text-blue-500" />
            Nova Tarefa
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-all"
      >
        <Plus
          className={`h-6 w-6 transition-transform ${open ? "rotate-45" : ""}`}
        />
      </button>
    </div>
  );
}
