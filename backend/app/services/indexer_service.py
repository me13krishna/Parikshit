import os
import ast
import re
import uuid
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import aiosqlite

from app.core.logging import logger
from app.db.database import get_db_path
from app.services.ledger_service import LedgerService

_TS_PY_PARSER = None
_TS_JS_PARSER = None

def _get_ts_parsers():
    global _TS_PY_PARSER, _TS_JS_PARSER
    if _TS_PY_PARSER is None or _TS_JS_PARSER is None:
        try:
            from tree_sitter import Language, Parser
            import tree_sitter_python as tspy
            import tree_sitter_javascript as tsjs
            _TS_PY_PARSER = Parser(Language(tspy.language()))
            _TS_JS_PARSER = Parser(Language(tsjs.language()))
        except Exception as e:
            logger.debug(f"Tree-sitter parser initialization deferred or unavailable: {e}")
    return _TS_PY_PARSER, _TS_JS_PARSER

class IndexerService:
    @classmethod
    async def index_revision(cls, revision_id: str) -> Dict[str, Any]:
        """
        Indexes all files, symbols, chunks, and import edges in a revision.
        Populates FTS5 virtual table for lightning-fast retrieval.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM repo_revisions WHERE id = ?;", (revision_id,))
            rev = await cursor.fetchone()
            if not rev:
                raise ValueError(f"Revision {revision_id} not found")

            storage_path = Path(rev["storage_path"])
            project_id = rev["project_id"]

            # Update status to running
            await db.execute("UPDATE repo_revisions SET index_status = 'running' WHERE id = ?;", (revision_id,))
            await db.commit()

            # Clean up any previous indexing data for this revision to support idempotent re-indexing
            await db.execute("DELETE FROM edges WHERE revision_id = ?;", (revision_id,))
            await db.execute("DELETE FROM symbols WHERE file_id IN (SELECT id FROM files WHERE revision_id = ?);", (revision_id,))
            await db.execute("DELETE FROM chunks WHERE file_id IN (SELECT id FROM files WHERE revision_id = ?);", (revision_id,))
            await db.execute("DELETE FROM files WHERE revision_id = ?;", (revision_id,))
            await db.commit()

        logger.info(f"Indexing revision {revision_id} at {storage_path}...")

        total_files = 0
        total_chunks = 0
        total_symbols = 0
        total_edges = 0

        SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", "venv", ".next", "dist", "build"}

        async with aiosqlite.connect(db_path) as db:
            for root, dirs, files in os.walk(storage_path):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for file_name in files:
                    full_path = Path(root) / file_name
                    rel_path = str(full_path.relative_to(storage_path)).replace("\\", "/")

                    # Classify file
                    kind, importance = cls._classify_file(rel_path)
                    try:
                        content_bytes = full_path.read_bytes()
                    except Exception:
                        continue

                    size_bytes = len(content_bytes)
                    content_sha = hashlib.sha256(content_bytes).hexdigest()
                    ext = full_path.suffix.lower()
                    lang = cls._get_language(ext)

                    try:
                        content_str = content_bytes.decode("utf-8")
                        line_count = len(content_str.splitlines())
                        is_binary = 0
                    except UnicodeDecodeError:
                        content_str = ""
                        line_count = 0
                        is_binary = 1

                    file_id = f"fil_{uuid.uuid4().hex[:12]}"

                    # Insert file safely
                    await db.execute(
                        """
                        INSERT OR REPLACE INTO files (
                            id, revision_id, path, language, size_bytes, line_count,
                            content_sha256, kind, importance_score, is_binary, is_ignored
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
                        """,
                        (file_id, revision_id, rel_path, lang, size_bytes, line_count, content_sha, kind, importance, is_binary)
                    )
                    total_files += 1

                    if is_binary or not content_str:
                        continue

                    # Parse symbols and chunks
                    file_chunks, file_symbols, import_edges = cls._extract_code_elements(
                        file_id, rel_path, content_str, lang
                    )

                    for chk in file_chunks:
                        chk_id = f"chk_{uuid.uuid4().hex[:12]}"
                        c_hash = hashlib.sha256(chk["content"].encode("utf-8")).hexdigest()
                        await db.execute(
                            """
                            INSERT INTO chunks (id, file_id, start_line, end_line, content, content_hash)
                            VALUES (?, ?, ?, ?, ?, ?);
                            """,
                            (chk_id, file_id, chk["start_line"], chk["end_line"], chk["content"], c_hash)
                        )
                        # FTS5 index
                        await db.execute(
                            "INSERT INTO fts_code (chunk_id, file_path, content) VALUES (?, ?, ?);",
                            (chk_id, rel_path, chk["content"])
                        )
                        total_chunks += 1

                    for sym in file_symbols:
                        sym_id = f"sym_{uuid.uuid4().hex[:12]}"
                        await db.execute(
                            """
                            INSERT INTO symbols (id, file_id, name, kind, start_line, end_line, signature, docstring)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                            """,
                            (sym_id, file_id, sym["name"], sym["kind"], sym["start_line"], sym["end_line"], sym.get("signature"), sym.get("docstring"))
                        )
                        total_symbols += 1

                    for edge in import_edges:
                        edge_id = f"edg_{uuid.uuid4().hex[:12]}"
                        await db.execute(
                            """
                            INSERT INTO edges (id, revision_id, edge_type, evidence)
                            VALUES (?, ?, 'import', ?);
                            """,
                            (edge_id, revision_id, json.dumps({"from": rel_path, "imported": edge}))
                        )
                        total_edges += 1

            # Mark revision complete
            now_iso = datetime.now(timezone.utc).isoformat()
            await db.execute(
                "UPDATE repo_revisions SET index_status = 'complete', indexed_at = ? WHERE id = ?;",
                (now_iso, revision_id)
            )
            await db.commit()

        # Append to Ledger
        await LedgerService.append_entry(
            event_type="project_indexed",
            project_id=project_id,
            payload={
                "project_id": project_id,
                "revision_id": revision_id,
                "total_files": total_files,
                "total_chunks": total_chunks,
                "total_symbols": total_symbols,
                "total_edges": total_edges
            },
            related_ids={"project_id": project_id, "revision_id": revision_id}
        )

        logger.info(f"Indexed revision {revision_id}: {total_files} files, {total_chunks} chunks, {total_symbols} symbols")
        return {
            "revision_id": revision_id,
            "status": "complete",
            "files": total_files,
            "chunks": total_chunks,
            "symbols": total_symbols,
            "edges": total_edges
        }

    @staticmethod
    def _classify_file(rel_path: str) -> Tuple[str, float]:
        path_lower = rel_path.lower()
        if "test" in path_lower or path_lower.startswith("tests/"):
            return "test", 0.7
        if "readme" in path_lower or "docs/" in path_lower:
            return "doc", 0.6
        if any(path_lower.endswith(cfg) for cfg in [".json", ".yaml", ".yml", ".toml", ".ini", "dockerfile"]):
            return "config", 0.5
        if any(entry in path_lower for entry in ["main.py", "app.py", "index.ts", "index.js", "server.py"]):
            return "source", 1.0
        return "source", 0.4

    @staticmethod
    def _get_language(ext: str) -> str:
        MAP = {
            ".py": "python",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".js": "javascript",
            ".jsx": "javascript",
            ".json": "json",
            ".md": "markdown",
            ".html": "html",
            ".css": "css",
            ".sql": "sql",
            ".go": "go",
            ".rs": "rust",
            ".java": "java",
            ".c": "c",
            ".cpp": "cpp",
            ".cc": "cpp",
            ".h": "c",
            ".hpp": "cpp",
            ".rb": "ruby",
            ".php": "php",
            ".sh": "shell",
            ".yaml": "yaml",
            ".yml": "yaml",
            ".toml": "toml",
        }
        return MAP.get(ext, "other")

    @classmethod
    def _extract_code_elements(cls, file_id: str, file_path: str, content: str, lang: str):
        lines = content.splitlines()
        chunks = []
        symbols = []
        imports = []

        py_parser, js_parser = _get_ts_parsers()

        if lang == "python":
            parsed_with_ts = False
            if py_parser is not None:
                try:
                    tree = py_parser.parse(content.encode("utf-8"))
                    for node in tree.root_node.children:
                        if node.type in ("function_definition", "class_definition"):
                            name_node = node.child_by_field_name("name")
                            if name_node:
                                sym_name = name_node.text.decode("utf-8")
                                start = node.start_point.row + 1
                                end = node.end_point.row + 1
                                kind = "function" if node.type == "function_definition" else "class"
                                sig = f"def {sym_name}(...)" if kind == "function" else f"class {sym_name}"
                                snippet = "\n".join(lines[start - 1 : end])
                                symbols.append({
                                    "name": sym_name,
                                    "kind": kind,
                                    "start_line": start,
                                    "end_line": end,
                                    "signature": sig,
                                    "docstring": None
                                })
                                chunks.append({"start_line": start, "end_line": end, "content": snippet})

                        elif node.type == "import_statement":
                            for ch in node.children:
                                if ch.type == "dotted_name":
                                    imports.append(ch.text.decode("utf-8"))
                        elif node.type == "import_from_statement":
                            mod = node.child_by_field_name("module_name")
                            if mod:
                                imports.append(mod.text.decode("utf-8"))
                    parsed_with_ts = True
                except Exception as e:
                    logger.debug(f"Tree-sitter python parsing fallback: {e}")

            if not parsed_with_ts or not symbols:
                # Python AST fallback
                try:
                    tree = ast.parse(content)
                    for node in ast.walk(tree):
                        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            start = node.lineno
                            end = getattr(node, "end_lineno", start + len(node.body))
                            snippet = "\n".join(lines[start - 1 : end])
                            doc = ast.get_docstring(node)
                            sig = f"def {node.name}(...)"
                            if not any(s["name"] == node.name and s["start_line"] == start for s in symbols):
                                symbols.append({"name": node.name, "kind": "function", "start_line": start, "end_line": end, "signature": sig, "docstring": doc})
                                chunks.append({"start_line": start, "end_line": end, "content": snippet})

                        elif isinstance(node, ast.ClassDef):
                            start = node.lineno
                            end = getattr(node, "end_lineno", start + len(node.body))
                            snippet = "\n".join(lines[start - 1 : end])
                            doc = ast.get_docstring(node)
                            if not any(s["name"] == node.name and s["start_line"] == start for s in symbols):
                                symbols.append({"name": node.name, "kind": "class", "start_line": start, "end_line": end, "signature": f"class {node.name}", "docstring": doc})
                                chunks.append({"start_line": start, "end_line": end, "content": snippet})

                        elif isinstance(node, ast.Import):
                            for alias in node.names:
                                if alias.name not in imports:
                                    imports.append(alias.name)
                        elif isinstance(node, ast.ImportFrom):
                            if node.module and node.module not in imports:
                                imports.append(node.module)
                except Exception:
                    pass

        elif lang in ["typescript", "javascript"]:
            parsed_with_ts = False
            if js_parser is not None:
                try:
                    tree = js_parser.parse(content.encode("utf-8"))
                    for node in tree.root_node.children:
                        target = node
                        if node.type == "export_statement":
                            for child in node.children:
                                if child.type in ("function_declaration", "class_declaration", "lexical_declaration"):
                                    target = child
                                    break

                        if target.type == "function_declaration":
                            n = target.child_by_field_name("name")
                            if n:
                                name_str = n.text.decode("utf-8")
                                start = target.start_point.row + 1
                                end = target.end_point.row + 1
                                symbols.append({
                                    "name": name_str,
                                    "kind": "function",
                                    "start_line": start,
                                    "end_line": end,
                                    "signature": f"function {name_str}(...)"
                                })
                                chunks.append({"start_line": start, "end_line": end, "content": "\n".join(lines[start - 1 : end])})

                        elif target.type == "class_declaration":
                            n = target.child_by_field_name("name")
                            if n:
                                name_str = n.text.decode("utf-8")
                                start = target.start_point.row + 1
                                end = target.end_point.row + 1
                                symbols.append({
                                    "name": name_str,
                                    "kind": "class",
                                    "start_line": start,
                                    "end_line": end,
                                    "signature": f"class {name_str}"
                                })
                                chunks.append({"start_line": start, "end_line": end, "content": "\n".join(lines[start - 1 : end])})
                                body = target.child_by_field_name("body")
                                if body:
                                    for m in body.children:
                                        if m.type == "method_definition":
                                            mn = m.child_by_field_name("name")
                                            if mn:
                                                m_start = m.start_point.row + 1
                                                m_end = m.end_point.row + 1
                                                symbols.append({
                                                    "name": f"{name_str}.{mn.text.decode('utf-8')}",
                                                    "kind": "method",
                                                    "start_line": m_start,
                                                    "end_line": m_end,
                                                    "signature": f"{name_str}.{mn.text.decode('utf-8')}()"
                                                })

                        elif target.type == "lexical_declaration":
                            for decl in target.children:
                                if decl.type == "variable_declarator":
                                    val = decl.child_by_field_name("value")
                                    if val and val.type in ("arrow_function", "function_expression"):
                                        n = decl.child_by_field_name("name")
                                        if n:
                                            name_str = n.text.decode("utf-8")
                                            start = target.start_point.row + 1
                                            end = target.end_point.row + 1
                                            symbols.append({
                                                "name": name_str,
                                                "kind": "function",
                                                "start_line": start,
                                                "end_line": end,
                                                "signature": f"const {name_str} = () => ..."
                                            })
                                            chunks.append({"start_line": start, "end_line": end, "content": "\n".join(lines[start - 1 : end])})

                        elif target.type == "import_statement":
                            src = target.child_by_field_name("source")
                            if src:
                                imports.append(src.text.decode("utf-8").strip("'\""))

                    parsed_with_ts = True
                except Exception as e:
                    logger.debug(f"Tree-sitter JS/TS parsing fallback: {e}")

            if not parsed_with_ts or not symbols:
                # Fast regex fallback for JS/TS
                fn_matches = re.finditer(r"(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)", content)
                for m in fn_matches:
                    line_no = content[:m.start()].count("\n") + 1
                    end_no = min(line_no + 15, len(lines))
                    symbols.append({"name": m.group(1), "kind": "function", "start_line": line_no, "end_line": end_no})
                    chunks.append({"start_line": line_no, "end_line": end_no, "content": "\n".join(lines[line_no - 1 : end_no])})

                arrow_matches = re.finditer(r"(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>", content)
                for m in arrow_matches:
                    line_no = content[:m.start()].count("\n") + 1
                    end_no = min(line_no + 15, len(lines))
                    if not any(s["name"] == m.group(1) for s in symbols):
                        symbols.append({"name": m.group(1), "kind": "function", "start_line": line_no, "end_line": end_no})
                        chunks.append({"start_line": line_no, "end_line": end_no, "content": "\n".join(lines[line_no - 1 : end_no])})

                class_matches = re.finditer(r"(?:export\s+)?class\s+([a-zA-Z0-9_$]+)", content)
                for m in class_matches:
                    line_no = content[:m.start()].count("\n") + 1
                    end_no = min(line_no + 20, len(lines))
                    if not any(s["name"] == m.group(1) for s in symbols):
                        symbols.append({"name": m.group(1), "kind": "class", "start_line": line_no, "end_line": end_no})
                        chunks.append({"start_line": line_no, "end_line": end_no, "content": "\n".join(lines[line_no - 1 : end_no])})

                imp_matches = re.finditer(r"import\s+.*?\s+from\s+['\"](.*?)['\"]", content)
                for m in imp_matches:
                    imports.append(m.group(1))

        elif lang == "go":
            fn_matches = re.finditer(r"func\s+(?:\([^)]*\)\s+)?([a-zA-Z0-9_]+)\s*\(", content)
            for m in fn_matches:
                line_no = content[:m.start()].count("\n") + 1
                end_no = min(line_no + 20, len(lines))
                symbols.append({"name": m.group(1), "kind": "function", "start_line": line_no, "end_line": end_no, "signature": f"func {m.group(1)}(...)"})
                chunks.append({"start_line": line_no, "end_line": end_no, "content": "\n".join(lines[line_no - 1 : end_no])})
            imp_matches = re.finditer(r"import\s+(?:\((.*?)\)|\"([^\"]+)\")", content, re.DOTALL)
            for m in imp_matches:
                if m.group(2):
                    imports.append(m.group(2))
                elif m.group(1):
                    for imp_line in m.group(1).splitlines():
                        clean_imp = imp_line.strip().strip('"')
                        if clean_imp:
                            imports.append(clean_imp)

        elif lang == "rust":
            fn_matches = re.finditer(r"(?:pub\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]*>)?\s*\(", content)
            for m in fn_matches:
                line_no = content[:m.start()].count("\n") + 1
                end_no = min(line_no + 20, len(lines))
                symbols.append({"name": m.group(1), "kind": "function", "start_line": line_no, "end_line": end_no, "signature": f"fn {m.group(1)}(...)"})
                chunks.append({"start_line": line_no, "end_line": end_no, "content": "\n".join(lines[line_no - 1 : end_no])})
            struct_matches = re.finditer(r"(?:pub\s+)?(?:struct|enum|trait)\s+([a-zA-Z0-9_]+)", content)
            for m in struct_matches:
                line_no = content[:m.start()].count("\n") + 1
                end_no = min(line_no + 25, len(lines))
                symbols.append({"name": m.group(1), "kind": "class", "start_line": line_no, "end_line": end_no, "signature": f"struct {m.group(1)}"})
                chunks.append({"start_line": line_no, "end_line": end_no, "content": "\n".join(lines[line_no - 1 : end_no])})

        elif lang in ("java", "c", "cpp"):
            class_matches = re.finditer(r"(?:public|protected|private)?\s*(?:static\s*)?(?:class|interface|struct)\s+([a-zA-Z0-9_]+)", content)
            for m in class_matches:
                line_no = content[:m.start()].count("\n") + 1
                end_no = min(line_no + 25, len(lines))
                symbols.append({"name": m.group(1), "kind": "class", "start_line": line_no, "end_line": end_no, "signature": f"class {m.group(1)}"})
                chunks.append({"start_line": line_no, "end_line": end_no, "content": "\n".join(lines[line_no - 1 : end_no])})
            fn_matches = re.finditer(r"(?:public|protected|private|static|\s)+[a-zA-Z0-9_<>[\]*&]+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{", content)
            for m in fn_matches:
                if m.group(1) not in ("if", "for", "while", "switch", "catch"):
                    line_no = content[:m.start()].count("\n") + 1
                    end_no = min(line_no + 20, len(lines))
                    symbols.append({"name": m.group(1), "kind": "function", "start_line": line_no, "end_line": end_no, "signature": f"{m.group(1)}(...)"})
                    chunks.append({"start_line": line_no, "end_line": end_no, "content": "\n".join(lines[line_no - 1 : end_no])})

        # If no specific function chunks found or file is small, create full file / block chunks
        if not chunks:
            chunk_size = 50
            for i in range(0, len(lines), chunk_size):
                chunk_lines = lines[i : i + chunk_size]
                if chunk_lines:
                    chunks.append({
                        "start_line": i + 1,
                        "end_line": i + len(chunk_lines),
                        "content": "\n".join(chunk_lines)
                    })

        return chunks, symbols, imports
