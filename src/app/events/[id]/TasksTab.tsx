'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { EventTask } from '@/lib/db'
import {
  calcTaskComplexity, calcMilestones, COMPLEXITY_COLORS, TASK_ROLES,
  type TaskContext, type TaskCategory, type TaskRole,
} from '@/lib/tasks'

interface Props {
  eventId: number
  initialTasks: EventTask[]
  taskContext: TaskContext
}

const CATEGORIES: TaskCategory[] = ['Setup', 'Dynamic', 'Breakdown']

const CATEGORY_HINTS: Record<TaskCategory, string> = {
  Setup: 'Always generated — standard pre-event prep',
  Dynamic: 'Generated from this event’s selections (tickets, TV, kids, dietary, etc.)',
  Breakdown: 'Always generated — standard reset/close-out',
}

const ROLE_COLORS: Record<TaskRole, string> = {
  Lead:    'bg-[#C8973A]/20 text-[#C8973A] border-[#C8973A]/40',
  FOH:     'bg-blue-50 text-blue-700 border-blue-200',
  Kitchen: 'bg-green-50 text-green-700 border-green-200',
  Bar:     'bg-purple-50 text-purple-700 border-purple-200',
}

export function TasksTab({ eventId, initialTasks, taskContext }: Props) {
  const [tasks, setTasks] = useState<EventTask[]>(initialTasks)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [newTask, setNewTask] = useState<{ category: TaskCategory; label: string; role: TaskRole }>({ category: 'Setup', label: '', role: 'Lead' })

  useEffect(() => {
    fetch(`/api/events/${eventId}/tasks`).then(r => r.json()).then(setTasks).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const dynamicCount = tasks.filter(t => t.category === 'Dynamic').length
  const complexity = calcTaskComplexity(taskContext, dynamicCount)
  const complexityColors = COMPLEXITY_COLORS[complexity.level]
  const milestones = calcMilestones(tasks)

  async function toggle(task: EventTask) {
    const next = !task.completed
    const completedAt = next ? new Date().toISOString() : null
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: next ? 1 : 0, completed_at: completedAt } : t))
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: next }),
    })
  }

  async function saveNotes(id: number, notes: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notes } : t))
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }),
    })
  }

  async function remove(id: number) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }

  async function addTask() {
    if (!newTask.label.trim()) return
    const res = await fetch(`/api/events/${eventId}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTask),
    })
    if (!res.ok) { toast.error('Failed to add task'); return }
    const { id } = await res.json()
    setTasks(prev => [...prev, {
      id, event_id: eventId, category: newTask.category, label: newTask.label, role: newTask.role,
      source_key: null, sort_order: 0, completed: 0, completed_at: null, notes: '', created_at: new Date().toISOString(),
    }])
    setNewTask({ category: 'Setup', label: '', role: 'Lead' })
    toast.success('Task added')
  }

  function toggleExpanded(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Event Milestone Tracker */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Event Milestone Tracker</h3>
        <div className="grid grid-cols-3 gap-4">
          {milestones.map(m => (
            <div key={m.category}>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span className="font-medium">{m.category}</span>
                <span className="tabular-nums">{m.completed}/{m.total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full transition-all ${m.pct === 100 ? 'bg-green-500' : 'bg-[#C8973A]'}`}
                  style={{ width: `${m.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Complexity Rating */}
      <div className={`rounded-xl border px-4 py-3.5 flex items-center justify-between gap-4 ${complexityColors.bg} ${complexityColors.border}`}>
        <div className="shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Task Complexity Rating</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${complexityColors.dot}`} />
            <span className={`text-xl font-bold ${complexityColors.text}`}>{complexity.level}</span>
          </div>
        </div>
        <div className="text-right">
          {complexity.factors.length > 0 ? complexity.factors.map((f, i) => (
            <p key={i} className="text-xs text-gray-500">{f}</p>
          )) : <p className="text-xs text-gray-500">No complexity factors — straightforward event</p>}
        </div>
      </div>

      {/* Task lists by category */}
      {CATEGORIES.map(category => {
        const inCategory = tasks.filter(t => t.category === category)
        return (
          <div key={category} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">{category} Tasks</h3>
                <span className="text-xs text-gray-500 tabular-nums">
                  {inCategory.filter(t => t.completed).length}/{inCategory.length}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">{CATEGORY_HINTS[category]}</p>
            </div>
            {inCategory.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-500 italic">No {category.toLowerCase()} tasks for this event.</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {inCategory.map(task => (
                  <div key={task.id} className="px-4 py-2.5">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={!!task.completed}
                        onChange={() => toggle(task)}
                        className="mt-1 rounded accent-[#C8973A] w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={task.completed ? 'text-sm text-gray-500 line-through' : 'text-sm text-gray-900'}>
                            {task.label}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide border shrink-0 ${ROLE_COLORS[task.role as TaskRole] ?? ROLE_COLORS.Lead}`}>
                            {task.role}
                          </span>
                        </div>
                        {task.completed_at && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Completed {new Date(task.completed_at).toLocaleString()}
                          </p>
                        )}
                        {expanded.has(task.id) ? (
                          <textarea
                            defaultValue={task.notes}
                            onBlur={e => saveNotes(task.id, e.target.value)}
                            placeholder="Add a note…"
                            rows={2}
                            autoFocus
                            className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-600 focus:outline-none focus:border-[#C8973A]/50 resize-none"
                          />
                        ) : task.notes ? (
                          <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{task.notes}&rdquo;</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleExpanded(task.id)}
                          className="text-[10px] text-gray-500 hover:text-[#C8973A] transition-colors"
                        >
                          {expanded.has(task.id) ? 'Done' : task.notes ? 'Edit note' : '+ Note'}
                        </button>
                        <button
                          onClick={() => remove(task.id)}
                          className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                          title="Remove task"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Add manual task */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">Add Task</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={newTask.category}
            onChange={e => setNewTask(n => ({ ...n, category: e.target.value as TaskCategory }))}
            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#C8973A]/50"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={newTask.label}
            onChange={e => setNewTask(n => ({ ...n, label: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Task description"
            className="flex-1 min-w-40 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-600 focus:outline-none focus:border-[#C8973A]/50"
          />
          <select
            value={newTask.role}
            onChange={e => setNewTask(n => ({ ...n, role: e.target.value as TaskRole }))}
            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#C8973A]/50"
          >
            {TASK_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={addTask}
            className="px-3 py-1.5 rounded-lg bg-[#C8973A] hover:bg-[#b07d2e] text-white text-xs font-semibold transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
