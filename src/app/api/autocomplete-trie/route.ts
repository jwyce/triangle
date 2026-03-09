import { words as allWords } from './wordlist'

type TrieNode = {
  children: Map<string, TrieNode>
  word?: string
  originalWord?: string
  frecency?: { count: number; lastAccessed: number }
}

const trieRoot: TrieNode = {
  children: new Map(),
}

for (const word of allWords) {
  let curr = trieRoot
  const lowerWord = word.toLowerCase()

  for (const char of lowerWord) {
    if (!curr.children.has(char)) {
      curr.children.set(char, {
        children: new Map(),
      })
    }
    curr = curr.children.get(char)!
  }
  curr.word = lowerWord
  curr.originalWord = word
}

function getFrecencyScore(node: TrieNode): number {
  if (!node.frecency) return 0
  const { count, lastAccessed } = node.frecency
  const now = Date.now()
  const daysSince = (now - lastAccessed) / (1000 * 60 * 60 * 24)

  let multiplier: number
  if (daysSince <= 4) multiplier = 1.0
  else if (daysSince <= 14) multiplier = 0.7
  else if (daysSince <= 31) multiplier = 0.4
  else multiplier = 0.1

  return count * multiplier
}

function findNode(prefix: string): TrieNode | null {
  let curr = trieRoot
  for (const char of prefix.toLowerCase()) {
    if (!curr.children.has(char)) return null
    curr = curr.children.get(char)!
  }
  return curr
}

type Completion = { word: string; originalWord: string; score: number; node: TrieNode }

function getCompletions(prefix: string, limit: number): Completion[] {
  const node = findNode(prefix)
  if (!node) return []

  const results: Completion[] = []

  function collect(node: TrieNode) {
    if (results.length >= limit * 2) return
    if (node.word) {
      results.push({
        word: node.word,
        originalWord: node.originalWord || node.word,
        score: getFrecencyScore(node),
        node,
      })
    }
    for (const child of node.children.values()) {
      collect(child)
    }
  }

  collect(node)

  results.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
  return results.slice(0, limit)
}

function updateFrecency(word: string): boolean {
  const node = findNode(word.toLowerCase())
  if (!node || node.word !== word.toLowerCase()) return false
  if (!node.frecency) node.frecency = { count: 0, lastAccessed: 0 }
  node.frecency.count += 1
  node.frecency.lastAccessed = Date.now()
  return true
}

type SearchRequest = { query: string; limit: number }
type SelectRequest = { word: string }

export async function GET() {
  let nodeCount = 0,
    wordCount = 0
  function count(node: TrieNode) {
    nodeCount++
    if (node.word) wordCount++
    for (const child of node.children.values()) count(child)
  }
  count(trieRoot)

  return Response.json({
    status: 'ok',
    wordsLoaded: allWords.length,
    trieNodes: nodeCount,
    wordsInTrie: wordCount,
  })
}

export async function POST(request: Request) {
  const { query, limit = 50 } = (await request.json()) as SearchRequest
  if (!query || query.length < 1) {
    return Response.json({ completions: [] })
  }

  const completions = getCompletions(query, limit)
  return Response.json({
    completions: completions.map((c) => c.originalWord),
  })
}

export async function PATCH(request: Request) {
  const { word } = (await request.json()) as SelectRequest
  if (!word) {
    return Response.json({ error: 'word required' }, { status: 400 })
  }

  const updated = updateFrecency(word.toLowerCase())
  if (!updated) {
    return Response.json({ error: 'word not found' }, { status: 404 })
  }

  const node = findNode(word.toLowerCase())!
  return Response.json({
    word,
    frecency: node.frecency,
    score: getFrecencyScore(node),
  })
}
