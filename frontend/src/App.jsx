import { useMemo, useState } from 'react';
import {
  CATEGORY_OPTIONS,
  DEMO_USER,
  ONLINE_TOUR_DB,
  PERIOD_OPTIONS,
  REGION_OPTIONS,
  SORT_OPTIONS,
  TOURS,
  VERIFICATION_OPTIONS,
} from './data';

const pages = [
  { key: 'discover', label: '탐색', icon: '🔍' },
  { key: 'register', label: '등록', icon: '➕' },
  { key: 'plan', label: '계획', icon: '📅' },
  { key: 'collect', label: '기록', icon: '🏅' },
];

const prettyPeriod = {
  active: '진행 중',
  always: '상시',
  upcoming: '예정',
};

const prettyDifficulty = {
  beginner: '초급',
  mid: '중급',
  expert: '고급',
};

const prettyDuration = {
  day: '당일',
  weekend: '1박 2일',
  long: '2박 이상',
};

const prettyVerification = {
  qr: 'QR 코드 스캔',
  gps: 'GPS 체크인',
  photo: '사진 업로드',
  manual: '수동 입력',
};

const prettyCategory = {
  railway: '철도',
  sightseeing: '관광',
  festival: '축제',
  local: '지역',
  theme: '테마',
};

export function App() {
  const [currentPage, setCurrentPage] = useState('discover');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [period, setPeriod] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const [wishlist, setWishlist] = useState([]);
  const [activePlans, setActivePlans] = useState([]);
  const [completedPlans, setCompletedPlans] = useState([]);
  const [planDates, setPlanDates] = useState({});
  const [selectedTourId, setSelectedTourId] = useState(TOURS[0]?.id);

  const [records, setRecords] = useState([]);
  const [recordType, setRecordType] = useState('qr');
  const [recordMemo, setRecordMemo] = useState('');
  const [selectedSpotId, setSelectedSpotId] = useState(TOURS[0]?.spots[0]?.id);

  const [userTours, setUserTours] = useState([]);
  const [registerStep, setRegisterStep] = useState('input'); // input | loading | edit
  const [searchName, setSearchName] = useState('');
  const [searchDesc, setSearchDesc] = useState('');
  const [registerForm, setRegisterForm] = useState(null);
  const [editSpots, setEditSpots] = useState([]);
  const [editMilestones, setEditMilestones] = useState([]);
  const [editNotices, setEditNotices] = useState([]);

  const allTours = [...TOURS, ...userTours];
  const allSpots = allTours.flatMap((tour) => tour.spots.map((spot) => ({ ...spot, tourId: tour.id, tourTitle: tour.title })));

  const filteredTours = useMemo(() => {
    const base = allTours.filter((tour) => {
      const target = `${tour.title} ${tour.description} ${tour.regionCode}`.toLowerCase();
      const keywordMatched = keyword.trim() === '' || target.includes(keyword.toLowerCase());
      const categoryMatched = category === '' || category === tour.category;
      const regionMatched = region === '' || region === tour.regionCode;
      const periodMatched = period === '' || period === tour.period;
      return keywordMatched && categoryMatched && regionMatched && periodMatched;
    });

    return [...base].sort((a, b) => {
      if (sortBy === 'review') return b.reviewScore - a.reviewScore;
      if (sortBy === 'latest') return b.id.localeCompare(a.id);
      return b.participants - a.participants;
    });
  }, [keyword, category, region, period, sortBy, allTours]);

  const selectedTour = allTours.find((tour) => tour.id === selectedTourId) ?? filteredTours[0] ?? allTours[0];

  const toggleWishlist = (tourId) => {
    setWishlist((prev) => (prev.includes(tourId) ? prev.filter((id) => id !== tourId) : [...prev, tourId]));
  };

  const startPlan = (tourId) => {
    setActivePlans((prev) => (prev.includes(tourId) ? prev : [...prev, tourId]));
    setCompletedPlans((prev) => prev.filter((id) => id !== tourId));
  };

  const completePlan = (tourId) => {
    setCompletedPlans((prev) => (prev.includes(tourId) ? prev : [...prev, tourId]));
    setActivePlans((prev) => prev.filter((id) => id !== tourId));
  };

  const openDetail = (tourId) => {
    setSelectedTourId(tourId);
    setCurrentPage('detail');
  };

  const emptyForm = () => ({
    title: '',
    description: '',
    category: 'sightseeing',
    regionCode: '서울',
    difficulty: 'beginner',
    duration: 'day',
    budget: 'low',
    period: 'active',
    status: 'active',
    reward: '',
    estimatedHours: 4,
    estimatedCost: '',
    organizer: '',
    targetAudience: '누구나',
    verificationMethods: ['manual'],
    contactPhone: '',
    contactEmail: '',
    contactWebsite: '',
    tags: '',
    thumbnailEmoji: '📍',
  });

  const searchOnline = () => {
    if (!searchName.trim()) {
      alert('투어 이름을 입력해주세요.');
      return;
    }
    setRegisterStep('loading');
    // 시뮬레이션: 1.5초 로딩 후 결과 표시
    setTimeout(() => {
      const query = `${searchName} ${searchDesc}`.toLowerCase();
      const match = ONLINE_TOUR_DB.find((entry) => entry.keywords.some((kw) => query.includes(kw)));
      if (match) {
        const t = match.tour;
        setRegisterForm({
          title: t.title,
          description: t.description,
          category: t.category,
          regionCode: t.regionCode,
          difficulty: t.difficulty,
          duration: t.duration,
          budget: t.budget,
          period: t.period,
          status: t.status,
          reward: t.reward,
          estimatedHours: t.estimatedHours,
          estimatedCost: t.estimatedCost,
          organizer: t.organizer,
          targetAudience: t.targetAudience,
          verificationMethods: [...t.verificationMethods],
          contactPhone: t.contactInfo.phone,
          contactEmail: t.contactInfo.email,
          contactWebsite: t.contactInfo.website,
          tags: t.tags.join(', '),
          thumbnailEmoji: t.thumbnailEmoji,
        });
        setEditSpots(t.spots.map((s) => ({ ...s, id: crypto.randomUUID() })));
        setEditMilestones([...t.milestones]);
        setEditNotices([...t.notices]);
      } else {
        setRegisterForm({ ...emptyForm(), title: searchName, description: searchDesc });
        setEditSpots([]);
        setEditMilestones([]);
        setEditNotices([]);
      }
      setRegisterStep('edit');
    }, 1500);
  };

  const updateFormField = (field, value) => {
    setRegisterForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleVerificationMethod = (method) => {
    setRegisterForm((prev) => {
      const methods = prev.verificationMethods.includes(method)
        ? prev.verificationMethods.filter((m) => m !== method)
        : [...prev.verificationMethods, method];
      return { ...prev, verificationMethods: methods.length > 0 ? methods : ['manual'] };
    });
  };

  const addSpot = () => {
    setEditSpots((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', address: '', openHours: '', description: '', verificationTypes: ['manual'] },
    ]);
  };

  const removeSpot = (index) => {
    setEditSpots((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSpot = (index, field, value) => {
    setEditSpots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addMilestone = () => {
    setEditMilestones((prev) => [...prev, { stampCount: prev.length + 1, reward: '' }]);
  };

  const removeMilestone = (index) => {
    setEditMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMilestone = (index, field, value) => {
    setEditMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const addNotice = () => {
    setEditNotices((prev) => [...prev, '']);
  };

  const removeNotice = (index) => {
    setEditNotices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateNotice = (index, value) => {
    setEditNotices((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const submitRegistration = () => {
    if (!registerForm.title.trim()) {
      alert('투어 이름을 입력해주세요.');
      return;
    }
    if (editSpots.length === 0) {
      alert('최소 1개의 스팟을 추가해주세요.');
      return;
    }
    const invalidSpot = editSpots.find((s) => !s.name.trim());
    if (invalidSpot) {
      alert('모든 스팟의 이름을 입력해주세요.');
      return;
    }

    const newTour = {
      id: crypto.randomUUID(),
      title: registerForm.title,
      description: registerForm.description,
      category: registerForm.category,
      regionCode: registerForm.regionCode,
      difficulty: registerForm.difficulty,
      duration: registerForm.duration,
      budget: registerForm.budget,
      period: registerForm.period,
      status: registerForm.status,
      reviewScore: 0,
      participants: 0,
      reward: registerForm.reward,
      estimatedHours: Number(registerForm.estimatedHours) || 0,
      estimatedCost: registerForm.estimatedCost,
      organizer: registerForm.organizer,
      targetAudience: registerForm.targetAudience,
      verificationMethods: registerForm.verificationMethods,
      milestones: editMilestones.filter((m) => m.reward.trim()),
      notices: editNotices.filter((n) => n.trim()),
      contactInfo: {
        phone: registerForm.contactPhone,
        email: registerForm.contactEmail,
        website: registerForm.contactWebsite,
      },
      tags: registerForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      thumbnailEmoji: registerForm.thumbnailEmoji || '📍',
      spots: editSpots.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        openHours: s.openHours,
        description: s.description,
        verificationTypes: s.verificationTypes || ['manual'],
      })),
    };

    setUserTours((prev) => [...prev, newTour]);
    // 초기화
    setRegisterStep('input');
    setSearchName('');
    setSearchDesc('');
    setRegisterForm(null);
    setEditSpots([]);
    setEditMilestones([]);
    setEditNotices([]);
    // 등록한 투어의 상세 페이지로 이동
    setSelectedTourId(newTour.id);
    setCurrentPage('detail');
  };

  const resetRegister = () => {
    setRegisterStep('input');
    setSearchName('');
    setSearchDesc('');
    setRegisterForm(null);
    setEditSpots([]);
    setEditMilestones([]);
    setEditNotices([]);
  };

  const saveStampRecord = () => {
    if (!selectedSpotId) {
      alert('기록할 스탬프를 선택해주세요.');
      return;
    }

    const alreadySaved = records.some((record) => record.spotId === selectedSpotId);
    if (alreadySaved) {
      alert('이미 기록한 스탬프입니다.');
      return;
    }

    setRecords((prev) => [
      {
        id: crypto.randomUUID(),
        userId: DEMO_USER,
        spotId: selectedSpotId,
        method: recordType,
        memo: recordMemo.trim(),
        acquiredAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setRecordMemo('');
  };

  const recordsWithMeta = records.map((record) => {
    const spot = allSpots.find((candidate) => candidate.id === record.spotId);
    return {
      ...record,
      spotName: spot?.name ?? '알 수 없는 스팟',
      tourTitle: spot?.tourTitle ?? '알 수 없는 투어',
    };
  });

  const completedToursCount = completedPlans.length;
  const favoriteRecords = recordsWithMeta.filter((record) => record.memo.includes('⭐'));

  const renderDiscoverPage = () => (
    <section className="card">
      <h2>스탬프 투어 탐색</h2>
      <p className="helper">키워드, 지역, 기간, 정렬 기준으로 투어를 탐색하고 바로 계획에 추가합니다.</p>

      <div className="controls grid-5">
        <input placeholder="투어/지역/테마 검색" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={region} onChange={(event) => setRegion(event.target.value)}>
          {REGION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <ul className="list">
        {filteredTours.map((tour) => (
          <li key={tour.id} className="tour-card">
            <div>
              <strong>{tour.title}</strong>
              <p>{tour.description}</p>
              <div className="meta">
                <span>{tour.regionCode}</span>
                <span>{prettyPeriod[tour.period]}</span>
                <span>스탬프 {tour.spots.length}개</span>
                <span>평점 {tour.reviewScore}</span>
              </div>
            </div>
            <div className="stack-actions">
              <button onClick={() => openDetail(tour.id)}>상세 보기</button>
              <button onClick={() => toggleWishlist(tour.id)}>{wishlist.includes(tour.id) ? '위시리스트 해제' : '위시리스트 저장'}</button>
              <button onClick={() => startPlan(tour.id)}>내 계획에 추가</button>
            </div>
          </li>
        ))}
      </ul>
      {filteredTours.length === 0 && <p>조건에 맞는 투어가 없습니다.</p>}
    </section>
  );

  const renderDetailPage = () => {
    if (!selectedTour) return null;

    const tour = selectedTour;
    const acquiredSpotIds = records.map((r) => r.spotId);
    const acquiredCount = tour.spots.filter((s) => acquiredSpotIds.includes(s.id)).length;
    const isInWishlist = wishlist.includes(tour.id);
    const isActive = activePlans.includes(tour.id);

    return (
      <section className="detail-page">
        {/* A. 헤더 영역 */}
        <div className="detail-header">
          <button className="back-btn" onClick={() => setCurrentPage('discover')}>
            ← 목록으로
          </button>
          <div className="detail-thumbnail">{tour.thumbnailEmoji}</div>
          <h2 className="detail-title">{tour.title}</h2>
          <div className="detail-tags">
            <span className="tag">{prettyCategory[tour.category]}</span>
            <span className="tag">{tour.regionCode}</span>
            <span className="tag">{prettyDifficulty[tour.difficulty]}</span>
            <span className="tag">{prettyPeriod[tour.period]}</span>
          </div>
          <div className="detail-meta-row">
            <span>평점 {tour.reviewScore}</span>
            <span>참여자 {tour.participants.toLocaleString()}명</span>
          </div>
          <p className="detail-organizer">주최: {tour.organizer}</p>
        </div>

        {/* B. 투어 요약 카드 */}
        <div className="detail-summary-grid">
          <article>
            <div className="summary-value">{tour.spots.length}개</div>
            <div className="summary-label">스탬프</div>
          </article>
          <article>
            <div className="summary-value">{tour.estimatedHours}시간</div>
            <div className="summary-label">예상 소요</div>
          </article>
          <article>
            <div className="summary-value">{tour.estimatedCost}</div>
            <div className="summary-label">예상 비용</div>
          </article>
          <article>
            <div className="summary-value">{prettyDuration[tour.duration]}</div>
            <div className="summary-label">소요 기간</div>
          </article>
        </div>

        {/* C. 투어 소개 */}
        <div className="detail-section">
          <h3>투어 소개</h3>
          <p>{tour.description}</p>
          <dl className="detail-info-list">
            <div>
              <dt>운영 기간</dt>
              <dd>{prettyPeriod[tour.period]}</dd>
            </div>
            <div>
              <dt>참여 대상</dt>
              <dd>{tour.targetAudience}</dd>
            </div>
            <div>
              <dt>난이도</dt>
              <dd>{prettyDifficulty[tour.difficulty]}</dd>
            </div>
          </dl>
        </div>

        {/* D. 스팟 목록 */}
        <div className="detail-section">
          <h3>방문 장소 ({tour.spots.length}곳)</h3>
          {isActive && (
            <div className="detail-progress">
              <progress value={acquiredCount} max={tour.spots.length} />
              <span>
                {acquiredCount}/{tour.spots.length} 완료 ({Math.round((acquiredCount / tour.spots.length) * 100)}%)
              </span>
            </div>
          )}
          <ul className="spot-list">
            {tour.spots.map((spot, index) => {
              const visited = acquiredSpotIds.includes(spot.id);
              return (
                <li key={spot.id} className={`spot-card${visited ? ' is-visited' : ''}`}>
                  <div className="spot-number">{visited ? '✓' : index + 1}</div>
                  <div className="spot-info">
                    <strong>{spot.name}</strong>
                    {spot.description && <p className="spot-desc">{spot.description}</p>}
                    <div className="spot-meta">
                      <span>{spot.address}</span>
                      <span>{spot.openHours}</span>
                    </div>
                    <div className="spot-verification">
                      {spot.verificationTypes.map((v) => (
                        <span key={v} className="verification-badge">
                          {prettyVerification[v]}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* E. 참여 방법 */}
        <div className="detail-section">
          <h3>참여 방법</h3>
          <ol className="guide-steps">
            <li>투어 상세 페이지에서 "투어 참여하기" 버튼을 눌러 참여를 시작합니다.</li>
            <li>각 스팟을 방문하여 아래 인증 방법 중 하나로 스탬프를 수집합니다.</li>
            <li>모든 스팟을 방문하면 완주 보상을 받을 수 있습니다.</li>
          </ol>
          <h4>인증 방법</h4>
          <ul className="verification-list">
            {tour.verificationMethods.map((method) => (
              <li key={method} className="verification-item">
                <strong>{prettyVerification[method]}</strong>
                {method === 'qr' && <span> - 스팟에 비치된 QR 코드를 스캔하여 인증</span>}
                {method === 'gps' && <span> - 스팟 반경 200m 이내에서 GPS로 자동 인증</span>}
                {method === 'photo' && <span> - 스팟 방문 사진을 촬영하여 업로드 인증</span>}
                {method === 'manual' && <span> - 방문 후 직접 수동으로 기록 입력</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* F. 보상 정보 */}
        <div className="detail-section">
          <h3>보상 정보</h3>
          <div className="reward-final">
            <strong>완주 보상</strong>
            <p>{tour.reward}</p>
          </div>
          <h4>단계별 마일스톤</h4>
          <ul className="milestone-list">
            {tour.milestones.map((ms) => {
              const reached = acquiredCount >= ms.stampCount;
              return (
                <li key={ms.stampCount} className={`milestone-item${reached ? ' is-reached' : ''}`}>
                  <div className="milestone-bar">
                    <div className="milestone-dot">{reached ? '✓' : ms.stampCount}</div>
                    <div className="milestone-line" />
                  </div>
                  <div className="milestone-info">
                    <strong>{ms.stampCount}개 달성</strong>
                    <span>{ms.reward}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* G. 주의사항 */}
        <div className="detail-section">
          <h3>주의사항</h3>
          <ul className="notice-list">
            {tour.notices.map((notice, i) => (
              <li key={i}>{notice}</li>
            ))}
          </ul>
        </div>

        {/* H. 문의/정보 */}
        <div className="detail-section">
          <h3>문의 및 안내</h3>
          <dl className="detail-info-list">
            <div>
              <dt>주최</dt>
              <dd>{tour.organizer}</dd>
            </div>
            <div>
              <dt>전화</dt>
              <dd>{tour.contactInfo.phone}</dd>
            </div>
            <div>
              <dt>이메일</dt>
              <dd>{tour.contactInfo.email}</dd>
            </div>
            <div>
              <dt>웹사이트</dt>
              <dd>{tour.contactInfo.website}</dd>
            </div>
          </dl>
        </div>

        {/* I. 하단 액션 바 */}
        <div className="detail-actions">
          <button className="action-wishlist" onClick={() => toggleWishlist(tour.id)}>
            {isInWishlist ? '♥ 저장됨' : '♡ 위시리스트'}
          </button>
          <button
            className="action-join"
            onClick={() => {
              startPlan(tour.id);
              setCurrentPage('plan');
            }}
          >
            {isActive ? '계획 페이지로' : '투어 참여하기'}
          </button>
        </div>
      </section>
    );
  };

  const renderRegisterPage = () => {
    if (registerStep === 'input') {
      return (
        <section className="card">
          <h2>투어 등록</h2>
          <p className="helper">스탬프 투어 이름과 설명을 입력하면 온라인에서 상세 정보를 조회합니다.</p>

          <div className="reg-input-group">
            <label className="reg-label">
              투어 이름 <span className="required">*</span>
              <input
                placeholder="예: 국가유산 방문자 여권 투어, 서울 고궁 투어"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </label>
            <label className="reg-label">
              투어 설명 / 키워드
              <textarea
                placeholder="투어에 대한 설명이나 관련 키워드를 입력하세요. 온라인 조회 정확도가 높아집니다."
                rows={3}
                value={searchDesc}
                onChange={(e) => setSearchDesc(e.target.value)}
              />
            </label>
          </div>

          <div className="reg-actions">
            <button className="btn-search" onClick={searchOnline}>온라인 조회</button>
            <button
              className="btn-manual"
              onClick={() => {
                setRegisterForm({ ...emptyForm(), title: searchName, description: searchDesc });
                setEditSpots([]);
                setEditMilestones([]);
                setEditNotices([]);
                setRegisterStep('edit');
              }}
            >
              직접 입력
            </button>
          </div>

          <div className="reg-hint">
            <h4>조회 가능 예시</h4>
            <ul>
              {ONLINE_TOUR_DB.map((entry, i) => (
                <li key={i}>
                  <button
                    className="hint-link"
                    onClick={() => {
                      setSearchName(entry.tour.title);
                      setSearchDesc(entry.tour.description.slice(0, 40));
                    }}
                  >
                    {entry.tour.thumbnailEmoji} {entry.tour.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      );
    }

    if (registerStep === 'loading') {
      return (
        <section className="card reg-loading">
          <div className="spinner" />
          <h3>온라인에서 투어 정보를 조회 중...</h3>
          <p className="helper">"{searchName}" 관련 정보를 검색하고 있습니다.</p>
        </section>
      );
    }

    // registerStep === 'edit'
    if (!registerForm) return null;

    return (
      <section className="detail-page">
        <div className="detail-header" style={{ textAlign: 'left' }}>
          <button className="back-btn" onClick={resetRegister}>← 다시 검색</button>
          <h2 className="detail-title" style={{ textAlign: 'center', marginTop: 8 }}>투어 정보 편집</h2>
          <p className="helper" style={{ textAlign: 'center' }}>
            온라인 조회 결과를 확인하고 수정한 뒤 등록하세요.
          </p>
        </div>

        {/* 기본 정보 */}
        <div className="detail-section">
          <h3>기본 정보</h3>
          <div className="reg-form-grid">
            <label className="reg-label full">
              투어 이름 <span className="required">*</span>
              <input value={registerForm.title} onChange={(e) => updateFormField('title', e.target.value)} />
            </label>
            <label className="reg-label full">
              투어 설명
              <textarea rows={3} value={registerForm.description} onChange={(e) => updateFormField('description', e.target.value)} />
            </label>
            <label className="reg-label">
              썸네일
              <input value={registerForm.thumbnailEmoji} onChange={(e) => updateFormField('thumbnailEmoji', e.target.value)} maxLength={4} />
            </label>
            <label className="reg-label">
              주최자
              <input value={registerForm.organizer} onChange={(e) => updateFormField('organizer', e.target.value)} />
            </label>
            <label className="reg-label">
              카테고리
              <select value={registerForm.category} onChange={(e) => updateFormField('category', e.target.value)}>
                {CATEGORY_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="reg-label">
              지역
              <select value={registerForm.regionCode} onChange={(e) => updateFormField('regionCode', e.target.value)}>
                {REGION_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="reg-label">
              난이도
              <select value={registerForm.difficulty} onChange={(e) => updateFormField('difficulty', e.target.value)}>
                <option value="beginner">초급</option>
                <option value="mid">중급</option>
                <option value="expert">고급</option>
              </select>
            </label>
            <label className="reg-label">
              소요 기간
              <select value={registerForm.duration} onChange={(e) => updateFormField('duration', e.target.value)}>
                <option value="day">당일</option>
                <option value="weekend">1박 2일</option>
                <option value="long">2박 이상</option>
              </select>
            </label>
            <label className="reg-label">
              예상 비용
              <input placeholder="₩10,000" value={registerForm.estimatedCost} onChange={(e) => updateFormField('estimatedCost', e.target.value)} />
            </label>
            <label className="reg-label">
              예상 소요 시간
              <input type="number" min={1} value={registerForm.estimatedHours} onChange={(e) => updateFormField('estimatedHours', e.target.value)} />
            </label>
            <label className="reg-label">
              운영 상태
              <select value={registerForm.period} onChange={(e) => updateFormField('period', e.target.value)}>
                <option value="active">진행 중</option>
                <option value="always">상시</option>
                <option value="upcoming">예정</option>
              </select>
            </label>
            <label className="reg-label">
              참여 대상
              <input value={registerForm.targetAudience} onChange={(e) => updateFormField('targetAudience', e.target.value)} />
            </label>
            <label className="reg-label full">
              태그 (쉼표 구분)
              <input placeholder="태그1, 태그2, 태그3" value={registerForm.tags} onChange={(e) => updateFormField('tags', e.target.value)} />
            </label>
          </div>
        </div>

        {/* 인증 방법 */}
        <div className="detail-section">
          <h3>인증 방법</h3>
          <div className="reg-checkbox-group">
            {VERIFICATION_OPTIONS.map((opt) => (
              <label key={opt.value} className="reg-checkbox">
                <input
                  type="checkbox"
                  checked={registerForm.verificationMethods.includes(opt.value)}
                  onChange={() => toggleVerificationMethod(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* 스팟 목록 */}
        <div className="detail-section">
          <h3>방문 장소 ({editSpots.length}곳)</h3>
          <ul className="spot-list">
            {editSpots.map((spot, index) => (
              <li key={spot.id} className="spot-card">
                <div className="spot-number">{index + 1}</div>
                <div className="spot-info reg-spot-form">
                  <input placeholder="장소 이름 *" value={spot.name} onChange={(e) => updateSpot(index, 'name', e.target.value)} />
                  <input placeholder="주소" value={spot.address} onChange={(e) => updateSpot(index, 'address', e.target.value)} />
                  <input placeholder="운영시간 (예: 09:00-18:00)" value={spot.openHours} onChange={(e) => updateSpot(index, 'openHours', e.target.value)} />
                  <input placeholder="장소 설명" value={spot.description} onChange={(e) => updateSpot(index, 'description', e.target.value)} />
                  <button className="btn-remove" onClick={() => removeSpot(index)}>삭제</button>
                </div>
              </li>
            ))}
          </ul>
          <button className="btn-add" onClick={addSpot}>+ 장소 추가</button>
        </div>

        {/* 보상 정보 */}
        <div className="detail-section">
          <h3>보상 정보</h3>
          <label className="reg-label full">
            완주 보상
            <input placeholder="완주 시 제공되는 보상" value={registerForm.reward} onChange={(e) => updateFormField('reward', e.target.value)} />
          </label>
          <h4>단계별 마일스톤</h4>
          <ul className="milestone-edit-list">
            {editMilestones.map((ms, index) => (
              <li key={index} className="milestone-edit-item">
                <input
                  type="number"
                  min={1}
                  className="ms-count"
                  placeholder="#"
                  value={ms.stampCount}
                  onChange={(e) => updateMilestone(index, 'stampCount', Number(e.target.value))}
                />
                <span className="ms-sep">개 달성 →</span>
                <input
                  className="ms-reward"
                  placeholder="보상 내용"
                  value={ms.reward}
                  onChange={(e) => updateMilestone(index, 'reward', e.target.value)}
                />
                <button className="btn-remove-sm" onClick={() => removeMilestone(index)}>×</button>
              </li>
            ))}
          </ul>
          <button className="btn-add" onClick={addMilestone}>+ 마일스톤 추가</button>
        </div>

        {/* 주의사항 */}
        <div className="detail-section">
          <h3>주의사항</h3>
          <ul className="notice-edit-list">
            {editNotices.map((notice, index) => (
              <li key={index} className="notice-edit-item">
                <input value={notice} placeholder="주의사항 내용" onChange={(e) => updateNotice(index, e.target.value)} />
                <button className="btn-remove-sm" onClick={() => removeNotice(index)}>×</button>
              </li>
            ))}
          </ul>
          <button className="btn-add" onClick={addNotice}>+ 주의사항 추가</button>
        </div>

        {/* 문의 정보 */}
        <div className="detail-section">
          <h3>문의 정보</h3>
          <div className="reg-form-grid">
            <label className="reg-label">
              전화번호
              <input placeholder="02-0000-0000" value={registerForm.contactPhone} onChange={(e) => updateFormField('contactPhone', e.target.value)} />
            </label>
            <label className="reg-label">
              이메일
              <input placeholder="tour@example.com" value={registerForm.contactEmail} onChange={(e) => updateFormField('contactEmail', e.target.value)} />
            </label>
            <label className="reg-label full">
              웹사이트
              <input placeholder="https://..." value={registerForm.contactWebsite} onChange={(e) => updateFormField('contactWebsite', e.target.value)} />
            </label>
          </div>
        </div>

        {/* 등록 버튼 */}
        <div className="detail-actions">
          <button className="action-wishlist" onClick={resetRegister}>취소</button>
          <button className="action-join" onClick={submitRegistration}>투어 등록</button>
        </div>
      </section>
    );
  };

  const renderPlanPage = () => {
    const wishlistTours = allTours.filter((tour) => wishlist.includes(tour.id));
    const activeTours = allTours.filter((tour) => activePlans.includes(tour.id));
    const doneTours = allTours.filter((tour) => completedPlans.includes(tour.id));

    return (
      <section className="card">
        <h2>내 투어 계획</h2>
        <p className="helper">위시리스트/참여 등록/일정/진행률을 한 곳에서 관리합니다.</p>

        <div className="plan-summary">
          <article>
            <h3>위시리스트</h3>
            <p>{wishlistTours.length}개</p>
          </article>
          <article>
            <h3>진행 중 투어</h3>
            <p>{activeTours.length}개</p>
          </article>
          <article>
            <h3>완료 투어</h3>
            <p>{doneTours.length}개</p>
          </article>
        </div>

        <h3>진행 중 체크리스트</h3>
        <ul className="list">
          {activeTours.map((tour) => {
            const acquiredCount = recordsWithMeta.filter((record) => record.tourTitle === tour.title).length;
            const progress = Math.round((acquiredCount / tour.spots.length) * 100);
            return (
              <li key={tour.id} className="tour-card">
                <div>
                  <strong>{tour.title}</strong>
                  <p>예상 {tour.estimatedHours}시간 · 예상 비용 {tour.estimatedCost}</p>
                  <label>
                    투어 예정일
                    <input
                      type="date"
                      value={planDates[tour.id] || ''}
                      onChange={(event) => setPlanDates((prev) => ({ ...prev, [tour.id]: event.target.value }))}
                    />
                  </label>
                  <div className="progress-wrap">
                    <progress value={acquiredCount} max={tour.spots.length} />
                    <span>
                      {acquiredCount}/{tour.spots.length} ({progress}%)
                    </span>
                  </div>
                </div>
                <div className="stack-actions">
                  <button onClick={() => completePlan(tour.id)}>완료 처리</button>
                  <button onClick={() => openDetail(tour.id)}>상세 보기</button>
                </div>
              </li>
            );
          })}
        </ul>
        {activeTours.length === 0 && <p>진행 중인 투어가 없습니다. 탐색 페이지에서 계획에 추가해보세요.</p>}

        <h3>선택 투어 상세</h3>
        {selectedTour && (
          <article className="detail-box">
            <strong>{selectedTour.title}</strong>
            <p>{selectedTour.description}</p>
            <p>
              완주 조건: {selectedTour.spots.length}개 스팟 방문 · 보상: {selectedTour.reward}
            </p>
            <ul>
              {selectedTour.spots.map((spot) => (
                <li key={spot.id}>
                  {spot.name} ({spot.openHours}) - {spot.address}
                </li>
              ))}
            </ul>
          </article>
        )}
      </section>
    );
  };

  const renderCollectPage = () => (
    <section className="card">
      <h2>스탬프 기록</h2>
      <p className="helper">QR/GPS/사진/수동 방식으로 스탬프를 인증하고 컬렉션을 관리합니다.</p>

      <div className="controls grid-3">
        <select value={selectedSpotId} onChange={(event) => setSelectedSpotId(event.target.value)}>
          {allSpots.map((spot) => (
            <option key={spot.id} value={spot.id}>
              {spot.tourTitle} · {spot.name}
            </option>
          ))}
        </select>
        <select value={recordType} onChange={(event) => setRecordType(event.target.value)}>
          {VERIFICATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input placeholder="메모 (⭐ 입력 시 즐겨찾기)" value={recordMemo} onChange={(event) => setRecordMemo(event.target.value)} />
      </div>
      <button onClick={saveStampRecord}>스탬프 기록 저장</button>

      <div className="plan-summary stats">
        <article>
          <h3>총 스탬프 수</h3>
          <p>{recordsWithMeta.length}</p>
        </article>
        <article>
          <h3>완주 투어 수</h3>
          <p>{completedToursCount}</p>
        </article>
        <article>
          <h3>즐겨찾기 스탬프</h3>
          <p>{favoriteRecords.length}</p>
        </article>
      </div>

      <h3>획득 타임라인</h3>
      <ul className="list">
        {recordsWithMeta.map((record) => (
          <li key={record.id} className="timeline-item">
            <strong>{record.spotName}</strong>
            <span>{record.tourTitle}</span>
            <span>{new Date(record.acquiredAt).toLocaleString()}</span>
            <span>{record.method}</span>
            <span>{record.memo || '메모 없음'}</span>
          </li>
        ))}
      </ul>
      {recordsWithMeta.length === 0 && <p>아직 기록된 스탬프가 없습니다.</p>}
    </section>
  );

  const activeNavKey = currentPage === 'detail' ? 'discover' : currentPage;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1 className="top-bar-title">Stamp Tourer</h1>
        <button className="settings-btn" aria-label="설정" onClick={() => alert('설정 페이지는 준비 중입니다.')}>
          ⚙️
        </button>
      </header>

      <main className="page-content">
        {currentPage === 'discover' && renderDiscoverPage()}
        {currentPage === 'detail' && renderDetailPage()}
        {currentPage === 'register' && renderRegisterPage()}
        {currentPage === 'plan' && renderPlanPage()}
        {currentPage === 'collect' && renderCollectPage()}
      </main>

      <nav className="bottom-nav" aria-label="기능 내비게이션">
        {pages.map((page) => (
          <button
            key={page.key}
            className={`bottom-nav-item${activeNavKey === page.key ? ' is-active' : ''}`}
            onClick={() => setCurrentPage(page.key)}
          >
            <span className="bottom-nav-icon">{page.icon}</span>
            <span className="bottom-nav-label">{page.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
