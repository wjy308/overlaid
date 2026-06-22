import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않은 메서드' })
  }
  try {
    const raids = await redis.get('overlaid:raids')
    res.status(200).json(raids ?? [])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
