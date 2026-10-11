from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class CitationModel(BaseModel):
    path: str
    start_line: int
    end_line: int
    commit_sha: Optional[str] = None
    snippet_hash: Optional[str] = None
    verified: bool = False

class MentorAnswer(BaseModel):
    status: str = Field(description="grounded | partially_grounded | unsupported")
    answer_markdown: str
    citations: List[CitationModel] = []
    uncertainty_notes: Optional[str] = None

class ComponentItem(BaseModel):
    name: str
    responsibility: str
    files: List[str] = []
    citations: List[CitationModel] = []

class RelationshipItem(BaseModel):
    from_comp: str = Field(alias="from")
    to_comp: str = Field(alias="to")
    type: str = Field(description="import | call | route")
    citations: List[CitationModel] = []

class ArchitectureOverview(BaseModel):
    components: List[ComponentItem] = []
    relationships: List[RelationshipItem] = []

class BuilderPatch(BaseModel):
    summary: str
    files_touched: List[str] = []
    files_to_update: Dict[str, str] = {}
    unified_diff: Optional[str] = None

class AdversarialFinding(BaseModel):
    severity: str = Field(description="high | medium | low")
    title: str
    description: str
    suggested_test: str
    test_code: Optional[str] = None
    related_locations: List[Dict[str, Any]] = []

class BattleRoundResult(BaseModel):
    round_number: int
    builder_patch_summary: Optional[str] = None
    adversary_test_name: Optional[str] = None
    test_outcome: str = Field(description="passed | failed | error")
    severity: Optional[str] = None
    reviewer_summary: Optional[str] = None

class BattleReport(BaseModel):
    rounds: List[BattleRoundResult] = []
    what_changed: str
    challenges_raised: List[AdversarialFinding] = []
    residual_risks: List[str] = []
    reviewer_verdict: str = Field(description="approved | requires_revision | rejected")

class DiagnosisHypothesis(BaseModel):
    rank: int
    description: str
    target_file: str
    citations: List[CitationModel] = []
    confidence: float = 0.5

class HealDiagnosis(BaseModel):
    hypotheses: List[DiagnosisHypothesis] = []
    recommended_action: str = Field(description="patch | investigate_further | inconclusive")
    fixed_files: Dict[str, str] = {}
    verdict: Optional[str] = None
