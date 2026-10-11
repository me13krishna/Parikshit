import re
import aiosqlite
from typing import List, Dict, Any, Optional
from app.db.database import get_db_path
from app.core.logging import logger

class RetrievalService:
    SECRET_PATTERNS = [
        re.compile(r"AKIA[0-9A-Z]{16}"),
        re.compile(r"(?i)(api[_-]?key|secret[_-]?key|token|password|auth[_-]?token|private[_-]?key)\s*[:=]\s*['\"][a-zA-Z0-9_\-\.]{8,}['\"]"),
        re.compile(r"-----BEGIN [A-Z0-9_\- ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9_\- ]+PRIVATE KEY-----"),
        re.compile(r"Bearer\s+[a-zA-Z0-9_\-\.]{16,}")
    ]

    @classmethod
    def redact_secrets(cls, text: str) -> str:
        """
        Redacts common credentials, tokens, and private keys to protect against secret leakage in LLM contexts.
        """
        if not text:
            return text
        redacted = text
        for pat in cls.SECRET_PATTERNS:
            redacted = pat.sub("[REDACTED_SECRET]", redacted)
        return redacted
    @classmethod
    async def retrieve(cls, revision_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Hybrid search combining FTS5 full-text matching and symbol definitions.
        Returns ranked code excerpts with file path, line numbers, and snippet content.
        """
        db_path = get_db_path()
        results: List[Dict[str, Any]] = []

        # Sanitize query for FTS5 (remove special characters that break MATCH)
        clean_query = "".join(c if c.isalnum() or c.isspace() else " " for c in query).strip()
        fts_terms = " OR ".join(clean_query.split()) if clean_query else ""

        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row

            # 1. First, search symbols matching the query
            cursor = await db.execute(
                """
                SELECT s.name, s.kind, s.start_line, s.end_line, f.path, f.id as file_id
                FROM symbols s
                JOIN files f ON s.file_id = f.id
                WHERE f.revision_id = ? AND s.name LIKE ?
                LIMIT ?;
                """,
                (revision_id, f"%{clean_query[:30]}%", limit)
            )
            symbol_rows = await cursor.fetchall()
            for row in symbol_rows:
                # Fetch snippet from chunk or file
                chk_cursor = await db.execute(
                    """
                    SELECT content, start_line, end_line FROM chunks
                    WHERE file_id = ? AND start_line <= ? AND end_line >= ?
                    LIMIT 1;
                    """,
                    (row["file_id"], row["start_line"], row["end_line"])
                )
                chk_row = await chk_cursor.fetchone()
                snippet = chk_row["content"] if chk_row else f"# Symbol {row['name']}"
                results.append({
                    "path": row["path"],
                    "start_line": row["start_line"],
                    "end_line": row["end_line"],
                    "kind": "symbol",
                    "name": row["name"],
                    "content": cls.redact_secrets(snippet),
                    "score": 1.0
                })

            # 2. Second, search FTS5 if we have query terms
            if fts_terms and len(results) < limit:
                try:
                    cursor = await db.execute(
                        """
                        SELECT fts.file_path, fts.content, c.start_line, c.end_line, rank
                        FROM fts_code fts
                        JOIN chunks c ON fts.chunk_id = c.id
                        JOIN files f ON c.file_id = f.id
                        WHERE f.revision_id = ? AND fts_code MATCH ?
                        ORDER BY rank
                        LIMIT ?;
                        """,
                        (revision_id, fts_terms, limit - len(results))
                    )
                    fts_rows = await cursor.fetchall()
                    for r in fts_rows:
                        # Avoid duplicates
                        if not any(item["path"] == r["file_path"] and item["start_line"] == r["start_line"] for item in results):
                            results.append({
                                "path": r["file_path"],
                                "start_line": r["start_line"],
                                "end_line": r["end_line"],
                                "kind": "fts_match",
                                "name": "",
                                "content": cls.redact_secrets(r["content"]),
                                "score": 0.8
                            })
                except Exception as e:
                    logger.warning(f"FTS search fallback query error: {e}")

            # 3. Fallback: if still empty, pull top important files
            if not results:
                cursor = await db.execute(
                    """
                    SELECT f.path, c.start_line, c.end_line, c.content
                    FROM files f
                    JOIN chunks c ON c.file_id = f.id
                    WHERE f.revision_id = ?
                    ORDER BY f.importance_score DESC, c.start_line ASC
                    LIMIT ?;
                    """,
                    (revision_id, limit)
                )
                fallback_rows = await cursor.fetchall()
                for r in fallback_rows:
                    results.append({
                        "path": r["path"],
                        "start_line": r["start_line"],
                        "end_line": r["end_line"],
                        "kind": "important_file",
                        "name": "",
                        "content": cls.redact_secrets(r["content"]),
                        "score": 0.5
                    })

        return results[:limit]
