from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ==========================================
# STRICT PYDANTIC SCHEMAS
# Acting as the explicit data gatekeepers 
# before data touches the Memory (Database).
# ==========================================

class ProductBase(BaseModel):
    sku: str
    name: str
    standard_price: float

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    stock: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class InventoryTransactionCreate(BaseModel):
    product_id: int
    quantity_change: int
    transaction_type: str
    reference_id: Optional[str] = None

class InventoryTransaction(InventoryTransactionCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
