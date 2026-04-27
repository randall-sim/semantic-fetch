'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createTask,
  decodeEmail,
  deleteTask,
  getTasks,
  Task,
  updateTask,
} from '@/lib/api'

export default function TasksPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load token and guard the page
  useEffect(() => {
    const t = localStorage.getItem('token')
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
    setEmail(decodeEmail(t))
  }, [router])

  // Fetch tasks whenever the token is available
  useEffect(() => {
    if (!token) return
    fetchTasks(token)
  }, [token])

  async function fetchTasks(t: string) {
    setLoading(true)
    setError('')
    try {
      const data = await getTasks(t)
      setTasks(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks'
      if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
        handleLogout()
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !newTitle.trim()) return
    setAdding(true)
    try {
      const task = await createTask(token, newTitle.trim())
      setTasks((prev) => [task, ...prev])
      setNewTitle('')
      inputRef.current?.focus()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(task: Task) {
    if (!token) return
    const nextStatus = task.status === 'done' ? 'pending' : 'done'
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    )
    try {
      const updated = await updateTask(token, task.id, { status: nextStatus })
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
      )
    }
  }

  async function handleDelete(id: number) {
    if (!token) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await deleteTask(token, id)
    } catch {
      // If delete fails, refetch to restore state
      fetchTasks(token)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    router.replace('/login')
  }

  const pending = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')

  if (!token) return null

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            Task Tracker
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
              {email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Add task form */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-8">
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a new task…"
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Add
          </button>
        </form>

        {error && (
          <p className="mb-4 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        {loading ? (
          <div className="text-center py-16 text-sm text-zinc-400">
            Loading…
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">
              No tasks yet. Add one above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Pending tasks */}
            {pending.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                  To do ({pending.length})
                </h2>
                <ul className="flex flex-col gap-2">
                  {pending.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* Completed tasks */}
            {done.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                  Done ({done.length})
                </h2>
                <ul className="flex flex-col gap-2">
                  {done.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: (task: Task) => void
  onDelete: (id: number) => void
}) {
  const done = task.status === 'done'
  const date = new Date(task.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <li className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 group">
      {/* Checkbox toggle */}
      <button
        onClick={() => onToggle(task)}
        aria-label={done ? 'Mark pending' : 'Mark done'}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
          done
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-500'
        }`}
      >
        {done && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Title + date */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${
            done
              ? 'line-through text-zinc-400 dark:text-zinc-500'
              : 'text-zinc-900 dark:text-zinc-50'
          }`}
        >
          {task.title}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
          {date}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(task.id)}
        aria-label="Delete task"
        className="shrink-0 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-all cursor-pointer"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </li>
  )
}
