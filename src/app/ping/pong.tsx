'use client'
import { PingRes } from '@/app/api/ping'
import { useState, useEffect } from 'react'

export default function Pong() {
  const [data, setData] = useState<PingRes | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  async function ping() {
    setLoading(true)
    try {
      const res = await fetch('/api/ping')
      if (!res.ok) throw new Error(res.statusText)
      const json = (await res.json()) as PingRes
      setData(json)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ping()
  }, [])

  if (loading) return <div>loading...</div>
  if (error) return <div>err: {error.message}</div>
  return <div>{data?.status}</div>
}
