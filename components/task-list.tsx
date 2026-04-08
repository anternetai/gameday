"use client"

import { useState, useRef } from "react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, Trash2, Star } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Task {
  id: string
  title: string
  category: string
  xp_value: number
  completed: boolean
  sort_order: number | null
  task_date: string
  scheduled_time: string | null
  notes: string | null
  completed_at: string | null
  source: string
  source_id: string | null
  created_at: string
}

const CATEGORY_STYLES: Record<
  string,
  { pill: string; dot: string }
> = {
  HFH: {
    pill: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  SQUEEGEE: {
    pill: "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20",
    dot: "bg-sky-500",
  },
  DAILY: {
    pill: "bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20",
    dot: "bg-orange-500",
  },
  PERSONAL: {
    pill: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
    dot: "bg-violet-500",
  },
  CADENCE: {
    pill: "bg-pink-400/10 text-pink-400 ring-1 ring-pink-400/20",
    dot: "bg-pink-400",
  },
}

function categoryStyle(cat: string) {
  return (
    CATEGORY_STYLES[cat?.toUpperCase()] ?? {
      pill: "bg-zinc-700/50 text-zinc-400 ring-1 ring-zinc-700",
      dot: "bg-zinc-500",
    }
  )
}

interface TaskRowProps {
  task: Task
  index: number
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

function TaskRow({ task, index, onToggle, onDelete, onRename }: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const styles = categoryStyle(task.category)

  function startEdit() {
    setDraft(task.title)
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== task.title) {
      onRename(task.id, trimmed)
    } else {
      setDraft(task.title)
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      commitEdit()
    }
    if (e.key === "Escape") {
      setDraft(task.title)
      setEditing(false)
    }
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            "group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-150",
            snapshot.isDragging
              ? "border-orange-500/40 bg-zinc-800 shadow-lg shadow-black/40 scale-[1.01]"
              : task.completed
              ? "border-zinc-800/60 bg-zinc-900/30"
              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
          )}
        >
          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="shrink-0 text-zinc-700 hover:text-zinc-400 cursor-grab active:cursor-grabbing transition-colors"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* Custom checkbox */}
          <button
            onClick={() => onToggle(task.id, !task.completed)}
            className={cn(
              "shrink-0 w-4.5 h-4.5 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
              task.completed
                ? "border-orange-500 bg-orange-500"
                : "border-zinc-600 hover:border-orange-400"
            )}
            style={{ width: 18, height: 18, minWidth: 18 }}
          >
            {task.completed && (
              <svg
                viewBox="0 0 10 8"
                className="w-2.5 h-2 text-white fill-none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 4L3.5 6.5L9 1" />
              </svg>
            )}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm text-white outline-none border-b border-orange-500/50"
              />
            ) : (
              <span
                onClick={startEdit}
                className={cn(
                  "text-sm cursor-text select-none block truncate",
                  task.completed
                    ? "line-through text-zinc-600"
                    : "text-zinc-100"
                )}
              >
                {task.title}
              </span>
            )}
          </div>

          {/* Category pill */}
          <span
            className={cn(
              "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide",
              styles.pill,
              task.completed && "opacity-40"
            )}
          >
            {task.category}
          </span>

          {/* XP badge */}
          <span
            className={cn(
              "shrink-0 flex items-center gap-0.5 text-[10px] font-medium tabular-nums",
              task.completed ? "text-zinc-600" : "text-orange-400"
            )}
          >
            <Star className="w-2.5 h-2.5" />
            {task.xp_value}
          </span>

          {/* Delete button — visible on hover */}
          <button
            onClick={() => onDelete(task.id)}
            className={cn(
              "shrink-0 text-zinc-700 hover:text-red-400 transition-all duration-150",
              hovered ? "opacity-100" : "opacity-0"
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </Draggable>
  )
}

interface TaskListProps {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
  onAllComplete?: () => void
}

export function TaskList({ tasks, onTasksChange, onAllComplete }: TaskListProps) {
  // Sort: uncompleted first by sort_order, completed at bottom
  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const aOrder = a.sort_order ?? 9999
    const bOrder = b.sort_order ?? 9999
    return aOrder - bOrder
  })

  async function handleToggle(id: string, completed: boolean) {
    // Optimistic update
    const updated = tasks.map((t) =>
      t.id === id
        ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
        : t
    )
    onTasksChange(updated)

    try {
      const res = await fetch(`/api/tasks/${id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      })
      const data = await res.json()
      if (data.allComplete && onAllComplete) {
        onAllComplete()
      }
    } catch {
      // Revert on error
      onTasksChange(tasks)
    }
  }

  async function handleDelete(id: string) {
    const prev = tasks
    onTasksChange(tasks.filter((t) => t.id !== id))
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    } catch {
      onTasksChange(prev)
    }
  }

  async function handleRename(id: string, title: string) {
    const updated = tasks.map((t) => (t.id === id ? { ...t, title } : t))
    onTasksChange(updated)
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
    } catch {
      // silent fail
    }
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const { source, destination } = result
    if (source.index === destination.index) return

    const reordered = [...sorted]
    const [moved] = reordered.splice(source.index, 1)
    reordered.splice(destination.index, 0, moved)

    // Update sort_order locally
    const withOrder = reordered.map((t, i) => ({ ...t, sort_order: i + 1 }))
    onTasksChange(withOrder)

    // Persist
    try {
      await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: withOrder.map((t) => t.id) }),
      })
    } catch {
      // silent fail
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
          <Star className="w-5 h-5 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-500">No tasks for today</p>
        <p className="text-xs text-zinc-700 mt-1">Add one below to get started</p>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="task-list">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-1.5"
          >
            {sorted.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                index={index}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
