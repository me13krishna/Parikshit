import os
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.core.logging import logger

class CitationVerifier:
    @staticmethod
    def verify_single_citation(
        repo_root: Path,
        citation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Server-side validation of a code citation against real files on disk.
        Protects against path traversal and hallucinated line ranges.
        """
        rel_path = citation.get("path", "").strip().replace("\\", "/")
        start_line = citation.get("start_line", 1)
        end_line = citation.get("end_line", start_line)

        # 1. Path safety check
        target_file = (repo_root / rel_path).resolve()
        try:
            target_file.relative_to(repo_root.resolve())
        except ValueError:
            logger.warning(f"Citation path traversal attempt or escape: {rel_path}")
            return {**citation, "verified": False, "error": "Path escapes repository boundary"}

        # 2. File existence check
        if not target_file.is_file():
            return {**citation, "verified": False, "error": f"File does not exist: {rel_path}"}

        # 3. Line range check
        try:
            with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            
            total_lines = len(lines)
            if start_line < 1 or start_line > total_lines or end_line < start_line or end_line > total_lines:
                return {
                    **citation,
                    "verified": False,
                    "error": f"Invalid line range {start_line}-{end_line} (file has {total_lines} lines)"
                }

            # Slice snippet (1-indexed lines)
            snippet_lines = lines[start_line - 1 : end_line]
            snippet_text = "".join(snippet_lines)
            snippet_hash = hashlib.sha256(snippet_text.encode("utf-8")).hexdigest()

            return {
                "path": rel_path,
                "start_line": start_line,
                "end_line": end_line,
                "commit_sha": citation.get("commit_sha", ""),
                "snippet_hash": f"sha256:{snippet_hash}",
                "snippet": snippet_text,
                "verified": True
            }

        except Exception as e:
            logger.error(f"Error reading citation target {rel_path}: {e}")
            return {**citation, "verified": False, "error": str(e)}

    @classmethod
    def verify_citations(
        cls,
        repo_root: Path,
        citations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Verifies a list of citations, returning only verifiable ones or annotated with verification status.
        """
        verified_results = []
        for c in citations:
            verified_results.append(cls.verify_single_citation(repo_root, c))
        return verified_results
