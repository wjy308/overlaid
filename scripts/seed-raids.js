#!/usr/bin/env node
// 로컬 raids.js 데이터를 Upstash Redis에 시딩하는 스크립트
// 실행 방법: node scripts/seed-raids.js

import { createRequire } from 'module'
import { Redis } from '@upstash/redis'

// .env.local 로드 (Vite 컨벤션)
const require = createRequire(import.meta.url)
const { config } = require('dotenv')
config({ path: '.env.local' })

const { RAIDS } = await import('../src/data/raids.js')

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('❌ .env.local 에 UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN 을 설정해주세요.')
  process.exit(1)
}

console.log(`시딩 시작: ${RAIDS.length}개 레이드`)
await redis.set('overlaid:raids', RAIDS)
console.log(`✓ 완료: overlaid:raids 키에 저장됨`)
