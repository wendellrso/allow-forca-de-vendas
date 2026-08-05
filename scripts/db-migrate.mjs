// Aplica as migrations de supabase/migrations em ordem, uma única vez cada,
// registrando o que já foi aplicado. Migrations avançam apenas para frente.
// Uso: DATABASE_URL=postgres://... node scripts/db-migrate.mjs
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const pastaMigrations = path.join(raiz, 'supabase', 'migrations')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Defina DATABASE_URL para aplicar as migrations.')
  process.exit(1)
}

const cliente = new pg.Client({ connectionString: url })
await cliente.connect()

try {
  await cliente.query(`
    create table if not exists public.allow_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const arquivos = (await readdir(pastaMigrations)).filter((nome) => nome.endsWith('.sql')).sort()

  for (const arquivo of arquivos) {
    const { rowCount } = await cliente.query(
      'select 1 from public.allow_migrations where name = $1',
      [arquivo],
    )
    if (rowCount > 0) {
      console.log(`— ${arquivo} já aplicada`)
      continue
    }

    const sql = await readFile(path.join(pastaMigrations, arquivo), 'utf8')
    await cliente.query('begin')
    try {
      await cliente.query(sql)
      await cliente.query('insert into public.allow_migrations (name) values ($1)', [arquivo])
      await cliente.query('commit')
      console.log(`✓ ${arquivo} aplicada`)
    } catch (erro) {
      await cliente.query('rollback')
      console.error(`✗ ${arquivo} falhou:`, erro.message)
      process.exit(1)
    }
  }

  console.log('Migrations em dia.')
} finally {
  await cliente.end()
}
