import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:Tencent2025@localhost:5432/genie?schema=public'

export const pool = new Pool({ connectionString, max: 10 })

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows as T[]
}

export async function one<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const res = await pool.query(text, params)
  return (res.rows[0] as T) ?? null
}

export async function initSchema(): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'src/db/schema-manxin.sql'), 'utf8')
  await pool.query(sql)
}
