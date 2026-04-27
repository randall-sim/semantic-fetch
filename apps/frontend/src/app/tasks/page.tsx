'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  createTask,
  decodeEmail,
  deleteTask,
  getTasks,
  Task,
  updateTask,
} from '@/lib/api'
import { useToast } from '@/components/toast'

export default function TasksPage() {
  const router = useRouter()
  const toast = useToast()
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = localStorage.getItem('token')
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
    setEmail(decodeEmail(t))
  }, [router])

  useEffect(() => {
    if (!token) return
    fetchTasks(token)
  }, [token])

  async function fetchTasks(t: string) {
    setLoading(true)
    try {
      const data = await getTasks(t)
      setTasks(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks'
      if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
        handleLogout()
      } else {
        toast.show(msg, 'error')
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
      toast.show('Task added', 'success')
    } catch (err: unknown) {
      toast.show(err instanceof Error ? err.message : 'Failed to create task', 'error')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(task: Task) {
    if (!token) return
    const nextStatus = task.status === 'done' ? 'pending' : 'done'
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    )
    try {
      const updated = await updateTask(token, task.id, { status: nextStatus })
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      toast.show(nextStatus === 'done' ? 'Marked as done' : 'Moved to to-do', 'success')
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
      )
      toast.show('Failed to update task', 'error')
    }
  }

  async function handleDelete(id: number) {
    if (!token) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await deleteTask(token, id)
      toast.show('Task deleted', 'info')
    } catch {
      fetchTasks(token)
      toast.show('Failed to delete task', 'error')
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
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-md bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-white dark:text-zinc-900"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
              Task Tracker
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {email && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:block truncate max-w-48">
                {email}
              </span>
            )}
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
            placeholder="What needs to be done?"
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 transition-shadow"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
          >
            {adding ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              'Add'
            )}
          </button>
        </form>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-5 h-5 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm text-zinc-400">Loading tasks…</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No tasks yet</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                Add your first task above to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {pending.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 px-1">
                  To do · {pending.length}
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

            {done.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 px-1">
                  Done · {done.length}
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
  const isDone = task.status === 'done'
  const date = new Date(task.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <li className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3.5 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      {/* Checkbox toggle */}
      <button
        onClick={() => onToggle(task)}
        aria-label={isDone ? 'Mark as to-do' : 'Mark as done'}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
          isDone
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-400 dark:hover:border-emerald-500'
        }`}
      >
        {isDone && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Title + date */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate transition-colors ${
            isDone
              ? 'line-through text-zinc-400 dark:text-zinc-500'
              : 'text-zinc-900 dark:text-zinc-50'
          }`}
        >
          {task.title}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{date}</p>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(task.id)}
        aria-label="Delete task"
        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
