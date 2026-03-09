import { words } from '@/app/api/autocomplete/wordlist'
// let's try tries :)

// plan: on page load we can build the trie and keep around the DS in memory on the BE
// then subsequent searches we can use it to search the node and get completions

type TrieNode = {
  children: Map<string, TrieNode>
  word?: string
}

const trieRoot: TrieNode = {
  children: new Map<string, TrieNode>(),
  word: undefined,
}

export async function GET() {
  let curr = trieRoot

  for (const word of words) {
    for (const char of word) {
      if (!curr.children.get(char)) {
        curr.children.set(char, {
          children: new Map<string, TrieNode>(),
          word: undefined,
        })
      }

      // pretty sure we always have something?
      curr = curr.children.get(char)!
    }
  }

  return Response.json({ status: 'pong' })
}

type Search = {
  query: string
  limit: number
}

export async function POST(request: Request) {
  const { query, limit } = (await request.json()) as Search

  const completions = words
    .filter((w) => w.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, limit)
  return Response.json({ completions })
}
