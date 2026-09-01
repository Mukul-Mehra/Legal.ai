from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    # unique=True gives Postgres a unique index, which is the real duplicate
    # guard - an application-level check would still race two signups.
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    password_hash = Column(Text, nullable=False)

    # Defaults the chat pre-fills, so context is not re-picked every session.
    default_personal_law = Column(String(60), nullable=False, server_default="")
    default_state = Column(String(60), nullable=False, server_default="")
    default_case_type = Column(String(80), nullable=False, server_default="")

    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )