import asyncio
import selectors
from sqlalchemy import text
from app.db.database import engine, Base
from app.models.document import DocumentChunk  # noqa - registers the model
from app.models.user import User  # noqa - registers the model

async def init():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized.")

asyncio.run(
    init(),
    loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector())
)