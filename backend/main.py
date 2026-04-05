from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from backend.routers import inventory

# ==========================================
# SMRITI-OS: "Memory, Not Code" Hub
# ==========================================

# Booting the application lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Depending on how the SQLite engines handle file locks, we may inject startup scripts here.
    # We will initialize DBs via an external script or Alembic in production, but for now they create on access.
    yield

app = FastAPI(
    title="SMRITI-OS Core API",
    description="The Intelligent ERP Data Hub",
    version="1.0.0",
    lifespan=lifespan
)

# Standard permissive CORS for the Retail WASM edge nodes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount our sharded routers
app.include_router(inventory.router)

@app.get("/")
def health_check():
    return {"status": "SMRITI-OS Backend Active", "architecture": "Multi-Database Sharded"}
