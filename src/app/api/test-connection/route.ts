import { NextRequest, NextResponse } from 'next/server'
import { createConnector } from '../../../connectors'
import type { DbConnector } from '@/connectors/base'

export async function POST(req: NextRequest) {
  let connector: DbConnector | undefined
  try {
    const { type, config } = await req.json()
    if (!type || !config) {
      return NextResponse.json({ error: 'Veritabanı türü ve yapılandırması gerekli.' }, { status: 400 })
    }

    connector = createConnector({ type, config })
    await connector.connect()

    return NextResponse.json({ success: true, message: 'Bağlantı başarıyla doğrulandı.' })
  } catch (error: any) {
    const message = error?.message || 'Bağlantı kurulamadı.'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (connector) {
      try {
        await connector.close()
      } catch (closeError) {
        console.error('Connector close error', closeError)
      }
    }
  }
}
