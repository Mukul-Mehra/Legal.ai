import asyncio
import selectors

from sqlalchemy import func, select

from app.db.database import AsyncSessionLocal
from app.models.document import DocumentChunk


async def count():
    async with AsyncSessionLocal() as s:
        n = (await s.execute(select(func.count()).select_from(DocumentChunk))).scalar()
        print("chunks:", n)


asyncio.run(
    count(),
    loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
)
