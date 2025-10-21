from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings
from app.routes import auth, files

settings = Settings()

app = FastAPI(title="VaultX - Simple, Secure, Searchable File Storage", version="1.0.0")

origins = allow_origins = (
    ["*"] if settings.APP_ENV == "dev" else [settings.PROD_FRONTEND_DOMAIN]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

v1_router = APIRouter(prefix="/v1")

v1_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
v1_router.include_router(files.router, prefix="/files", tags=["Files"])

api_router = APIRouter(prefix="/api")
api_router.include_router(v1_router)

app.include_router(api_router)


@v1_router.get("/", tags=["Status"])
async def status():
    return {"detail": "VaultX is running!"}


# TODO: Add Rate Limiting
# TODO Add Admin accounts and endpoints
