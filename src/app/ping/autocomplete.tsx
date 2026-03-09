'use client'
import { useEffect, useState } from 'react'

// TODO: different put cache in a different file
const cache = new Map<string, string[]>()

export default function Autocomplete() {
  const [search, setSearch] = useState('')
  const [completions, setCompletions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    // only hit the endpoint after 200ms after typing is stopped
    if (search.length < 2) return

    if (cache.has(search)) {
      console.log('cache hit', cache.get(search))
      setCompletions(cache.get(search) ?? [])
      setIsOpen(true)
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch('/api/autocomplete', {
          method: 'POST',
          body: JSON.stringify({ query: search, limit: 50 }),
        })

        if (!res.ok) throw new Error(res.statusText)

        const { completions } = (await res.json()) as { completions: string[] }
        cache.set(search, completions)
        setCompletions(completions)
        setIsOpen(true)
      } catch (e) {
        console.log(e)
      }
    }, 200)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [search])

  async function handleChange(query: string) {
    setSearch(query)
  }

  function selectItem(item: string) {
    console.log(item)
    setIsOpen(false)
    setSearch(item)
  }

  return (
    <>
      <input
        value={search}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(e) => {
          console.log(e.key)
          if (e.ctrlKey && (e.key === 'n' || e.key === 'p')) {
            const delta = e.key === 'n' ? 1 : -1
            const newIndex = selectedIdx + delta
            if (newIndex > completions.length) {
              setSelectedIdx(0)
            } else if (newIndex < 0) {
              setSelectedIdx(completions.length - 1)
            } else {
              setSelectedIdx(newIndex)
            }
          }

          if (e.key === 'Enter') {
            setIsOpen(false)
            setSearch(completions[selectedIdx])
          }
        }}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-white"
      />
      {isOpen && (
        <ul className="z-10">
          {completions.map((c, i) => (
            <li
              key={i}
              className="hover:bg-blue-300"
              style={{ backgroundColor: selectedIdx === i ? 'blue' : 'transparent' }}
            >
              <button className="cursor-pointer" onClick={() => selectItem(c)}>
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
