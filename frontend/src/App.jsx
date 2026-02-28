import { useEffect, useMemo, useState } from 'react';
import {
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  DURATION_OPTIONS,
  ONLINE_TOUR_DB,
  PERIOD_OPTIONS,
  REGION_OPTIONS,
  SORT_OPTIONS,
  VERIFICATION_OPTIONS,
} from './data';
import { createTour, getTourDetail, getTours } from './api/toursApi';
import { completeTourParticipation, joinTour, toggleTourWishlist } from './api/participationApi';
import { createStampRecord } from './api/stampsApi';

const pages = [
  { key: 'discover', label: '탐색', icon: '\uD83D\uDD0D' },
  { key: 'register', label: '등록', icon: '\u2795' },
  { key: 'plan', label: '내 투어', icon: '\uD83D\uDDFA\uFE0F' },
  { key: 'wishlist', label: '위시리스트', icon: '\u2665' },
  { key: 'collect', label: '기록', icon: '\uD83D\uDCDD' },
  { key: 'detail', label: '상세', icon: '\uD83D\uDCCB' },
];

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

const makeState = () => ({ loading: false, error: '' });

export function App() {
  const [currentPage, setCurrentPage] = useState('discover');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [period, setPeriod] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const [tours, setTours] = useState([]);
  const [selectedTourId, setSelectedTourId] = useState('');
  const [selectedTour, setSelectedTour] = useState(null);

  const [activePlans, setActivePlans] = useState([]);
  const [completedPlans, setCompletedPlans] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [records, setRecords] = useState([]);

  const [recordSpotId, setRecordSpotId] = useState('');
  const [recordMethod, setRecordMethod] = useState('manual');
  const [recordMemo, setRecordMemo] = useState('');

  const [registerStep, setRegisterStep] = useState('input');
  const [searchName, setSearchName] = useState('');
  const [searchDesc, setSearchDesc] = useState('');
  const [registerForm, setRegisterForm] = useState(null);
  const [editSpots, setEditSpots] = useState([]);
  const [onlineStructure, setOnlineStructure] = useState([]);
  const [editMilestones, setEditMilestones] = useState([]);
  const [editNotices, setEditNotices] = useState([]);

  const [screens, setScreens] = useState({
    discover: makeState(),
    detail: makeState(),
    register: makeState(),
    action: makeState(),
    collect: makeState(),
  });

  const setScreen = (screen, patch) => {
    setScreens((prev) => ({ ...prev, [screen]: { ...prev[screen], ...patch } }));
  };

  const loadTours = async () => {
    setScreen('discover', { loading: true, error: '' });
    try {
      const data = await getTours({ keyword, category, regionCode: region, period, sortBy });
      const items = data.items ?? [];
      setTours(items);
      if (items[0] && !selectedTourId) setSelectedTourId(items[0].id);
    } catch (error) {
      setScreen('discover', { error: error.message || '투어 목록을 불러오지 못했습니다.' });
    } finally {
      setScreen('discover', { loading: false });
    }
  };

  useEffect(() => {
    loadTours();
  }, []);

  const openDetail = async (tourId) => {
    setCurrentPage('detail');
    setSelectedTourId(tourId);
    setScreen('detail', { loading: true, error: '' });
    try {
      const data = await getTourDetail(tourId);
      setSelectedTour(data.tour ?? data);
    } catch (error) {
      setScreen('detail', { error: error.message || '상세 정보를 불러오지 못했습니다.' });
    } finally {
      setScreen('detail', { loading: false });
    }
  };

  const onToggleWishlist = async (tourId) => {
    const wished = !wishlist.includes(tourId);
    setScreen('action', { loading: true, error: '' });
    try {
      await toggleTourWishlist(tourId, wished);
      setWishlist((prev) => (wished ? [...prev, tourId] : prev.filter((id) => id !== tourId)));
    } catch (error) {
      setScreen('action', { error: error.message || '위시리스트 변경에 실패했습니다.' });
    } finally {
      setScreen('action', { loading: false });
    }
  };

  const onJoinTour = async (tourId) => {
    setScreen('action', { loading: true, error: '' });
    try {
      await joinTour(tourId);
      setActivePlans((prev) => (prev.includes(tourId) ? prev : [...prev, tourId]));
      setCompletedPlans((prev) => prev.filter((id) => id !== tourId));
      setCurrentPage('plan');
    } catch (error) {
      setScreen('action', { error: error.message || '투어 참여에 실패했습니다.' });
    } finally {
      setScreen('action', { loading: false });
    }
  };

  const onCompleteTour = async (tourId) => {
    setScreen('action', { loading: true, error: '' });
    try {
      await completeTourParticipation(tourId);
      setCompletedPlans((prev) => (prev.includes(tourId) ? prev : [...prev, tourId]));
      setActivePlans((prev) => prev.filter((id) => id !== tourId));
    } catch (error) {
      setScreen('action', { error: error.message || '완료 처리에 실패했습니다.' });
    } finally {
      setScreen('action', { loading: false });
    }
  };

  const onSaveRecord = async () => {
    if (!recordSpotId) return;
    setScreen('collect', { loading: true, error: '' });
    try {
      const data = await createStampRecord({ spotId: recordSpotId, method: recordMethod, memo: recordMemo });
      const saved = data.record ?? data;
      setRecords((prev) => [saved, ...prev]);
      setRecordMemo('');
    } catch (error) {
      setScreen('collect', { error: error.message || '기록 저장에 실패했습니다.' });
    } finally {
      setScreen('collect', { loading: false });
    }
  };

  const extractSpotsFromTour = (tour) => {
    if (Array.isArray(tour.subTours) && tour.subTours.length > 0) {
      return tour.subTours.flatMap((subTour) =>
        subTour.stamps.map((stamp) => ({
          ...stamp,
          subTourTitle: subTour.title,
        })),
      );
    }
    return tour.spots ?? [];
  };

  const searchOnline = () => {
    if (!searchName.trim()) {
      alert('투어 이름을 입력해주세요.');
      return;
    }
    setRegisterStep('loading');
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
        const spotsFromResult = extractSpotsFromTour(t);
        setEditSpots(spotsFromResult.map((s) => ({ ...s, id: crypto.randomUUID() })));
        setOnlineStructure(t.subTours ?? []);
        setEditMilestones([...t.milestones]);
        setEditNotices([...t.notices]);
      } else {
        setRegisterForm({ ...emptyForm(), title: searchName, description: searchDesc });
        setEditSpots([]);
        setOnlineStructure([]);
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

  const resetRegister = () => {
    setRegisterStep('input');
    setSearchName('');
    setSearchDesc('');
    setRegisterForm(null);
    setEditSpots([]);
    setEditMilestones([]);
    setEditNotices([]);
    setOnlineStructure([]);
  };

  const onSubmitRegistration = async () => {
    if (!registerForm || !registerForm.title.trim()) {
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

    const payload = {
      title: registerForm.title,
      description: registerForm.description,
      category: registerForm.category,
      regionCode: registerForm.regionCode,
      difficulty: registerForm.difficulty,
      duration: registerForm.duration,
      budget: registerForm.budget,
      period: registerForm.period,
      status: registerForm.status,
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

    setScreen('register', { loading: true, error: '' });
    try {
      const data = await createTour(payload);
      const newTour = data.tour ?? data;
      setTours((prev) => [newTour, ...prev]);
      resetRegister();
      setSelectedTourId(newTour.id);
      setSelectedTour(newTour);
      setCurrentPage('detail');
    } catch (error) {
      setScreen('register', { error: error.message || '투어 등록에 실패했습니다.' });
    } finally {
      setScreen('register', { loading: false });
    }
  };

  const filteredTours = useMemo(() => {
    return [...tours].sort((a, b) => {
      if (sortBy === 'latest') return String(b.id).localeCompare(String(a.id));
      if (sortBy === 'review') return (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
      return (b.participants ?? 0) - (a.participants ?? 0);
    });
  }, [tours, sortBy]);

  const allSpots = useMemo(
    () => tours.flatMap((tour) => (tour.spots ?? []).map((spot) => ({ ...spot, tourTitle: tour.title }))),
    [tours],
  );

  const activeTours = tours.filter((tour) => activePlans.includes(tour.id));
  const doneTours = tours.filter((tour) => completedPlans.includes(tour.id));
  const wishedTours = tours.filter((tour) => wishlist.includes(tour.id));

  return (
    <main className="app-shell">
      <header className="top-bar">
        <h1 className="top-bar-title">Stamp Tourer</h1>
      </header>

      <div className="page-content">
        {screens.action.error && <p className="helper">⚠️ {screens.action.error}</p>}

      {currentPage === 'discover' && (
        <section className="card">
          <h2>스탬프 투어 탐색</h2>
          <div className="controls grid-5">
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색어" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>{REGION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>{SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </div>
          <div className="stack-actions"><button className="btn" onClick={loadTours}>필터 적용</button></div>
          {screens.discover.loading && <p>로딩 중...</p>}
          {screens.discover.error && <p>오류: {screens.discover.error} <button className="btn" onClick={loadTours}>재시도</button></p>}
          <ul className="list">
            {filteredTours.map((tour) => (
              <li key={tour.id} className="tour-card">
                <div>
                  <strong>{tour.title}</strong>
                  <p>{tour.description}</p>
                </div>
                <div className="stack-actions">
                  <button className="btn" onClick={() => openDetail(tour.id)}>상세 보기</button>
                  <button className="btn" onClick={() => onToggleWishlist(tour.id)}>{wishlist.includes(tour.id) ? '찜 해제' : '찜'}</button>
                  <button className="btn" onClick={() => onJoinTour(tour.id)}>참여</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {currentPage === 'detail' && (
        <section className="detail-page">
          {screens.detail.loading && <p>상세 정보 로딩 중...</p>}
          {screens.detail.error && <p>오류: {screens.detail.error} <button className="btn" onClick={() => openDetail(selectedTourId)}>재시도</button></p>}
          {selectedTour && (
            <>
              <div className="detail-header">
                <button className="back-btn" onClick={() => setCurrentPage('discover')}>← 돌아가기</button>
                <div className="detail-thumbnail">{selectedTour.thumbnailEmoji ?? '📍'}</div>
                <h2 className="detail-title">{selectedTour.title}</h2>
                {selectedTour.tags?.length > 0 && (
                  <div className="detail-tags">
                    {selectedTour.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                )}
                <div className="detail-meta-row">
                  {selectedTour.regionCode && <span>{selectedTour.regionCode}</span>}
                  {selectedTour.difficulty && <span>{selectedTour.difficulty}</span>}
                  {selectedTour.duration && <span>{selectedTour.duration}</span>}
                </div>
                {selectedTour.organizer && <p className="detail-organizer">주최: {selectedTour.organizer}</p>}
              </div>

              <div className="detail-summary-grid">
                <article>
                  <div className="summary-value">{(selectedTour.spots ?? []).length}</div>
                  <div className="summary-label">스팟</div>
                </article>
                <article>
                  <div className="summary-value">{selectedTour.estimatedHours ?? '-'}h</div>
                  <div className="summary-label">예상 시간</div>
                </article>
                <article>
                  <div className="summary-value">{selectedTour.participants ?? 0}</div>
                  <div className="summary-label">참여자</div>
                </article>
                <article>
                  <div className="summary-value">{selectedTour.reviewScore ?? '-'}</div>
                  <div className="summary-label">평점</div>
                </article>
              </div>

              <div className="detail-section">
                <h3>소개</h3>
                <p>{selectedTour.description}</p>
              </div>

              <div className="detail-section">
                <h3>방문 장소 ({(selectedTour.spots ?? []).length}곳)</h3>
                <ul className="spot-list">
                  {(selectedTour.spots ?? []).map((spot, idx) => (
                    <li key={spot.id} className="spot-card">
                      <div className="spot-number">{idx + 1}</div>
                      <div className="spot-info">
                        <strong>{spot.name}</strong>
                        {spot.description && <p className="spot-desc">{spot.description}</p>}
                        <div className="spot-meta">
                          {spot.address && <span>{spot.address}</span>}
                          {spot.openHours && <span>{spot.openHours}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="detail-actions">
                <button className="action-wishlist" onClick={() => onToggleWishlist(selectedTour.id)}>
                  {wishlist.includes(selectedTour.id) ? '찜 해제' : '찜'}
                </button>
                <button className="action-join" onClick={() => onJoinTour(selectedTour.id)}>참여</button>
              </div>
            </>
          )}
        </section>
      )}

      {currentPage === 'register' && registerStep === 'input' && (
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
                setOnlineStructure([]);
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
      )}

      {currentPage === 'register' && registerStep === 'loading' && (
        <section className="card reg-loading">
          <div className="spinner" />
          <h3>온라인에서 투어 정보를 조회 중...</h3>
          <p className="helper">"{searchName}" 관련 정보를 검색하고 있습니다.</p>
        </section>
      )}

      {currentPage === 'register' && registerStep === 'edit' && registerForm && (
        <section className="detail-page">
          <div className="detail-header detail-header--edit">
            <button className="back-btn" onClick={resetRegister}>← 다시 검색</button>
            <h2 className="detail-title">투어 정보 편집</h2>
            <p className="helper text-center">
              온라인 조회 결과를 확인하고 수정한 뒤 등록하세요.
            </p>
          </div>
          {screens.register.error && <p className="helper">오류: {screens.register.error}</p>}

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
                <textarea rows={4} value={registerForm.description} onChange={(e) => updateFormField('description', e.target.value)} />
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
            {onlineStructure.length > 0 && (
              <div className="multi-tour-box">
                <h4>온라인 조회 구조 (Sub Tour & Stamp)</h4>
                <p className="helper">{onlineStructure.length}개 길로 구성되며, 총 {onlineStructure.reduce((sum, s) => sum + s.stamps.length, 0)}개 스탬프를 조회했습니다.</p>
                <ul className="subtour-list">
                  {onlineStructure.map((subTour) => (
                    <li key={subTour.id}>
                      <strong>{subTour.title}</strong>
                      <span>{subTour.stamps.length}개 스탬프</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h3>방문 장소 ({editSpots.length}곳)</h3>
            <ul className="spot-list">
              {editSpots.map((spot, index) => (
                <li key={spot.id} className="spot-card">
                  <div className="spot-number">{index + 1}</div>
                  <div className="spot-info reg-spot-form">
                    {spot.subTourTitle && <small className="spot-subtour-label">소속 길: {spot.subTourTitle}</small>}
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
            <button className="action-join" onClick={onSubmitRegistration} disabled={screens.register.loading}>
              {screens.register.loading ? '등록 중...' : '투어 등록'}
            </button>
          </div>
        </section>
      )}

      {currentPage === 'plan' && (
        <section className="card">
          <h2>내 투어</h2>
          <h3>진행 중</h3>
          <ul className="list">{activeTours.map((tour) => <li key={tour.id} className="tour-card"><strong>{tour.title}</strong><button className="btn" onClick={() => onCompleteTour(tour.id)}>완료</button></li>)}</ul>
          <h3>완료</h3>
          <ul className="list">{doneTours.map((tour) => <li key={tour.id} className="tour-card"><strong>{tour.title}</strong></li>)}</ul>
        </section>
      )}

      {currentPage === 'wishlist' && (
        <section className="card">
          <h2>위시리스트</h2>
          <ul className="list">{wishedTours.map((tour) => <li key={tour.id} className="tour-card"><strong>{tour.title}</strong></li>)}</ul>
        </section>
      )}

      {currentPage === 'collect' && (
        <section className="card">
          <h2>스탬프 기록</h2>
          {screens.collect.error && <p>오류: {screens.collect.error} <button className="btn" onClick={onSaveRecord}>재시도</button></p>}
          <select value={recordSpotId} onChange={(e) => setRecordSpotId(e.target.value)}>
            <option value="">스팟 선택</option>
            {allSpots.map((spot) => <option key={spot.id} value={spot.id}>{spot.tourTitle} - {spot.name}</option>)}
          </select>
          <select value={recordMethod} onChange={(e) => setRecordMethod(e.target.value)}>{VERIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <input value={recordMemo} onChange={(e) => setRecordMemo(e.target.value)} placeholder="메모" />
          <button className="btn" onClick={onSaveRecord} disabled={screens.collect.loading}>{screens.collect.loading ? '저장 중...' : '기록 저장'}</button>
          <ul className="list">{records.map((record) => <li key={record.id ?? `${record.spotId}-${record.acquiredAt}`}><strong>{record.spotName ?? record.spotId}</strong> - {record.memo}</li>)}</ul>
        </section>
      )}
      </div>

      <nav className="bottom-nav">
        {pages.slice(0, 5).map((page) => (
          <button
            key={page.key}
            type="button"
            className={`bottom-nav-item ${currentPage === page.key ? 'is-active' : ''}`}
            onClick={() => setCurrentPage(page.key)}
          >
            <span className="bottom-nav-icon">{page.icon}</span>
            <span className="bottom-nav-label">{page.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
