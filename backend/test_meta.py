from app.services.model_service import current_model_metadata
import json
print(json.dumps(current_model_metadata(), indent=2))
