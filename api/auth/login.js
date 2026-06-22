import { createSessionCookie } from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 메서드' })
  }

  const { password } = req.body ?? {}
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 틀렸습니다' })
  }

  const cookie = await createSessionCookie()
  res.setHeader('Set-Cookie', cookie)
  res.status(200).json({ ok: true })
}
