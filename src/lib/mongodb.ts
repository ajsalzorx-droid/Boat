import 'server-only'
import { MongoClient, type Db, type Document, type WithId } from 'mongodb'

// One MongoDB connection per server process, shared by every request. In development the
// client is kept on globalThis so hot reloads don't open a new connection each time.
// Collections and their schemas are created by scripts/mongodb-setup.mjs.
const globalForMongo = globalThis as unknown as { mongoClient?: Promise<MongoClient> }

function client() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set in .env.local')
  globalForMongo.mongoClient ??= new MongoClient(uri).connect().catch((e) => {
    globalForMongo.mongoClient = undefined // let the next request try again
    throw e
  })
  return globalForMongo.mongoClient
}

export async function getDb(): Promise<Db> {
  return (await client()).db(process.env.MONGODB_DB || 'boat')
}

// Documents keep the Supabase-era string ids as _id. Pages and admin screens use `id`, and
// dates as ISO strings (plain JSON, safe to pass to client components and to cache).
export type Plain<T> = Omit<T, '_id'> & { id: string }

export function toPlain<T extends Document>(doc: WithId<T>): Plain<T> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id') out.id = String(value)
    else out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out as Plain<T>
}

export const newId = () => crypto.randomUUID()

// A stored document with a string or numeric id and any fields (schemas are enforced by MongoDB)
export type IdDoc<Id = string> = { _id: Id; [field: string]: unknown }
