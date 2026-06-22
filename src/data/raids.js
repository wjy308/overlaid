// 로스트아크 레이드 목데이터
// hpPhases / timePhases 는 추후 DB 연결 시 채워질 예정
//
// hpPhases:  { at: number (줄 수), label: string, steps: string[] }
// timePhases: { at: number (초), repeat: number|null (반복 주기, 초), label: string, steps: string[] }
//   steps: 해당 기믹의 순서별 행동 가이드 (오버레이에서 NEXT 페이즈일 때 표시)

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
      {
        id: 'g1',
        name: '1관문',
        hpPhases: [
          {
            at: 160, label: '꽃 기믹',
            steps: [
              '꽃 3개 위치 확인 후 지정 자리 이동',
              '본인 꽃이 피면 즉시 밟기',
              '꽃 처리 후 중앙 집합',
            ],
          },
          {
            at: 120, label: '2페이즈 전환',
            steps: [
              '전환 컷씬 후 남쪽 집합',
              '보스 정면 피하기',
            ],
          },
          {
            at: 80, label: '즉사 기믹',
            steps: [
              '색깔별 자리 이동',
              '연결된 파트너 확인',
              '파트너 방향으로 달리기',
              '겹치면 즉사 — 타이밍 맞춰 분리',
            ],
          },
        ],
        timePhases: [
          {
            at: 480, repeat: null, label: '쫄 소환',
            steps: ['쫄 우선 처치 후 보스 복귀'],
          },
          {
            at: 300, repeat: 120, label: '독장판 패턴',
            steps: ['독 없는 구역으로 이동', '120초마다 반복'],
          },
        ],
      },
      {
        id: 'g2',
        name: '2관문',
        hpPhases: [
          {
            at: 200, label: '1페이즈 기믹',
            steps: [
              '곱3 자리로 이동',
              '몹이 나를 공격하지 않는다면 핑 찍기',
              '위치에 모여서 저가',
              '공격 피하면서 무력하기',
            ],
          },
          {
            at: 160, label: '2페이즈 전환',
            steps: ['남쪽 정렬 후 스킬 준비'],
          },
          {
            at: 100, label: '즉사 패턴',
            steps: [
              '개인 회피 후 뭉치기',
              '넉백 대비 위치 잡기',
              '쉴드 게이지 확인 후 무력',
            ],
          },
          {
            at: 60, label: '광폭화 직전',
            steps: ['딜 폭발 준비', '버프 모두 사용'],
          },
        ],
        timePhases: [
          {
            at: 540, repeat: null, label: '영역 기믹',
            steps: ['안전 구역 확인 후 이동', '영역 밖 즉사 주의'],
          },
          {
            at: 240, repeat: 60, label: '반복 패턴',
            steps: ['60초마다 반복', '보스 뒤로 이동'],
          },
        ],
      },
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
