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
    organizer: '한국철도공사',
    targetAudience: '누구나',
    verificationMethods: ['qr', 'manual'],
    milestones: [
      { stampCount: 1, reward: '참여 인증 스티커' },
      { stampCount: 2, reward: '철도 마그넷' },
      { stampCount: 3, reward: '기념 승차권 + 한정 배지' },
    ],
    notices: [
      '스탬프 비치대는 역사 내 안내센터 또는 대합실에 위치합니다.',
      '역사 운영시간 외에는 스탬프 수집이 불가합니다.',
      '기념품은 한정 수량으로 소진 시 변경될 수 있습니다.',
    ],
    contactInfo: {
      phone: '1544-7788',
      email: 'stamp@korail.com',
      website: 'https://www.letskorail.com',
    },
    tags: ['철도', '서울', '당일치기', '교통편리'],
    thumbnailEmoji: '🚂',
    spots: [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: '서울역',
        address: '서울 중구 한강대로 405',
        openHours: '05:00-24:00',
        description: '대한민국 철도의 출발점, 근대 건축물과 현대 역사가 공존하는 공간',
        verificationTypes: ['qr', 'manual'],
      },
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
        name: '용산역',
        address: '서울 용산구 한강대로23길 55',
        openHours: '05:30-23:30',
        description: '용산 국제업무지구와 연결된 교통 허브, KTX·ITX 정차역',
        verificationTypes: ['qr', 'manual'],
      },
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
        name: '수원역',
        address: '경기 수원시 팔달구 덕영대로 924',
        openHours: '05:00-24:00',
        description: '수원화성 인근의 경기 남부 대표 역사, 수원 관광의 시작점',
        verificationTypes: ['qr', 'manual'],
      },
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
    organizer: '부산관광공사',
    targetAudience: '누구나',
    verificationMethods: ['gps', 'photo', 'manual'],
    milestones: [
      { stampCount: 1, reward: '부산 관광 엽서 세트' },
      { stampCount: 2, reward: '로컬 카페 음료 쿠폰' },
      { stampCount: 3, reward: '완주 인증서 + 로컬 카페 쿠폰' },
    ],
    notices: [
      '야외 스팟은 기상 상황에 따라 운영시간이 변동될 수 있습니다.',
      '오륙도 스카이워크는 바람이 강한 날 임시 폐쇄될 수 있습니다.',
      'GPS 인증은 스팟 반경 200m 이내에서 가능합니다.',
    ],
    contactInfo: {
      phone: '051-780-0000',
      email: 'tour@bto.or.kr',
      website: 'https://www.visitbusan.net',
    },
    tags: ['바다', '부산', '주말여행', '포토스팟'],
    thumbnailEmoji: '🌊',
    spots: [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: '광안리 해변',
        address: '부산 수영구 광안해변로',
        openHours: '상시 개방',
        description: '광안대교 야경이 아름다운 부산 대표 해변, 다양한 축제의 무대',
        verificationTypes: ['gps', 'photo'],
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
        name: '오륙도 스카이워크',
        address: '부산 남구 오륙도로 137',
        openHours: '09:00-18:00',
        description: '절벽 위 유리 전망대에서 오륙도와 태평양을 조망하는 명소',
        verificationTypes: ['gps', 'photo', 'manual'],
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
        name: '청사포 다릿돌전망대',
        address: '부산 해운대구 중동 산3-9',
        openHours: '09:00-18:00',
        description: '해운대 동쪽 끝 청사포 마을의 바다 위 전망대',
        verificationTypes: ['gps', 'photo'],
      },
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
    organizer: '제주관광공사',
    targetAudience: '누구나 (카페 메뉴 별도 구매 필요)',
    verificationMethods: ['photo', 'manual'],
    milestones: [
      { stampCount: 1, reward: '제주 감귤 키링' },
      { stampCount: 2, reward: '참여 카페 음료 할인 쿠폰' },
      { stampCount: 3, reward: '시즌 한정 굿즈 (에코백 + 스티커팩)' },
    ],
    notices: [
      '각 카페의 영업시간과 휴무일을 사전에 확인해주세요.',
      '음료 1잔 이상 주문 후 스탬프 인증이 가능합니다.',
      '시즌 투어 기간은 2026년 4월 1일 ~ 6월 30일입니다.',
      '기념품은 선착순 500명에게 제공됩니다.',
    ],
    contactInfo: {
      phone: '064-740-6000',
      email: 'cafe-tour@ijto.or.kr',
      website: 'https://www.visitjeju.net',
    },
    tags: ['카페', '제주', '감성여행', '시즌한정'],
    thumbnailEmoji: '☕',
    spots: [
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: '애월 오션뷰 카페',
        address: '제주 제주시 애월읍',
        openHours: '10:00-20:00',
        description: '애월 해안도로를 따라 위치한 오션뷰 카페, 제주 서쪽 대표 명소',
        verificationTypes: ['photo', 'manual'],
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-ccccccccccca',
        name: '성산 일출 카페',
        address: '제주 서귀포시 성산읍',
        openHours: '09:00-19:00',
        description: '성산일출봉을 바라보며 커피를 즐길 수 있는 동쪽 인기 카페',
        verificationTypes: ['photo', 'manual'],
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccb',
        name: '서귀포 가든 카페',
        address: '제주 서귀포시 강정동',
        openHours: '11:00-21:00',
        description: '열대 정원 속에 자리한 남쪽 힐링 카페, 넓은 야외 좌석 보유',
        verificationTypes: ['photo', 'manual'],
      },
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

