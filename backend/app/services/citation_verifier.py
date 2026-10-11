import os
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.core.logging import logger

MAX_SNIPPET_LINES = 200
MAX_SNIPPET_BYTES = 64 * 1024

class CitationVerifier:
    @staticmethod
    def verify_single_citation(
        repo_root: Path,
        citation: Dict[str, Any],
        expected_commit_sha: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Server-side validation of a code citation against real files on disk.
        Protects against path traversal, type errors, hallucinated line ranges, and SHA mismatches.
        """
        rel_path = str(citation.get("path", "")).strip().replace("\\", "/")

        # 1. Type validation and line clamping
        try:
            start_line = int(citation.get("start_line", 1))
            end_line = int(citation.get("end_line", start_line))
        except (ValueError, TypeError):
            return {**citation, "verified": False, "error": "start_line and end_line must be valid integers"}

        # 2. Commit SHA validation when provided
        given_sha = citation.get("commit_sha")
        if given_sha and expected_commit_sha:
            if given_sha.strip().lower() != expected_commit_sha.strip().lower():
                return {
                    **citation,
                    "verified": False,
                    "error": f"Commit SHA mismatch: expected {expected_commit_sha}, got {given_sha}"
                }

        # 3. Path safety check
        target_file = (repo_root / rel_path).resolve()
        try:
            target_file.relative_to(repo_root.resolve())
        except ValueError:
            logger.warning(f"Citation path traversal attempt or escape: {rel_path}")
            return {**citation, "verified": False, "error": "Path escapes repository boundary"}

        # 4. File existence check
        if not target_file.is_file():
            return {**citation, "verified": False, "error": f"File does not exist: {rel_path}"}

        # 5. Line range check and snippet bounds
        try:
            with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            total_lines = len(lines)
            if total_lines == 0:
                return {**citation, "verified": False, "error": f"File is empty: {rel_path}"}

            if start_line < 1 or start_line > total_lines or end_line < start_line or end_line > total_lines:
                return {
                    **citation,
                    "verified": False,
                    "error": f"Invalid line range {start_line}-{end_line} (file has {total_lines} lines)"
                }

            # Cap snippet size to prevent excessive memory/payload
            if (end_line - start_line + 1) > MAX_SNIPPET_LINES:
                end_line = start_line + MAX_SNIPPET_LINES - 1

            snippet_lines = lines[start_line - 1 : end_line]
            snippet_text = "".join(snippet_lines)[:MAX_SNIPPET_BYTES]
            snippet_hash = hashlib.sha256(snippet_text.encode("utf-8")).hexdigest()

            return {
                "path": rel_path,
                "start_line": start_line,
                "end_line": end_line,
                "commit_sha": given_sha or expected_commit_sha or "",
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
        citations: List[Dict[str, Any]],
        expected_commit_sha: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Verifies a list of citations against disk and revision SHA.
        """
        verified_results = []
        for c in citations:
            verified_results.append(cls.verify_single_citation(repo_root, c, expected_commit_sha=expected_commit_sha))
        return verified_results
