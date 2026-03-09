import { words } from '@/app/api/autocomplete/wordlist'

export async function GET() {
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
