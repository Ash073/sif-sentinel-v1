import asyncio
import json
import sys
from pathlib import Path

# Add the project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from app.db.session import SessionLocal
from app.models.life_saving_rule import LifeSavingRule
from sqlalchemy import select

async def main():
    if len(sys.argv) < 2:
        print("Usage: python sync_knowledge_dict.py <path_to_json>")
        sys.exit(1)
        
    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"File not found: {json_path}")
        sys.exit(1)

    print(f"Reading from {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    rules = data if isinstance(data, list) else data.get("life_saving_rules", [])

    async with SessionLocal() as db:
        print("Connecting to database...")
        
        count = 0
        for rule_data in rules:
            code = rule_data.get("code")
            if not code:
                continue
                
            rule = await db.scalar(select(LifeSavingRule).where(LifeSavingRule.code == code))
            if not rule:
                rule = LifeSavingRule(
                    code=code,
                    name=rule_data.get("name", "Unknown"),
                    description=rule_data.get("description", ""),
                    keywords=rule_data.get("keywords", []),
                    hazards=rule_data.get("hazards", []),
                    barriers=rule_data.get("barriers", []),
                    is_active=rule_data.get("is_active", True)
                )
                db.add(rule)
            else:
                rule.name = rule_data.get("name", rule.name)
                rule.description = rule_data.get("description", rule.description)
                rule.keywords = rule_data.get("keywords", rule.keywords)
                rule.hazards = rule_data.get("hazards", rule.hazards)
                rule.barriers = rule_data.get("barriers", rule.barriers)
                rule.is_active = rule_data.get("is_active", rule.is_active)
            
            count += 1

        await db.commit()
        print(f"Successfully synced {count} life saving rules to the knowledge dictionary.")

if __name__ == "__main__":
    asyncio.run(main())
