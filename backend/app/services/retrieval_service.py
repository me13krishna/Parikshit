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
    @staticmethod
    def _cosine_similarity(a: List[float], b: List[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    @classmethod
    async def retrieve(cls, revision_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Hybrid search combining FTS5 full-text matching, symbol definitions,
        and semantic vector embedding re-ranking.
        Returns ranked code excerpts with file path, line numbers, snippet content, and scores.
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

        # 4. Dense semantic vector re-ranking
        if results and clean_query:
            try:
                from app.agents.llm_gateway import LLMGateway
                texts_to_embed = [clean_query] + [r["content"][:400] for r in results]
                embeddings = await LLMGateway.embed_text(texts_to_embed)
                if len(embeddings) == len(texts_to_embed):
                    q_vec = embeddings[0]
                    for idx, r in enumerate(results):
                        sim = cls._cosine_similarity(q_vec, embeddings[idx + 1])
                        # Blended score: 60% lexical/symbol score + 40% dense semantic similarity
                        r["score"] = round(0.6 * r["score"] + 0.4 * max(0.0, sim), 3)
                    results.sort(key=lambda x: x["score"], reverse=True)
            except Exception as e:
                logger.debug(f"Semantic re-ranking note: {e}")

        return results[:limit]
