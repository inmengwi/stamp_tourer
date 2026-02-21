export const DEMO_USER = '99999999-9999-9999-9999-999999999999';

export const TOURS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: '수도권 철도 스탬프 투어',
    description: '서울/경기 주요 역사와 철도 명소를 돌며 스탬프를 모으는 도시형 투어',
    category: 'railway',
    regionCode: '서울',
    difficulty: 'mid',
    duration: 'day',
    budget: 'low',
    period: 'always',
    status: 'active',
    reviewScore: 4.6,
    participants: 1240,
    reward: '기념 승차권 + 한정 배지',
    estimatedHours: 6,
    estimatedCost: '₩18,000',
    spots: [
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: '서울역', address: '서울 중구 한강대로 405', openHours: '05:00-24:00' },
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', name: '용산역', address: '서울 용산구 한강대로23길 55', openHours: '05:30-23:30' },
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', name: '수원역', address: '경기 수원시 팔달구 덕영대로 924', openHours: '05:00-24:00' },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: '부산 바다 관광 스탬프',
    description: '해변·등대·전망대 중심의 부산 대표 관광지 스탬프 투어',
    category: 'sightseeing',
    regionCode: '부산',
    difficulty: 'beginner',
    duration: 'weekend',
    budget: 'mid',
    period: 'active',
    status: 'active',
    reviewScore: 4.8,
    participants: 980,
    reward: '완주 인증서 + 로컬 카페 쿠폰',
    estimatedHours: 10,
    estimatedCost: '₩42,000',
    spots: [
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: '광안리 해변', address: '부산 수영구 광안해변로', openHours: '상시 개방' },
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba', name: '오륙도 스카이워크', address: '부산 남구 오륙도로 137', openHours: '09:00-18:00' },
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc', name: '청사포 다릿돌전망대', address: '부산 해운대구 중동 산3-9', openHours: '09:00-18:00' },
    ],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: '제주 감성 카페 스탬프 챌린지',
    description: '제주 동서남북 대표 카페를 방문하는 테마형 시즌 투어',
    category: 'theme',
    regionCode: '제주',
    difficulty: 'mid',
    duration: 'long',
    budget: 'high',
    period: 'upcoming',
    status: 'upcoming',
    reviewScore: 4.3,
    participants: 530,
    reward: '시즌 한정 굿즈',
    estimatedHours: 16,
    estimatedCost: '₩95,000',
    spots: [
      { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: '애월 오션뷰 카페', address: '제주 제주시 애월읍', openHours: '10:00-20:00' },
      { id: 'cccccccc-cccc-cccc-cccc-ccccccccccca', name: '성산 일출 카페', address: '제주 서귀포시 성산읍', openHours: '09:00-19:00' },
      { id: 'cccccccc-cccc-cccc-cccc-cccccccccccb', name: '서귀포 가든 카페', address: '제주 서귀포시 강정동', openHours: '11:00-21:00' },
    ],
  },
];

export const CATEGORY_OPTIONS = [
  { value: '', label: '전체 테마' },
  { value: 'railway', label: '철도' },
  { value: 'sightseeing', label: '관광' },
  { value: 'festival', label: '축제' },
  { value: 'local', label: '지역' },
  { value: 'theme', label: '테마' },
];

export const REGION_OPTIONS = [
  { value: '', label: '전체 지역' },
  { value: '서울', label: '서울' },
  { value: '부산', label: '부산' },
  { value: '제주', label: '제주' },
];

export const PERIOD_OPTIONS = [
  { value: '', label: '전체 기간' },
  { value: 'active', label: '진행 중' },
  { value: 'always', label: '상시' },
  { value: 'upcoming', label: '예정' },
];

export const SORT_OPTIONS = [
  { value: 'popular', label: '인기순' },
  { value: 'latest', label: '최신순' },
  { value: 'review', label: '리뷰순' },
];

export const VERIFICATION_OPTIONS = [
  { value: 'qr', label: 'QR 코드 스캔' },
  { value: 'gps', label: 'GPS 체크인' },
  { value: 'photo', label: '사진 업로드' },
  { value: 'manual', label: '수동 입력' },
];
