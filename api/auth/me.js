import { getSession } from '../_auth.js'

export default async function handler(req, res) {
  const session = await getSession(req)
  if (!session) {
    return res.status(401).json({ user: null })
  }
  res.status(200).json({
    email: session.email,
    name: session.name,
    picture: session.picture,
    isAdmin: session.isAdmin,
  })
}
