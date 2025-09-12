from fastapi import FastAPI
from routes import users, files, file_shares, audit_logs

app = FastAPI(title="VaultX")

app.include_router(users.router)
app.include_router(files.router)
app.include_router(file_shares.router)
app.include_router(audit_logs.router)
