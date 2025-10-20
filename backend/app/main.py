from fastapi import APIRouter, FastAPI

from app.core.config import settings
from app.routes import auth, files

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

v1_router = APIRouter(prefix="/v1")

v1_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
v1_router.include_router(files.router, prefix="/files", tags=["Files"])

api_router = APIRouter(prefix="/api")
api_router.include_router(v1_router)

app.include_router(api_router)


@app.get("/", tags=["Status"])
async def status():
    return {"message": f"{settings.APP_NAME} backend is running!"}


# TODO: Add Rate Limiting
# TODO Add Admin accounts and endpoints
