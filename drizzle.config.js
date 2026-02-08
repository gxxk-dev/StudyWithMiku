import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './workers/db/schema.js',
  out: './migrations',
  dialect: 'sqlite'
})