const NATIONAL_HERITAGE_PATHS = [
  { name: '궁궐길', count: 8, region: '서울' },
  { name: '왕릉길', count: 8, region: '수도권' },
  { name: '산사길', count: 7, region: '충청/경상' },
  { name: '백제문화길', count: 8, region: '충청' },
  { name: '신라천년길', count: 8, region: '경주권' },
  { name: '가야문화길', count: 7, region: '경남' },
  { name: '서원길', count: 7, region: '영남/호남' },
  { name: '성곽길', count: 8, region: '전국' },
  { name: '근대유산길', count: 8, region: '전국' },
  { name: '제주자연유산길', count: 7, region: '제주' },
];

const SHARED_HERITAGE_SPOTS = [
  {
    name: '경복궁',
    address: '서울 종로구 사직로 161',
    openHours: '09:00-18:00',
    description: '조선 왕조의 법궁, 근정전과 경회루가 대표 명소',
    verificationTypes: ['gps', 'manual'],
  },
  {
    name: '수원화성',
    address: '경기 수원시 팔달구 정조로 910',
    openHours: '09:00-18:00',
    description: '정조의 효심이 담긴 유네스코 세계유산 성곽',
    verificationTypes: ['gps', 'manual'],
  },
  {
    name: '해인사',
    address: '경남 합천군 가야면 해인사길 122',
    openHours: '08:30-18:00',
    description: '팔만대장경을 보관한 유네스코 세계유산 사찰',
    verificationTypes: ['gps', 'manual'],
  },
  {
    name: '불국사',
    address: '경북 경주시 불국로 385',
    openHours: '09:00-18:00',
    description: '통일신라 불교 예술의 정수, 석가탑과 다보탑',
    verificationTypes: ['gps', 'manual'],
  },
];

const createNationalHeritageSubTours = () => {
  let stampNo = 1;

  return NATIONAL_HERITAGE_PATHS.map((path, pathIndex) => {
    const generatedStamps = Array.from({ length: path.count }, (_, index) => ({
      name: `${path.name} 스탬프 ${index + 1}`,
      address: `${path.region} 국가유산 거점 ${index + 1}`,
      openHours: '09:00-18:00',
      description: `${path.name} 대표 국가유산 방문 스탬프`,
      verificationTypes: ['gps', 'manual'],
      stampRef: `NH-${String(stampNo++).padStart(3, '0')}`,
    }));

    if (pathIndex === 0) generatedStamps[0] = { ...generatedStamps[0], ...SHARED_HERITAGE_SPOTS[0] };
    if (pathIndex === 1) generatedStamps[0] = { ...generatedStamps[0], ...SHARED_HERITAGE_SPOTS[1] };
    if (pathIndex === 2) generatedStamps[0] = { ...generatedStamps[0], ...SHARED_HERITAGE_SPOTS[2] };
    if (pathIndex === 3) generatedStamps[0] = { ...generatedStamps[0], ...SHARED_HERITAGE_SPOTS[3] };
    if (pathIndex === 7) generatedStamps[1] = { ...generatedStamps[1], ...SHARED_HERITAGE_SPOTS[1] }; // 중복 거점 예시

    return {
      id: `heritage-path-${pathIndex + 1}`,
      title: `${path.name} (${path.region})`,
      stamps: generatedStamps,
    };
  });
};

