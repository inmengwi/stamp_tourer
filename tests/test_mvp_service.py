from app.main import (
    ConflictError,
    DEMO_USER,
    SPOT_1,
    TOUR_1,
    StampTourerMVPService,
)


def test_get_tours() -> None:
    service = StampTourerMVPService()
    tours = service.get_tours()
    assert len(tours) >= 2


def test_wishlist_add_and_fetch() -> None:
    service = StampTourerMVPService()
    service.add_wishlist(DEMO_USER, TOUR_1)
    items = service.get_wishlist(DEMO_USER)
    assert any(item.id == TOUR_1 for item in items)


def test_create_stamp_record_and_collection() -> None:
    service = StampTourerMVPService()
    service.create_stamp_record(user_id=DEMO_USER, stamp_spot_id=SPOT_1, memo="첫 방문")

    try:
        service.create_stamp_record(user_id=DEMO_USER, stamp_spot_id=SPOT_1)
        assert False, "중복 기록은 예외가 발생해야 합니다"
    except ConflictError:
        pass

    collection = service.get_collection(DEMO_USER)
    assert collection["total_stamp_count"] == 1
