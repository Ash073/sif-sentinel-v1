from alembic.autogenerate import render_python_code
from alembic.operations import ops
from alembic.operations.ops import CreateTableOp, ModifyTableOps
from app.db.base import Base
import app.models

def dump_schema():
    upgrades = []
    for table in Base.metadata.sorted_tables:
        upgrades.append(CreateTableOp.from_table(table))
    
    # We might need an UpgradeOps to hold them
    upgrade_ops = ops.UpgradeOps(ops=upgrades)
    code = render_python_code(upgrade_ops)
    print(code)

if __name__ == "__main__":
    dump_schema()
