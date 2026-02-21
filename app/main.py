from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Literal
from uuid import UUID, uuid4


Category = Literal["railway", "sightseeing", "festival", "local", "theme"]
TourStatus = Literal["planned", "active", "ended"]


@dataclass(frozen=True)
class Tour:
    id: UUID
    title: str
    description: str
    category: Category
    region_code: str
    status: TourStatus


@dataclass(frozen=True)
class StampSpot:
    id: UUID
    tour_id: UUID
    name: str
    address: str


@dataclass(frozen=True)
class StampRecord:
    id: UUID
    user_id: UUID
    stamp_spot_id: UUID
    acquired_at: datetime
    memo: str | None = None


class NotFoundError(ValueError):
    pass


class ConflictError(ValueError):
    pass


TOUR_1 = UUID("11111111-1111-1111-1111-111111111111")
TOUR_2 = UUID("22222222-2222-2222-2222-222222222222")
SPOT_1 = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
SPOT_2 = UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
DEMO_USER = UUID("99999999-9999-9999-9999-999999999999")


class StampTourerMVPService:
    """기획 문서 기반 MVP 핵심 흐름(탐색, 찜, 기록)을 제공하는 인메모리 서비스."""

    def __init__(self) -> None:
        self.tours: Dict[UUID, Tour] = {
            TOUR_1: Tour(
                id=TOUR_1,
                title="수도권 철도 스탬프 투어",
                description="서울/경기 주요 역을 방문해 스탬프를 모아요.",
                category="railway",
                region_code="KR-11",
                status="active",
            ),
            TOUR_2: Tour(
                id=TOUR_2,
                title="부산 바다 관광 스탬프",
                description="해변/등대/전망대를 돌며 스탬프를 수집해요.",
                category="sightseeing",
                region_code="KR-26",
                status="active",
            ),
        }
        self.stamp_spots: Dict[UUID, StampSpot] = {
            SPOT_1: StampSpot(id=SPOT_1, tour_id=TOUR_1, name="서울역", address="서울 중구 한강대로 405"),
            SPOT_2: StampSpot(id=SPOT_2, tour_id=TOUR_2, name="광안리 해변", address="부산 수영구 광안해변로"),
        }
        self.wishlists: Dict[UUID, set[UUID]] = {DEMO_USER: set()}
        self.stamp_records: List[StampRecord] = []

    def get_tours(
        self,
        keyword: str | None = None,
        region: str | None = None,
        category: Category | None = None,
        status: TourStatus | None = None,
    ) -> List[Tour]:
        items = list(self.tours.values())
        if keyword:
            lowered = keyword.lower()
            items = [item for item in items if lowered in item.title.lower() or lowered in item.description.lower()]
        if region:
            items = [item for item in items if item.region_code == region]
        if category:
            items = [item for item in items if item.category == category]
        if status:
            items = [item for item in items if item.status == status]
        return items

    def get_tour(self, tour_id: UUID) -> Tour:
        if tour_id not in self.tours:
            raise NotFoundError("Tour not found")
        return self.tours[tour_id]

    def get_tour_spots(self, tour_id: UUID) -> List[StampSpot]:
        self.get_tour(tour_id)
        return [spot for spot in self.stamp_spots.values() if spot.tour_id == tour_id]

    def add_wishlist(self, user_id: UUID, tour_id: UUID) -> None:
        self.get_tour(tour_id)
        self.wishlists.setdefault(user_id, set()).add(tour_id)

    def remove_wishlist(self, user_id: UUID, tour_id: UUID) -> None:
        self.get_tour(tour_id)
        self.wishlists.setdefault(user_id, set()).discard(tour_id)

    def get_wishlist(self, user_id: UUID) -> List[Tour]:
        tour_ids = self.wishlists.get(user_id, set())
        return [self.tours[tour_id] for tour_id in tour_ids if tour_id in self.tours]

    def create_stamp_record(
        self,
        user_id: UUID,
        stamp_spot_id: UUID,
        memo: str | None = None,
        acquired_at: datetime | None = None,
    ) -> StampRecord:
        if stamp_spot_id not in self.stamp_spots:
            raise NotFoundError("Stamp spot not found")

        for record in self.stamp_records:
            if record.user_id == user_id and record.stamp_spot_id == stamp_spot_id:
                raise ConflictError("Stamp already recorded")

        record = StampRecord(
            id=uuid4(),
            user_id=user_id,
            stamp_spot_id=stamp_spot_id,
            acquired_at=acquired_at or datetime.now(timezone.utc),
            memo=memo,
        )
        self.stamp_records.append(record)
        return record

    def get_collection(self, user_id: UUID) -> dict[str, int | List[StampRecord]]:
        records = [record for record in self.stamp_records if record.user_id == user_id]
        return {"total_stamp_count": len(records), "records": records}
