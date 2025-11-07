from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.db import AsyncSessionLocal, Base, engine
from app.routes import audit, auth, files, search, shares, user


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        if settings.app_env == "dev":
            await conn.run_sync(Base.metadata.create_all)
            print("🗄️  Database tables checked/created (dev mode).")
        else:
            await conn.run_sync(lambda _: None)
    print("✅ Database connected successfully.")

    yield

    await engine.dispose()
    print("🧹 Database connection closed.")


app = FastAPI(
    title="VaultX Backend",
    version="0.1",
    lifespan=lifespan,
)

if settings.app_env == "dev":
    origins = [settings.dev_frontend_url]
else:
    origins = [settings.prod_frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(files.router)
app.include_router(search.router)
app.include_router(shares.router)
app.include_router(user.router)
app.include_router(audit.router)


@app.get("/health")
async def health():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        db_status = "unreachable"

    return {
        "status": "ok",
        "database": db_status,
        "environment": settings.app_env,
    }
