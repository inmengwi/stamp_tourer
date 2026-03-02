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
  { value: '전국', label: '전국' },
  { value: '서울', label: '서울' },
  { value: '부산', label: '부산' },
  { value: '대구', label: '대구' },
  { value: '인천', label: '인천' },
  { value: '광주', label: '광주' },
  { value: '대전', label: '대전' },
  { value: '울산', label: '울산' },
  { value: '세종', label: '세종' },
  { value: '경기', label: '경기' },
  { value: '강원', label: '강원' },
  { value: '충북', label: '충북' },
  { value: '충남', label: '충남' },
  { value: '전북', label: '전북' },
  { value: '전남', label: '전남' },
  { value: '경북', label: '경북' },
  { value: '경남', label: '경남' },
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

export const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: '초급' },
  { value: 'mid', label: '중급' },
  { value: 'expert', label: '고급' },
];

export const DURATION_OPTIONS = [
  { value: 'day', label: '당일' },
  { value: 'weekend', label: '1박 2일' },
  { value: 'long', label: '2박 이상' },
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
    if (pathIndex === 7) generatedStamps[1] = { ...generatedStamps[1], ...SHARED_HERITAGE_SPOTS[1] };

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
