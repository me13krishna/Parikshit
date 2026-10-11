#!/usr/bin/env python3
"""
Parikshit Ledger Verification Utility (CLI)
Verifies hash-chained ledger entries across global and project chains.
Returns exit code 0 on success (intact), 1 on verification failure.
"""

import sys
import os
import json
import asyncio
import argparse
from pathlib import Path

# Add backend directory to sys.path so app imports work
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.services.ledger_service import LedgerService
from app.core.config import settings

async def main():
    parser = argparse.ArgumentParser(description="Parikshit Cryptographic Ledger Verifier")
    parser.add_argument("--project-id", type=str, default=None, help="Specific project ID to verify (verifies all chains if omitted)")
    parser.add_argument("--export", type=str, default=None, help="Path to export evidence pack JSON")
    parser.add_argument("--json", action="store_true", help="Output verification report as JSON")
    parser.add_argument("--db-path", type=str, default=None, help="Path to SQLite database file")

    args = parser.parse_args()

    if args.db_path:
        settings.PARIKSHIT_DB_URL = f"sqlite:///{Path(args.db_path).resolve()}"
    else:
        candidate_paths = [
            backend_dir / "data" / "parikshit.db",
            Path.cwd() / "backend" / "data" / "parikshit.db",
            Path.cwd() / "data" / "parikshit.db"
        ]
        for cp in candidate_paths:
            if cp.exists():
                settings.PARIKSHIT_DB_URL = f"sqlite:///{cp.resolve()}"
                break

    report = await LedgerService.verify_chain(project_id=args.project_id)

    if args.export:
        pack = await LedgerService.export_evidence_pack(project_id=args.project_id)
        out_path = Path(args.export).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(pack, f, indent=2)
        print(f"[*] Evidence pack exported successfully to {out_path}")

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("=" * 60)
        print("   PARIKSHIT LEDGER CRYPTOGRAPHIC VERIFICATION REPORT")
        print("=" * 60)
        if "global_chain" in report:
            print(f"Overall Status   : {'[PASS] VALID' if report['valid'] else '[FAIL] COMPROMISED'}")
            print(f"Total Entries    : {report['total_entries']}")
            g = report["global_chain"]
            print(f"Global Chain     : {'PASS' if g['valid'] else 'FAIL'} ({g['count']} entries, head: {g.get('latest_hash', 'None')[:16]}...)")
            for pid, pres in report.get("project_chains", {}).items():
                status_str = "PASS" if pres["valid"] else f"FAIL (broken at seq {pres.get('broken_at_sequence')})"
                print(f"Project [{pid}]: {status_str} ({pres['count']} entries, head: {pres.get('latest_hash', 'None')[:16]}...)")
        else:
            status_str = "PASS" if report["valid"] else f"FAIL (broken at seq {report.get('broken_at_sequence')})"
            print(f"Chain Status     : {status_str}")
            print(f"Entries Checked  : {report['count']}")
            print(f"Head Hash        : {report.get('latest_hash', 'None')}")
            if not report["valid"]:
                print(f"Error Detail     : {report.get('error')}")
        print("=" * 60)

    sys.exit(0 if report["valid"] else 1)

if __name__ == "__main__":
    asyncio.run(main())
