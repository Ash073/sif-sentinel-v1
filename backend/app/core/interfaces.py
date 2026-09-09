from typing import Protocol, runtime_checkable

@runtime_checkable
class MLAdapterProtocol(Protocol):
    def predict(self, text: str) -> dict:
        """Predict outcomes based on text"""
        ...

@runtime_checkable
class NLPAdapterProtocol(Protocol):
    def extract_entities(self, text: str) -> dict:
        """Extract entities from text"""
        ...

@runtime_checkable
class AnalysisPipelineProtocol(Protocol):
    def analyze_text(self, text: str):
        """Run the full analysis pipeline"""
        ...
