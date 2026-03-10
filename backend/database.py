# backend/database.py  v3
from sqlalchemy import (
    create_engine, Column, Integer, String,
    Boolean, DateTime, ForeignKey, Float
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./engage.db"
engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String,  nullable=False)
    email         = Column(String,  unique=True, index=True, nullable=False)
    password_hash = Column(String,  nullable=False)
    role          = Column(String,  nullable=False)
    classes            = relationship("Class",            back_populates="teacher")
    engagement_records = relationship("EngagementRecord", back_populates="student")


class Class(Base):
    __tablename__ = "classes"
    class_id   = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"),   nullable=False)
    class_name = Column(String,  nullable=False)
    teacher    = relationship("User",    back_populates="classes")
    sessions   = relationship("Session", back_populates="cls", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"
    session_id       = Column(Integer, primary_key=True, index=True)
    class_id         = Column(Integer, ForeignKey("classes.class_id"), nullable=False)
    start_time       = Column(DateTime, default=datetime.utcnow)
    end_time         = Column(DateTime, nullable=True)
    interval_minutes = Column(Integer,  default=5)
    active           = Column(Boolean,  default=True)
    cls                = relationship("Class",            back_populates="sessions")
    engagement_records = relationship("EngagementRecord", back_populates="session")


class EngagementRecord(Base):
    __tablename__ = "engagement_records"
    record_id        = Column(Integer, primary_key=True, index=True)
    session_id       = Column(Integer, ForeignKey("sessions.session_id"), nullable=False)
    student_id       = Column(Integer, ForeignKey("users.id"),            nullable=False)
    timestamp        = Column(DateTime, default=datetime.utcnow)
    engagement_score = Column(Float,  nullable=False)
    label            = Column(String, nullable=False)
    cycle_number     = Column(Integer, default=1)
    session = relationship("Session", back_populates="engagement_records")
    student = relationship("User",    back_populates="engagement_records")


def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
