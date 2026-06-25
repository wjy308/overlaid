import { Redis } from '@upstash/redis'
import { getSession } from '../_auth.js'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 메서드' })
  }

  const session = await getSession(req)
  if (!session?.isAdmin) {
    return res.status(401).json({ error: '인증 필요' })
  }

  const raids = req.body
  if (!Array.isArray(raids)) {
    return res.status(400).json({ error: '잘못된 데이터 형식' })
  }

  await redis.set('overlaid:raids', raids)
  res.status(200).json({ ok: true })
}
