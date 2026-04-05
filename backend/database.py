import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import event
from sqlalchemy.engine import Engine

# ==========================================
# SMRITI-OS: Sharded Database Connections
# ==========================================

# Using absolute path resolution for SQLite ATTACH reliability
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_MASTER_PATH = os.path.join(BASE_DIR, 'master.db')
DB_SETTINGS_PATH = os.path.join(BASE_DIR, 'settings.db')
DB_TRANSACTIONS_PATH = os.path.join(BASE_DIR, 'transactions.db')

URL_MASTER = f"sqlite+aiosqlite:///{DB_MASTER_PATH}"
URL_SETTINGS = f"sqlite+aiosqlite:///{DB_SETTINGS_PATH}"
URL_TRANSACTIONS = f"sqlite+aiosqlite:///{DB_TRANSACTIONS_PATH}"

# 1. Master Data Engine (Products)
engine_master = create_async_engine(URL_MASTER, echo=True)
SessionMaster = async_sessionmaker(autocommit=False, autoflush=False, bind=engine_master)

# 2. Settings Engine (Configs, Tax)
engine_settings = create_async_engine(URL_SETTINGS, echo=True)
SessionSettings = async_sessionmaker(autocommit=False, autoflush=False, bind=engine_settings)

# 3. Transactions Engine (High Velocity Movements)
engine_transactions = create_async_engine(URL_TRANSACTIONS, echo=True)

# ------------------------------------------------------------------
# FEDERATED SQLITE BINDING (SMRITI-OS "Memory, Not Code" requirement)
# ------------------------------------------------------------------
# We must hook into the sync connection created by aiosqlite/SQLAlchemy
# so that every connection to transactions.db attaches master.db.
# This makes cross-database triggers function natively in SQLite.

@event.listens_for(engine_transactions.sync_engine, "connect")
def attach_master_db(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    # Path is passed securely to avoid SQL injection on ATTACH
    cursor.execute(f"ATTACH DATABASE '{DB_MASTER_PATH}' AS master_db")
    cursor.close()

SessionTransactions = async_sessionmaker(autocommit=False, autoflush=False, bind=engine_transactions)


# Dependency Injection endpoints for FastAPI
async def get_db_master():
    async with SessionMaster() as session:
        yield session

async def get_db_settings():
    async with SessionSettings() as session:
        yield session

async def get_db_transactions():
    async with SessionTransactions() as session:
        yield session
