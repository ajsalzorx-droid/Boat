// Load test database: copies the site's public content (menu, page texts, SEO, daily catch,
// offers, business info) from the real database into a separate one, so pages render as on the
// live site while the game's claims, contacts and rate limits land in the copy only.
// No customer data (orders, bookings, contacts, chats, admin users, sessions) is copied.
//
//   node --env-file=.env.local loadtest/setup-db.mjs          create / refresh the copy
//   node --env-file=.env.local loadtest/setup-db.mjs --drop   delete the copy afterwards
import { MongoClient } from 'mongodb'

const SOURCE = process.env.MONGODB_DB || 'boat'
const TARGET = `${SOURCE}_loadtest`
const CONTENT = ['business_info', 'menu_items', 'site_content', 'site_publish', 'seo_pages', 'daily_catch', 'offers']

if (TARGET === SOURCE || !TARGET.endsWith('_loadtest')) throw new Error('refusing: target is not a _loadtest database')
const client = await new MongoClient(process.env.MONGODB_URI).connect()
const target = client.db(TARGET)

if (process.argv.includes('--drop')) {
  await target.dropDatabase()
  console.log(`dropped ${TARGET}`)
} else {
  const source = client.db(SOURCE)
  for (const name of CONTENT) {
    const docs = await source.collection(name).find().toArray()
    await target.collection(name).deleteMany({})
    if (docs.length) await target.collection(name).insertMany(docs)
    console.log(`${name}: ${docs.length}`)
  }
  // start each run clean
  for (const name of ['game_claims', 'game_otp', 'rate_limits', 'bot_contacts']) await target.collection(name).deleteMany({})
  console.log(`ready: ${TARGET}`)
}
await client.close()
