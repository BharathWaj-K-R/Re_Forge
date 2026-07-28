"""
Deterministic tools that specialist agents can invoke before finalizing findings.

All tools return a list of dicts with keys:
  - severity: one of Critical, High, Medium, Low
  - title: short finding title
  - description: human-readable explanation
"""

import ast
import logging
import re

logger = logging.getLogger(__name__)


def ast_quick_check(code: str, language: str) -> list[dict]:
    """
    Parse Python code with the ast module and surface syntax errors or
    risky patterns (bare except, eval/exec). For non-Python languages,
    return an empty list.
    """

    findings = []
    normalized_language = language.lower().strip()

    if normalized_language != "python":
        return findings

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        logger.debug("ast_quick_check syntax error: %s", e)
        return [{
            "severity": "High",
            "title": "Python Syntax Error",
            "description": f"The code could not be parsed: {e.msg} at line {e.lineno}."
        }]

    for node in ast.walk(tree):
        if isinstance(node, ast.Try):
            for handler in node.handlers:
                if handler.type is None:
                    findings.append({
                        "severity": "Medium",
                        "title": "Bare Except Clause",
                        "description": "A bare `except:` catches every exception including KeyboardInterrupt and SystemExit, which can hide bugs and make debugging harder."
                    })

        if isinstance(node, ast.Call):
            func = node.func
            name = None
            if isinstance(func, ast.Name):
                name = func.id
            elif isinstance(func, ast.Attribute):
                name = func.attr

            if name in ("eval", "exec"):
                findings.append({
                    "severity": "High",
                    "title": f"Dangerous {name}() Usage",
                    "description": f"Using {name}() on untrusted input can lead to arbitrary code execution. Consider safer alternatives."
                })

    return findings


def detect_hardcoded_secrets(code: str) -> list[dict]:
    """
    Simple regex scan for common secret-like patterns.
    """

    findings = []
    patterns = [
        (r"(?i)(password|passwd|pwd)\s*=\s*['\"][^'\"]+['\"]", "Hardcoded Password"),
        (r"(?i)(api[_-]?key|apikey)\s*=\s*['\"][^'\"]+['\"]", "Hardcoded API Key"),
        (r"(?i)(secret[_-]?key|secret)\s*=\s*['\"][^'\"]+['\"]", "Hardcoded Secret"),
        (r"(?i)(token|access_token)\s*=\s*['\"][^'\"]+['\"]", "Hardcoded Token"),
    ]

    for pattern, title in patterns:
        for match in re.finditer(pattern, code):
            line = code[:match.start()].count("\n") + 1
            findings.append({
                "severity": "High",
                "title": title,
                "description": f"Possible hardcoded credential detected around line {line}. Move secrets to environment variables or a secure vault."
            })

    return findings


def detect_infinite_loops(code: str, language: str) -> list[dict]:
    """
    Heuristic scan for `while True:` loops that lack an obvious break/return
    in the same block. Only meaningful for Python/C-like syntax.
    """

    findings = []
    normalized_language = language.lower().strip()

    if normalized_language not in ("python", "c", "c++", "java", "javascript"):
        return findings

    lines = code.splitlines()
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip().lower()
        if "while true" in stripped or "while(true)" in stripped or "while (true)" in stripped:
            block_text = "\n".join(lines[idx:idx + 30])
            has_exit = any(kw in block_text for kw in ("break", "return", "sys.exit"))
            if not has_exit:
                findings.append({
                    "severity": "High",
                    "title": "Potential Infinite Loop",
                    "description": f"`while True` at line {idx} has no visible break or return in the following lines. Verify the loop terminates."
                })

    return findings
