'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.replace('/tasks')
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-100 dark:border-zinc-900">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white dark:text-zinc-900"
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
            <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
              Task Tracker
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          Simple task management
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 max-w-2xl leading-[1.1]">
          Stay organized.
          <br />
          Get things done.
        </h1>

        <p className="mt-6 text-lg text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
          A lightweight task tracker that keeps you focused on what matters most.
          No noise, no clutter — just your tasks.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-zinc-100 dark:border-zinc-900 py-20 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-zinc-700 dark:text-zinc-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Instant updates</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Optimistic UI makes every action feel immediate — no waiting for the server.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-zinc-700 dark:text-zinc-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Private & secure</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Your tasks are yours alone, protected by JWT authentication.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-zinc-700 dark:text-zinc-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Clean focus</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Two sections: to do and done. No tags, no priorities — just clarity.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-900 py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600">
          <span>Task Tracker</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
