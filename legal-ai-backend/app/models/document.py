from sqlalchemy import Column, Integer, String, Text
from pgvector.sqlalchemy import Vector
from app.db.database import Base

class DocumentChunk(Base):
    __tablename__ = "document_chunks"


    id = Column(Integer, primary_key=True)
    source_type = Column(String)
    domain = Column(String)
    personal_law = Column(String)
    title = Column(String)
    citation = Column(String)
    text = Column(Text)
    embedding = Column(Vector(768))