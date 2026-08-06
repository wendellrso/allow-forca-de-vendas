import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Sem cache incremental: as páginas do painel e do catálogo são dinâmicas
// por decisão — dado de venda e estoque não pode sair de cache.
export default defineCloudflareConfig()