/** 온라인 조회 시뮬레이션용 데이터베이스.
 *  실제 서비스에서는 백엔드 API가 웹에서 투어 정보를 검색/스크래핑하여 반환합니다. */
export const ONLINE_TOUR_DB = [
  {
    keywords: ['국가유산', '방문자 여권', '문화유산', '고궁'],
    tour: {
      title: '국가유산 방문자 여권 투어',
      description: '10개의 길, 76개의 국가유산을 방문하며 한국의 아름다움을 발견하는 전국 규모 스탬프 투어. 실물 여권에 도장을 모으거나 앱으로 GPS 인증이 가능합니다.',
      category: 'sightseeing',
      regionCode: '서울',
      difficulty: 'expert',
      duration: 'long',
      budget: 'mid',
      period: 'always',
      status: 'active',
      reward: '완주 크리스탈 상패',
      estimatedHours: 120,
      estimatedCost: '₩500,000+',
      organizer: '국가유산청 · 국가유산진흥원',
      targetAudience: '누구나 (내국인·외국인)',
      verificationMethods: ['gps', 'manual'],
      milestones: [
        { stampCount: 5, reward: '여권 케이스' },
        { stampCount: 10, reward: '텀블러' },
        { stampCount: 20, reward: '레디백' },
        { stampCount: 76, reward: '완주 크리스탈 상패' },
      ],
      notices: [
        '셀프 체험존에 비치된 도장만 공식 인정됩니다.',
        '중복 거점(예: 마곡사)은 해당하는 모든 코스 페이지에 도장을 찍어야 합니다.',
        '앱 인증은 국가유산 반경 200m 이내에서 가능합니다.',
        '기념품은 한정 수량으로 선착순 지급됩니다.',
      ],
      contactInfo: {
        phone: '1522-2295',
        email: 'visitkoreanheritage1@kh.or.kr',
        website: 'https://www.kh.or.kr',
      },
      tags: ['국가유산', '전국투어', '상시', '여권'],
      thumbnailEmoji: '🏛️',
      subTours: createNationalHeritageSubTours(),
    },
  },
  {
    keywords: ['경복궁', '궁궐', '서울 궁', '4대궁'],
    tour: {
      title: '서울 고궁 나들이 스탬프 투어',
      description: '서울 도심 속 조선 5대 궁궐을 걸으며 역사와 자연을 느끼는 당일 투어. 궁궐 해설 프로그램과 함께하면 더욱 알찬 여행이 됩니다.',
      category: 'sightseeing',
      regionCode: '서울',
      difficulty: 'beginner',
      duration: 'day',
      budget: 'low',
      period: 'always',
      status: 'active',
      reward: '고궁 일러스트 엽서 세트',
      estimatedHours: 8,
      estimatedCost: '₩15,000',
      organizer: '한국문화재재단',
      targetAudience: '누구나',
      verificationMethods: ['qr', 'photo', 'manual'],
      milestones: [
        { stampCount: 2, reward: '궁궐 북마크' },
        { stampCount: 3, reward: '궁궐 마그넷 세트' },
        { stampCount: 5, reward: '고궁 일러스트 엽서 세트' },
      ],
      notices: [
        '각 궁궐 입장료가 별도로 필요합니다 (통합 관람권 ₩10,000 추천).',
        '월요일 또는 화요일은 궁궐별 휴궁일이므로 사전 확인이 필요합니다.',
        '궁궐 내 음식물 반입이 제한됩니다.',
      ],
      contactInfo: {
        phone: '02-3210-3501',
        email: 'palace@chf.or.kr',
        website: 'https://www.chf.or.kr',
      },
      tags: ['궁궐', '서울', '당일치기', '역사'],
      thumbnailEmoji: '🏯',
      spots: [
        { name: '경복궁', address: '서울 종로구 사직로 161', openHours: '09:00-18:00', description: '조선 왕조 제1의 법궁, 광화문과 근정전', verificationTypes: ['qr', 'photo', 'manual'] },
        { name: '창덕궁', address: '서울 종로구 율곡로 99', openHours: '09:00-18:00', description: '유네스코 세계유산, 비원(후원)의 아름다움', verificationTypes: ['qr', 'photo', 'manual'] },
        { name: '창경궁', address: '서울 종로구 창경궁로 185', openHours: '09:00-18:00', description: '봄 벚꽃과 가을 단풍이 유명한 궁궐', verificationTypes: ['qr', 'photo', 'manual'] },
        { name: '덕수궁', address: '서울 중구 세종대로 99', openHours: '09:00-21:00', description: '서양식 석조전이 있는 도심 속 궁궐, 야간 개방', verificationTypes: ['qr', 'photo', 'manual'] },
        { name: '경희궁', address: '서울 종로구 새문안로 55', openHours: '09:00-18:00', description: '조선 후기 이궁, 서울역사박물관과 인접', verificationTypes: ['qr', 'photo', 'manual'] },
      ],
    },
  },
  {
    keywords: ['전통시장', '시장', '먹거리', '맛집'],
    tour: {
      title: '전국 전통시장 맛집 스탬프 투어',
      description: '전국 유명 전통시장의 대표 먹거리를 맛보며 스탬프를 모으는 미식 투어. 각 시장 고유의 특색 있는 음식을 경험할 수 있습니다.',
      category: 'local',
      regionCode: '서울',
      difficulty: 'mid',
      duration: 'long',
      budget: 'mid',
      period: 'always',
      status: 'active',
      reward: '전통시장 상품권 5만원',
      estimatedHours: 40,
      estimatedCost: '₩200,000',
      organizer: '소상공인시장진흥공단',
      targetAudience: '누구나',
      verificationMethods: ['photo', 'manual'],
      milestones: [
        { stampCount: 2, reward: '전통시장 에코백' },
        { stampCount: 4, reward: '전통시장 상품권 1만원' },
        { stampCount: 6, reward: '전통시장 상품권 5만원' },
      ],
      notices: [
        '각 시장의 휴무일(주로 일요일)을 확인해주세요.',
        '사진 인증 시 해당 시장 간판이 포함되어야 합니다.',
        '시장 내 개별 점포 영업시간이 상이할 수 있습니다.',
      ],
      contactInfo: {
        phone: '042-363-7800',
        email: 'market@semas.or.kr',
        website: 'https://www.semas.or.kr',
      },
      tags: ['전통시장', '맛집', '전국', '미식'],
      thumbnailEmoji: '🍜',
      spots: [
        { name: '광장시장', address: '서울 종로구 창경궁로 88', openHours: '09:00-23:00', description: '빈대떡·마약김밥·육회 등 서울 대표 먹거리 시장', verificationTypes: ['photo', 'manual'] },
        { name: '통인시장', address: '서울 종로구 자하문로15길 18', openHours: '10:00-18:00', description: '엽전 도시락으로 유명한 경복궁 인근 시장', verificationTypes: ['photo', 'manual'] },
        { name: '자갈치시장', address: '부산 중구 자갈치해안로 52', openHours: '05:00-22:00', description: '부산 대표 수산시장, 신선한 회와 해산물', verificationTypes: ['photo', 'manual'] },
        { name: '서귀포 매일올레시장', address: '제주 서귀포시 중앙로62번길 18', openHours: '07:00-21:00', description: '제주 특산물과 흑돼지를 맛볼 수 있는 올레시장', verificationTypes: ['photo', 'manual'] },
        { name: '대구 서문시장', address: '대구 중구 큰장로26길 45', openHours: '09:00-20:00', description: '야시장이 유명한 대구 3대 시장, 납작만두 필수', verificationTypes: ['photo', 'manual'] },
        { name: '춘천 낭만시장', address: '강원 춘천시 금강로 12', openHours: '09:00-21:00', description: '닭갈비·막국수의 본고장, 낭만이 가득한 시장', verificationTypes: ['photo', 'manual'] },
      ],
    },
  },
];
