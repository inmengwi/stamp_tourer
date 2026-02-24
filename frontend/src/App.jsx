import { useEffect, useMemo, useState } from 'react';
import {
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  DURATION_OPTIONS,
  PERIOD_OPTIONS,
  REGION_OPTIONS,
  SORT_OPTIONS,
  VERIFICATION_OPTIONS,
} from './data';
import { createTour, getTourDetail, getTours } from './api/toursApi';
import { completeTourParticipation, joinTour, toggleTourWishlist } from './api/participationApi';
import { createStampRecord } from './api/stampsApi';

const pages = [
  { key: 'discover', label: '탐색' },
  { key: 'register', label: '등록' },
  { key: 'plan', label: '내 투어' },
  { key: 'wishlist', label: '위시리스트' },
  { key: 'collect', label: '기록' },
  { key: 'detail', label: '상세' },
];

const emptyTourForm = {
  title: '',
  description: '',
  category: 'sightseeing',
  regionCode: '서울',
  period: 'active',
  difficulty: 'beginner',
  duration: 'day',
};

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

  const [registerForm, setRegisterForm] = useState(emptyTourForm);

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

  const onSubmitRegistration = async () => {
    setScreen('register', { loading: true, error: '' });
    try {
      const data = await createTour(registerForm);
      const newTour = data.tour ?? data;
      setTours((prev) => [newTour, ...prev]);
      setRegisterForm(emptyTourForm);
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
          <div className="stack-actions"><button onClick={loadTours}>필터 적용</button></div>
          {screens.discover.loading && <p>로딩 중...</p>}
          {screens.discover.error && <p>오류: {screens.discover.error} <button onClick={loadTours}>재시도</button></p>}
          <ul className="list">
            {filteredTours.map((tour) => (
              <li key={tour.id} className="tour-card">
                <div>
                  <strong>{tour.title}</strong>
                  <p>{tour.description}</p>
                </div>
                <div className="stack-actions">
                  <button onClick={() => openDetail(tour.id)}>상세 보기</button>
                  <button onClick={() => onToggleWishlist(tour.id)}>{wishlist.includes(tour.id) ? '찜 해제' : '찜'}</button>
                  <button onClick={() => onJoinTour(tour.id)}>참여</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {currentPage === 'detail' && (
        <section className="card">
          <button onClick={() => setCurrentPage('discover')}>← 돌아가기</button>
          {screens.detail.loading && <p>상세 정보 로딩 중...</p>}
          {screens.detail.error && <p>오류: {screens.detail.error} <button onClick={() => openDetail(selectedTourId)}>재시도</button></p>}
          {selectedTour && (
            <>
              <h2>{selectedTour.title}</h2>
              <p>{selectedTour.description}</p>
              <h3>스팟</h3>
              <ul>{(selectedTour.spots ?? []).map((spot) => <li key={spot.id}>{spot.name}</li>)}</ul>
              <div className="stack-actions">
                <button onClick={() => onToggleWishlist(selectedTour.id)}>{wishlist.includes(selectedTour.id) ? '찜 해제' : '찜'}</button>
                <button onClick={() => onJoinTour(selectedTour.id)}>참여</button>
              </div>
            </>
          )}
        </section>
      )}

      {currentPage === 'register' && (
        <section className="card">
          <h2>투어 등록</h2>
          {screens.register.error && <p>오류: {screens.register.error} <button onClick={onSubmitRegistration}>재시도</button></p>}
          <label>이름<input value={registerForm.title} onChange={(e) => setRegisterForm((p) => ({ ...p, title: e.target.value }))} /></label>
          <label>설명<textarea value={registerForm.description} onChange={(e) => setRegisterForm((p) => ({ ...p, description: e.target.value }))} /></label>
          <label>카테고리<select value={registerForm.category} onChange={(e) => setRegisterForm((p) => ({ ...p, category: e.target.value }))}>{CATEGORY_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label>지역<select value={registerForm.regionCode} onChange={(e) => setRegisterForm((p) => ({ ...p, regionCode: e.target.value }))}>{REGION_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label>난이도<select value={registerForm.difficulty} onChange={(e) => setRegisterForm((p) => ({ ...p, difficulty: e.target.value }))}>{DIFFICULTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label>기간<select value={registerForm.duration} onChange={(e) => setRegisterForm((p) => ({ ...p, duration: e.target.value }))}>{DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <button onClick={onSubmitRegistration} disabled={screens.register.loading}>{screens.register.loading ? '등록 중...' : '등록'}</button>
        </section>
      )}

      {currentPage === 'plan' && (
        <section className="card">
          <h2>내 투어</h2>
          <h3>진행 중</h3>
          <ul className="list">{activeTours.map((tour) => <li key={tour.id} className="tour-card"><strong>{tour.title}</strong><button onClick={() => onCompleteTour(tour.id)}>완료</button></li>)}</ul>
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
          {screens.collect.error && <p>오류: {screens.collect.error} <button onClick={onSaveRecord}>재시도</button></p>}
          <select value={recordSpotId} onChange={(e) => setRecordSpotId(e.target.value)}>
            <option value="">스팟 선택</option>
            {allSpots.map((spot) => <option key={spot.id} value={spot.id}>{spot.tourTitle} - {spot.name}</option>)}
          </select>
          <select value={recordMethod} onChange={(e) => setRecordMethod(e.target.value)}>{VERIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <input value={recordMemo} onChange={(e) => setRecordMemo(e.target.value)} placeholder="메모" />
          <button onClick={onSaveRecord} disabled={screens.collect.loading}>{screens.collect.loading ? '저장 중...' : '기록 저장'}</button>
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
            <span className="bottom-nav-label">{page.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
