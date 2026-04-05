from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List

from backend.database import get_db_master, get_db_transactions
from backend.schemas import ProductCreate, Product, InventoryTransactionCreate

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db_master)):
    """Creates a new product in the INVENTORY MASTER database."""
    try:
        result = await db.execute(
            text("""
                INSERT INTO products (sku, name, standard_price)
                VALUES (:sku, :name, :price)
                RETURNING id, sku, name, standard_price, stock, created_at
            """),
            {"sku": product.sku, "name": product.name, "price": product.standard_price}
        )
        await db.commit()
        # mappings().first() works nicely without ORM overhead
        return dict(result.mappings().first())
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/products", response_model=List[Product])
async def list_products(db: AsyncSession = Depends(get_db_master)):
    """Fetches all products and their current stock levels from INVENTORY MASTER."""
    result = await db.execute(text("SELECT * FROM products ORDER BY name"))
    return [dict(mapping) for mapping in result.mappings().all()]

@router.post("/transactions")
async def record_transaction(transaction: InventoryTransactionCreate, db: AsyncSession = Depends(get_db_transactions)):
    """
    Records an inventory movement in the RETAIL TRANSACTIONS database.
    Notice there is no Python logic here calculating stock.
    The database trigger automatically traverses the ATTACHED connection 
    to update the master_db.products table directly.
    """
    try:
        result = await db.execute(
            text("""
                INSERT INTO inventory_transactions 
                (product_id, quantity_change, transaction_type, reference_id)
                VALUES (:pid, :qty, :t_type, :ref)
                RETURNING id
            """),
            {
                "pid": transaction.product_id,
                "qty": transaction.quantity_change,
                "t_type": transaction.transaction_type,
                "ref": transaction.reference_id
            }
        )
        await db.commit()
        return {"status": "success", "transaction_id": result.scalar()}
    except Exception as e:
        await db.rollback()
        # If the DB Trigger fails (e.g., negative stock in Master DB), it throws here.
        raise HTTPException(status_code=400, detail=f"Database Rejected: {str(e)}")
