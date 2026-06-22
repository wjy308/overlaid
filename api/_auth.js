import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'overlaid_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7일

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

export async function createSessionCookie() {
  const token = await new SignJWT({ isAdmin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret())

  const isProd = process.env.NODE_ENV === 'production'
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${isProd ? '; Secure' : ''}`
}

export async function getSession(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  if (!match) return null
  try {
    const { payload } = await jwtVerify(match[1], getSecret())
    return payload
  } catch {
    return null
  }
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}
