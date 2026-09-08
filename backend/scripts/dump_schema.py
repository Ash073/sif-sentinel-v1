import asyncio
from alembic.autogenerate import render_python_code, compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, MetaData
from app.db.base import Base
import app.models

def dump_schema():
    engine = create_engine('sqlite:///:memory:')
    with engine.connect() as conn:
        context = MigrationContext.configure(conn)
        diff = compare_metadata(context, Base.metadata)
        
        from alembic.autogenerate import api
        from alembic.operations import ops
        
        upgrade_ops = ops.UpgradeOps(ops=diff)
        code = render_python_code(upgrade_ops)
        print(code)

if __name__ == "__main__":
    dump_schema()
