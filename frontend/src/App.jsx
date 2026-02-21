import { useMemo, useState } from 'react';
import { DEMO_USER, TOURS } from './data';

const categoryOptions = [
  { value: '', label: '전체 카테고리' },
  { value: 'railway', label: '철도' },
  { value: 'sightseeing', label: '관광' },
  { value: 'festival', label: '축제' },
  { value: 'local', label: '지역' },
  { value: 'theme', label: '테마' },
];

const pages = [
  { key: 'explore', label: '투어 탐색' },
  { key: 'detail', label: '투어 상세/스팟' },
  { key: 'wishlist', label: '내 찜 목록' },
  { key: 'collection', label: '내 컬렉션' },
];

export function App() {
  const [currentPage, setCurrentPage] = useState('explore');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTourId, setSelectedTourId] = useState(TOURS[0].id);
  const [wishlist, setWishlist] = useState([]);
  const [records, setRecords] = useState([]);
  const [memoBySpot, setMemoBySpot] = useState({});

  const filteredTours = useMemo(() => {
    return TOURS.filter((tour) => {
      const keywordMatched =
        keyword.trim() === '' ||
        tour.title.toLowerCase().includes(keyword.toLowerCase()) ||
        tour.description.toLowerCase().includes(keyword.toLowerCase());
      const categoryMatched = category === '' || category === tour.category;
      return keywordMatched && categoryMatched;
    });
  }, [keyword, category]);

  const selectedTour = TOURS.find((tour) => tour.id === selectedTourId) ?? filteredTours[0];

  const toggleWishlist = (tourId) => {
    setWishlist((prev) => (prev.includes(tourId) ? prev.filter((id) => id !== tourId) : [...prev, tourId]));
  };

  const createRecord = (spotId) => {
    const duplicate = records.some((record) => record.userId === DEMO_USER && record.stampSpotId === spotId);
    if (duplicate) {
      alert('이미 기록된 스탬프입니다.');
      return;
    }

    setRecords((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        userId: DEMO_USER,
        stampSpotId: spotId,
        acquiredAt: new Date().toISOString(),
        memo: memoBySpot[spotId] || '',
      },
    ]);
  };

  const wishlistTours = TOURS.filter((tour) => wishlist.includes(tour.id));

  const openTourDetail = (tourId) => {
    setSelectedTourId(tourId);
    setCurrentPage('detail');
  };

  const renderContent = () => {
    if (currentPage === 'explore') {
      return (
        <section className="card">
          <h2>1) 투어 탐색</h2>
          <div className="controls">
            <input
              placeholder="키워드 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <ul>
            {filteredTours.map((tour) => (
              <li key={tour.id} className="tour-item">
                <button onClick={() => openTourDetail(tour.id)}>{tour.title}</button>
                <span>{tour.regionCode}</span>
                <button onClick={() => toggleWishlist(tour.id)}>
                  {wishlist.includes(tour.id) ? '찜 해제' : '찜 추가'}
                </button>
              </li>
            ))}
            {filteredTours.length === 0 && <li>검색 결과가 없습니다.</li>}
          </ul>
        </section>
      );
    }

    if (currentPage === 'detail') {
      return (
        <section className="card">
          <h2>2) 투어 상세 / 스팟</h2>
          {!selectedTour && <p>선택된 투어가 없습니다. 투어 탐색에서 먼저 선택해 주세요.</p>}
          {selectedTour && (
            <>
              <h3>{selectedTour.title}</h3>
              <p>{selectedTour.description}</p>
              <ul>
                {selectedTour.spots.map((spot) => (
                  <li key={spot.id} className="spot-item">
                    <div>
                      <strong>{spot.name}</strong>
                      <p>{spot.address}</p>
                    </div>
                    <div className="spot-actions">
                      <input
                        placeholder="메모"
                        value={memoBySpot[spot.id] || ''}
                        onChange={(event) =>
                          setMemoBySpot((prev) => ({
                            ...prev,
                            [spot.id]: event.target.value,
                          }))
                        }
                      />
                      <button onClick={() => createRecord(spot.id)}>스탬프 기록</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      );
    }

    if (currentPage === 'wishlist') {
      return (
        <section className="card">
          <h2>3) 내 찜 목록</h2>
          <ul>
            {wishlistTours.map((tour) => (
              <li key={tour.id} className="tour-item">
                <button onClick={() => openTourDetail(tour.id)}>{tour.title}</button>
                <span>{tour.regionCode}</span>
                <button onClick={() => toggleWishlist(tour.id)}>찜 해제</button>
              </li>
            ))}
            {wishlistTours.length === 0 && <li>아직 찜한 투어가 없습니다.</li>}
          </ul>
        </section>
      );
    }

    return (
      <section className="card">
        <h2>4) 내 컬렉션</h2>
        <p>총 스탬프 수: {records.length}</p>
        <ul>
          {records.map((record) => (
            <li key={record.id}>
              {record.stampSpotId} / {new Date(record.acquiredAt).toLocaleString()} / {record.memo || '메모 없음'}
            </li>
          ))}
          {records.length === 0 && <li>아직 획득한 스탬프가 없습니다.</li>}
        </ul>
      </section>
    );
  };

  return (
    <main className="page">
      <header className="top-nav">
        <h1>Stamp Tourer MVP</h1>
        <p className="subtitle">탐색 · 찜 · 스탬프 기록 · 내 컬렉션</p>
        <nav className="tabs" aria-label="상단 내비게이션">
          {pages.map((page) => (
            <button
              key={page.key}
              className={currentPage === page.key ? 'is-active' : ''}
              onClick={() => setCurrentPage(page.key)}
            >
              {page.label}
            </button>
          ))}
        </nav>
      </header>

      {renderContent()}

      <nav className="bottom-nav" aria-label="하단 내비게이션">
        {pages.map((page) => (
          <button
            key={page.key}
            className={currentPage === page.key ? 'is-active' : ''}
            onClick={() => setCurrentPage(page.key)}
          >
            {page.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
