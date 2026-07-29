export type Collection = {
  id: string
  name: string
  description?: string
}

export async function fetchCollections(): Promise<Collection[]> {
  const res = await fetch('/api/v1/collections')
  if (!res.ok) throw new Error('Failed to fetch collections')
  return res.json()
}

export async function createCollection(body: { name: string; description?: string }): Promise<Collection> {
  const res = await fetch('/api/v1/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create collection')
  return res.json()
}
