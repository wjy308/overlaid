// 로스트아크 레이드 목데이터
// hpPhases / timePhases 는 추후 DB 연결 시 채워질 예정
//
// hpPhases:  { at: number (줄 수), label: string }
// timePhases: { at: number (초), repeat: number|null (반복 주기, 초), label: string }
//   예) at: 540 → 남은시간 9:00 기준, repeat: 60 → 이후 60초마다 반복

export const RAIDS = [
  {
    id: 'mordum',
    name: '모르트',
    tier: 4,
    gates: [
      { id: 'g1', name: '1관문', hpPhases: [], timePhases: [] },
      { id: 'g2', name: '2관문', hpPhases: [], timePhases: [] },
      { id: 'g3', name: '3관문', hpPhases: [], timePhases: [] },
    ],
  },
  {
    id: 'aegir',
    name: '에기르',
    tier: 4,
    gates: [
      { id: 'g1', name: '1관문', hpPhases: [], timePhases: [] },
      { id: 'g2', name: '2관문', hpPhases: [], timePhases: [] },
    ],
  },
  {
    id: 'behemoth',
    name: '베히모스',
    tier: 4,
    gates: [
      { id: 'g1', name: '1관문', hpPhases: [], timePhases: [] },
      { id: 'g2', name: '2관문', hpPhases: [], timePhases: [] },
    ],
  },
  {
    id: 'echidna',
    name: '에키드나',
    tier: 4,
    gates: [
      { id: 'g1', name: '1관문', hpPhases: [], timePhases: [] },
      { id: 'g2', name: '2관문', hpPhases: [], timePhases: [] },
    ],
  },
  {
    id: 'kamen',
    name: '카멘',
    tier: 4,
    gates: [
      { id: 'g1', name: '1관문', hpPhases: [], timePhases: [] },
      { id: 'g2', name: '2관문', hpPhases: [], timePhases: [] },
      { id: 'g3', name: '3관문', hpPhases: [], timePhases: [] },
      { id: 'g4', name: '4관문', hpPhases: [], timePhases: [] },
    ],
  },
  {
    id: 'illiakan',
    name: '일리아칸',
    tier: 4,
    gates: [
      { id: 'g1', name: '1관문', hpPhases: [], timePhases: [] },
      { id: 'g2', name: '2관문', hpPhases: [], timePhases: [] },
      { id: 'g3', name: '3관문', hpPhases: [], timePhases: [] },
    ],
  },
  {
    id: 'abrelshud',
    name: '아브렐슈드',
    tier: 3,
    gates: [
      { id: 'g1', name: '1관문', hpPhases: [], timePhases: [] },
      { id: 'g2', name: '2관문', hpPhases: [], timePhases: [] },
      { id: 'g3', name: '3관문', hpPhases: [], timePhases: [] },
      { id: 'g4', name: '4관문', hpPhases: [], timePhases: [] },
    ],
  },
  {
    id: 'valtan',
    name: '발탄',
    tier: 3,
    gates: [
      { id: 'g1', name: '1관문', hpPhases: [], timePhases: [] },
      { id: 'g2', name: '2관문', hpPhases: [], timePhases: [] },
    ],
  },
]
