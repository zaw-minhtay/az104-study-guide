#!/usr/bin/env python3
"""Pre-generate AI explanations for every AZ-104 practice question.

Reads data.js, calls the Anthropic Messages API once per question that has a
known answer, and writes the results to explanations.js as
`window.AZ104_EXPLANATIONS = {"<id>": "...", ...};` so the static site can
load it with a plain <script> tag (no server, no fetch, no API key at
runtime).

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python3 scripts/generate_explanations.py

Re-running resumes: questions that already have an explanation in
explanations.js are skipped. Progress is checkpointed every 20 completions,
so it's safe to interrupt and resume.

Env vars:
    ANTHROPIC_API_KEY   required
    EXPLAIN_MODEL       default: claude-haiku-4-5-20251001
    EXPLAIN_WORKERS     default: 5 (parallel requests)
    EXPLAIN_LIMIT       optional: cap number of questions processed (testing)
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS = os.path.join(ROOT, "data.js")
OUT_JS = os.path.join(ROOT, "explanations.js")

MODEL = os.environ.get("EXPLAIN_MODEL", "claude-haiku-4-5-20251001")
API_KEY = os.environ.get("ANTHROPIC_API_KEY")
MAX_WORKERS = int(os.environ.get("EXPLAIN_WORKERS", "5"))
LIMIT = os.environ.get("EXPLAIN_LIMIT")
MAX_TOKENS = 400


def load_js_object(path, var_name):
    text = open(path, encoding="utf-8").read()
    m = re.match(rf"\s*window\.{var_name}\s*=\s*(.*);\s*$", text, re.S)
    if not m:
        sys.exit(f"Could not parse {path} (expected window.{var_name} = ...;)")
    return json.loads(m.group(1))


def load_existing_explanations():
    if not os.path.exists(OUT_JS):
        return {}
    try:
        return load_js_object(OUT_JS, "AZ104_EXPLANATIONS")
    except SystemExit:
        return {}


def build_prompt(q):
    if q["options"]:
        opts = "\n".join(f"{o['label']}. {o['text']}" for o in q["options"])
        options_block = f"Options:\n{opts}\n"
    else:
        options_block = (
            "(This is a drag-and-drop/hotspot question with no lettered options; "
            "the correct answer is given below as free text.)\n"
        )
    answer = (q.get("answer") or ", ".join(q.get("answer_letters", []))).strip()
    return (
        "You are an AZ-104 (Microsoft Azure Administrator Associate) exam tutor.\n\n"
        f"Question:\n{q['prompt']}\n\n"
        f"{options_block}\n"
        f"Correct answer: {answer}\n\n"
        "Write a concise explanation (3-5 sentences, plain text, no markdown "
        "headers or bullet lists) of why this answer is correct. If there were "
        "lettered options, briefly say why the other options are wrong or less "
        "suitable. Be technically precise about the relevant Azure services and "
        "concepts."
    )


def call_claude(prompt, retries=5):
    body = json.dumps(
        {
            "model": MODEL,
            "max_tokens": MAX_TOKENS,
            "messages": [{"role": "user", "content": prompt}],
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
        },
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())
                return "".join(
                    b["text"] for b in data["content"] if b.get("type") == "text"
                ).strip()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 529) and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            detail = e.read().decode(errors="replace")
            raise RuntimeError(f"HTTP {e.code}: {detail[:300]}")
    raise RuntimeError("exhausted retries")


def save(explanations):
    tmp = OUT_JS + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("window.AZ104_EXPLANATIONS = ")
        json.dump(explanations, f, ensure_ascii=False, sort_keys=True)
        f.write(";\n")
    os.replace(tmp, OUT_JS)


def main():
    if not API_KEY:
        sys.exit("Set ANTHROPIC_API_KEY in your environment first.")

    questions = load_js_object(DATA_JS, "AZ104_QUESTIONS")
    explanations = load_existing_explanations()

    todo = [
        q
        for q in questions
        if str(q["id"]) not in explanations and (q.get("answer") or "").strip()
    ]
    if LIMIT:
        todo = todo[: int(LIMIT)]

    skipped_no_answer = sum(
        1
        for q in questions
        if str(q["id"]) not in explanations and not (q.get("answer") or "").strip()
    )
    print(
        f"{len(questions)} questions total, {len(explanations)} already have "
        f"explanations, {len(todo)} to generate, {skipped_no_answer} skipped "
        "(no known answer)"
    )
    if not todo:
        print("Nothing to do.")
        return

    def worker(q):
        try:
            text = call_claude(build_prompt(q))
            return q["id"], text, None
        except Exception as e:
            return q["id"], None, str(e)

    done = 0
    failed = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = [ex.submit(worker, q) for q in todo]
        for fut in as_completed(futures):
            qid, text, err = fut.result()
            if text:
                explanations[str(qid)] = text
                done += 1
                if done % 20 == 0:
                    save(explanations)
                    print(f"  progress: {done}/{len(todo)} (checkpoint saved)")
            else:
                failed.append(qid)
                print(f"  failed id={qid}: {err}")

    save(explanations)
    print(f"Done. {len(explanations)}/{len(questions)} explanations saved to {OUT_JS}")
    if failed:
        print(f"{len(failed)} question(s) failed, re-run the script to retry them: {failed}")


if __name__ == "__main__":
    main()
