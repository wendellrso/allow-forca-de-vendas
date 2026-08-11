import { processarWebhookAsaas } from '@/servidor/webhook-asaas'

export async function POST(requisicao: Request): Promise<Response> {
  return processarWebhookAsaas(requisicao)
}
