'use client'

import { useEffect, useRef, useState } from 'react'

export default function Autocomplete() {
  const [search, setSearch] = useState('')
  const [completions, setCompletions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const justSelectedRef = useRef(false)
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    if (search.length < 2) {
      setIsOpen(false)
      return
    }

    // only hit the endpoint after 200ms after typing is stopped
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch('/api/autocomplete-trie', {
          method: 'POST',
          body: JSON.stringify({ query: search, limit: 50 }),
        })

        if (!res.ok) throw new Error(res.statusText)

        const { completions } = (await res.json()) as { completions: string[] }
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

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && completions.length > 0) {
      const selectedItem = itemRefs.current[selectedIdx]
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIdx, isOpen, completions.length])

  function handleChange(query: string) {
    setSearch(query)
  }

  async function selectItem(item: string) {
    justSelectedRef.current = true
    setSearch(item)
    setIsOpen(false)
    setSelectedIdx(0)
    console.log(item)

    // Update frecency
    try {
      await fetch('/api/autocomplete-trie', {
        method: 'PATCH',
        body: JSON.stringify({ word: item }),
      })
    } catch (e) {
      console.log('frecency update failed', e)
    }
  }

  function handleBlur(e: React.FocusEvent) {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (relatedTarget && listRef.current?.contains(relatedTarget)) {
      return
    }
    setIsOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (!isOpen) return

    if (e.ctrlKey && (e.key === 'n' || e.key === 'p')) {
      const delta = e.key === 'n' ? 1 : -1
      const newIndex = selectedIdx + delta
      if (newIndex >= completions.length) {
        setSelectedIdx(0)
      } else if (newIndex < 0) {
        setSelectedIdx(Math.max(0, completions.length - 1))
      } else {
        setSelectedIdx(newIndex)
      }
      e.preventDefault()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const item = completions[selectedIdx]
      if (item !== undefined) {
        selectItem(item)
      }
      return
    }
  }

  return (
    <>
      <input
        value={search}
        onKeyDown={handleKeyDown}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className="border border-white px-2 py-1 rounded"
      />
      {isOpen && completions.length > 0 && (
        <ul
          ref={listRef}
          className="z-10 bg-black border border-gray-800 text-white rounded mt-1 max-h-60 overflow-auto [scrollbar-width:thin] [scrollbar-color:#4b5563_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded"
        >
          {completions.map((c, i) => {
            const isSelected = selectedIdx === i
            return (
              <li
                key={c}
                tabIndex={-1}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                className={`px-2 py-1 cursor-pointer ${
                  isSelected
                    ? 'bg-violet-300 text-black'
                    : 'text-white hover:bg-violet-300 hover:text-black'
                }`}
                onMouseEnter={() => setSelectedIdx(i)}
                onClick={() => selectItem(c)}
              >
                {c}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
