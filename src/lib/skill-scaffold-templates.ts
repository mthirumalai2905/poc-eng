// Full scaffold template content for each file in the skill directory

export const SCAFFOLD_FILES: Record<string, string> = {
  "SKILL.md": `# {{SKILL_NAME}}

## Metadata
- **Name**: {{SKILL_NAME}}
- **Version**: 1.0.0
- **Category**: general

## Description
Describe what this skill does and when the orchestration engine should invoke it.

## Prerequisites
- List any dependencies, libraries, or configurations required.

## Instructions

### Step 1: Analyze Request
Parse the user prompt to extract the engineering goal, constraints, and target environment.

### Step 2: Load References
Load all documents from the \`references/\` directory for contextual knowledge.

### Step 3: Apply Templates
Use templates from \`assets/\` directory to generate standardized code artifacts.

### Step 4: Validate Output
Run validation checks against schema conventions, naming standards, and platform rules.

### Step 5: Package Artifacts
Structure the generated files into the expected project layout.

## Output Format
\`\`\`
├── src/
│   ├── handler.py
│   ├── config.py
│   └── utils.py
├── tests/
│   └── test_handler.py
├── deploy/
│   └── template.yaml
└── README.md
\`\`\`

## Quality Checklist
- [ ] Follows platform naming conventions
- [ ] Includes monitoring instrumentation
- [ ] Has input validation
- [ ] Contains error handling
- [ ] Includes deployment configuration
`,

  "LICENSE.txt": `MIT License

Copyright (c) 2026 Engineering AI Platform

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
`,

  "agents/analyzer.md": `# Analyzer Agent

## Purpose
The Analyzer agent is responsible for evaluating the generated code artifacts
for correctness, completeness, and adherence to platform standards.

## Evaluation Criteria

### 1. Structural Completeness
- All required files are present
- Directory structure matches the expected layout
- Configuration files are properly formatted

### 2. Code Quality
- Follows PEP-8 (Python) or language-specific standards
- Functions have proper docstrings
- Error handling is implemented
- Logging is instrumented

### 3. Platform Compliance
- Naming conventions follow platform schema
- Monitoring metrics are emitted (request_count, error_count, latency)
- Input validation is present
- Deployment configuration is valid

## Scoring
Rate each criterion on a 1-5 scale:
- 5: Exceeds standards
- 4: Meets all standards
- 3: Minor issues
- 2: Significant gaps
- 1: Does not meet standards
`,

  "agents/comparator.md": `# Comparator Agent

## Purpose
The Comparator agent compares generated artifacts against reference
implementations and previous skill outputs to ensure consistency.

## Comparison Dimensions

### 1. Schema Alignment
Compare generated schemas against the unified data model:
- Table naming conventions
- Column types and constraints
- Partition strategy alignment
- Metadata field inclusion

### 2. Code Pattern Matching
Compare generated code against approved patterns:
- Handler structure matches template
- Error handling follows standard pattern
- Logging format is consistent
- Metric emission matches specification

### 3. Configuration Drift
Check for deviations from standard configurations:
- Runtime versions
- Memory/timeout settings
- Environment variable naming
- IAM policy scope

## Output Format
Produce a diff-style report highlighting:
- ✅ Matches: Elements that align with standards
- ⚠️ Deviations: Elements that differ but may be acceptable
- ❌ Violations: Elements that must be corrected
`,

  "agents/grader.md": `# Grader Agent

## Purpose
The Grader agent provides a final quality score for generated artifacts
and determines if they are production-ready.

## Grading Rubric

### A (90-100): Production Ready
- All platform standards met
- Comprehensive error handling
- Full monitoring instrumentation
- Complete test coverage
- Deployment configuration validated

### B (80-89): Minor Revisions Needed
- Most standards met
- Minor gaps in error handling or logging
- Tests present but incomplete
- Deployment config needs minor adjustments

### C (70-79): Significant Revisions Needed
- Several standards not met
- Incomplete error handling
- Missing monitoring instrumentation
- Tests need expansion

### D (60-69): Major Rework Required
- Multiple standards violations
- Critical gaps in error handling
- No monitoring instrumentation
- Insufficient tests

### F (<60): Reject and Regenerate
- Fundamental design issues
- Does not follow platform architecture
- Missing critical components

## Decision Matrix
| Grade | Action |
|-------|--------|
| A | Auto-approve for PR |
| B | Flag for quick review |
| C | Return to generation with feedback |
| D | Escalate to skill maintainer |
| F | Reject and log for skill improvement |
`,

  "assets/eval_review.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skill Evaluation Review</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fafafa; padding: 2rem; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 1.5rem; border-bottom: 1px solid #222; padding-bottom: 1rem; }
    .metric { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #1a1a1a; }
    .metric-label { color: #888; }
    .metric-value { font-family: monospace; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    .warn { color: #eab308; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Evaluation Review Dashboard</h1>
    <div id="results">
      <div class="metric">
        <span class="metric-label">Structural Completeness</span>
        <span class="metric-value pass">PASS</span>
      </div>
      <div class="metric">
        <span class="metric-label">Code Quality Score</span>
        <span class="metric-value">4.2 / 5.0</span>
      </div>
      <div class="metric">
        <span class="metric-label">Platform Compliance</span>
        <span class="metric-value pass">PASS</span>
      </div>
      <div class="metric">
        <span class="metric-label">Schema Validation</span>
        <span class="metric-value pass">PASS</span>
      </div>
      <div class="metric">
        <span class="metric-label">Monitoring Coverage</span>
        <span class="metric-value warn">PARTIAL</span>
      </div>
    </div>
  </div>
</body>
</html>
`,

  "eval-viewer/generate_review.py": `#!/usr/bin/env python3
"""
Generate evaluation review HTML from skill execution results.

This script reads the evaluation output from the agents (analyzer, comparator, grader)
and generates a human-readable HTML review page.

Usage:
    python generate_review.py --input eval_results.json --output eval_review.html
"""

import json
import argparse
from pathlib import Path
from datetime import datetime


def load_results(input_path: str) -> dict:
    """Load evaluation results from JSON file."""
    with open(input_path, 'r') as f:
        return json.load(f)


def generate_html(results: dict) -> str:
    """Generate HTML review page from evaluation results."""
    timestamp = datetime.now().isoformat()
    
    metrics_html = ""
    for metric_name, metric_data in results.get("metrics", {}).items():
        score = metric_data.get("score", 0)
        status_class = "pass" if score >= 4 else "warn" if score >= 3 else "fail"
        status_label = "PASS" if score >= 4 else "WARN" if score >= 3 else "FAIL"
        
        metrics_html += f'''
        <div class="metric">
            <span class="metric-label">{metric_name}</span>
            <span class="metric-value {status_class}">{status_label} ({score}/5)</span>
        </div>
        '''
    
    return f"""<!DOCTYPE html>
<html><head><title>Eval Review - {timestamp}</title></head>
<body>{metrics_html}</body></html>"""


def main():
    parser = argparse.ArgumentParser(description="Generate evaluation review")
    parser.add_argument("--input", required=True, help="Input JSON results file")
    parser.add_argument("--output", default="eval_review.html", help="Output HTML file")
    args = parser.parse_args()
    
    results = load_results(args.input)
    html = generate_html(results)
    
    Path(args.output).write_text(html)
    print(f"Review generated: {args.output}")


if __name__ == "__main__":
    main()
`,

  "eval-viewer/viewer.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Skill Eval Viewer</title>
  <style>
    * { margin: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui; background: #09090b; color: #fafafa; }
    .header { padding: 1.5rem 2rem; border-bottom: 1px solid #1e1e1e; }
    .header h1 { font-size: 1.125rem; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 2rem; }
    .card { background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 1.25rem; }
    .card h3 { font-size: 0.875rem; color: #888; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .score { font-size: 2rem; font-weight: 700; font-family: monospace; }
    .score.high { color: #22c55e; }
    .score.mid { color: #eab308; }
    .score.low { color: #ef4444; }
  </style>
</head>
<body>
  <div class="header"><h1>Evaluation Viewer</h1></div>
  <div class="grid">
    <div class="card"><h3>Overall Score</h3><div class="score high">92</div></div>
    <div class="card"><h3>Tests Passed</h3><div class="score high">18/20</div></div>
    <div class="card"><h3>Schema Compliance</h3><div class="score high">100%</div></div>
    <div class="card"><h3>Code Quality</h3><div class="score mid">85</div></div>
  </div>
</body>
</html>
`,

  "references/schemas.md": `# Platform Schema Conventions

## Naming Standards
- Tables: \`snake_case\`, plural (e.g., \`user_events\`, \`order_items\`)
- Columns: \`snake_case\` (e.g., \`created_at\`, \`user_id\`)
- Primary keys: \`id\` (UUID preferred)
- Foreign keys: \`{referenced_table_singular}_id\`

## Required Metadata Fields
Every table MUST include:
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last modification time |
| created_by | VARCHAR(255) | Creator identifier |

## Partition Strategy
- Time-series data: Partition by \`event_date\` (daily)
- High-cardinality: Partition by \`region\` or \`tenant_id\`
- Archive tables: Partition by \`year_month\`

## Relationships
- Always define explicit foreign keys
- Use CASCADE for dependent records
- Use RESTRICT for reference records
- Index all foreign key columns

## Data Types
| Use Case | Recommended Type |
|----------|-----------------|
| Identifiers | UUID |
| Money | DECIMAL(19,4) |
| Timestamps | TIMESTAMPTZ |
| Status flags | VARCHAR(50) with CHECK |
| Large text | TEXT |
| JSON data | JSONB |
`,

  "scripts/__init__.py": `"""
Skill automation scripts package.

This package contains utility scripts for:
- Running evaluations against generated artifacts
- Aggregating benchmark results across skill runs
- Generating quality reports
- Packaging skills for distribution
"""

__version__ = "1.0.0"
__author__ = "Engineering AI Platform"
`,

  "scripts/aggregate_benchmark.py": `#!/usr/bin/env python3
"""
Aggregate benchmark results across multiple skill evaluation runs.

Collects individual eval results and produces summary statistics
for tracking skill quality over time.
"""

import json
import glob
from pathlib import Path
from statistics import mean, stdev


def collect_results(results_dir: str = "./eval_results") -> list[dict]:
    """Collect all evaluation result files."""
    results = []
    for filepath in glob.glob(f"{results_dir}/*.json"):
        with open(filepath) as f:
            results.append(json.load(f))
    return results


def aggregate(results: list[dict]) -> dict:
    """Compute aggregate statistics."""
    scores = [r.get("overall_score", 0) for r in results]
    
    return {
        "total_runs": len(results),
        "avg_score": round(mean(scores), 2) if scores else 0,
        "std_dev": round(stdev(scores), 2) if len(scores) > 1 else 0,
        "min_score": min(scores) if scores else 0,
        "max_score": max(scores) if scores else 0,
        "pass_rate": round(sum(1 for s in scores if s >= 80) / len(scores) * 100, 1) if scores else 0,
    }


if __name__ == "__main__":
    results = collect_results()
    summary = aggregate(results)
    print(json.dumps(summary, indent=2))
`,

  "scripts/generate_report.py": `#!/usr/bin/env python3
"""
Generate a detailed quality report for skill-generated artifacts.

Produces a Markdown report with:
- Execution summary
- Quality metrics
- Compliance checks
- Recommendations
"""

from datetime import datetime


def generate_report(skill_name: str, eval_data: dict) -> str:
    """Generate Markdown quality report."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    report = f"""# Quality Report: {skill_name}
Generated: {timestamp}

## Summary
| Metric | Value |
|--------|-------|
| Overall Score | {eval_data.get('overall_score', 'N/A')} |
| Tests Passed | {eval_data.get('tests_passed', 'N/A')} |
| Schema Compliance | {eval_data.get('schema_compliance', 'N/A')} |

## Findings

### Strengths
- Code follows platform architecture standards
- Monitoring instrumentation is complete
- Error handling covers edge cases

### Areas for Improvement
- Consider adding retry logic for transient failures
- Add more granular logging at DEBUG level
- Include performance benchmarks in tests

## Recommendations
1. Review generated IAM policies for least-privilege
2. Validate schema against latest data model version
3. Run load tests before deploying to production
"""
    return report


if __name__ == "__main__":
    sample_data = {"overall_score": 92, "tests_passed": "18/20", "schema_compliance": "100%"}
    print(generate_report("sample-skill", sample_data))
`,

  "scripts/improve_description.py": `#!/usr/bin/env python3
"""
Improve skill description using AI feedback from evaluation results.

Analyzes past evaluation failures and suggests improvements
to the skill's SKILL.md instructions.
"""

import json
from pathlib import Path


def analyze_failures(eval_dir: str = "./eval_results") -> list[str]:
    """Extract common failure patterns from evaluation results."""
    failures = []
    for filepath in Path(eval_dir).glob("*.json"):
        data = json.loads(filepath.read_text())
        for finding in data.get("findings", []):
            if finding.get("severity") in ("error", "critical"):
                failures.append(finding.get("message", ""))
    return failures


def suggest_improvements(failures: list[str]) -> list[str]:
    """Generate improvement suggestions based on failure patterns."""
    suggestions = []
    
    failure_text = " ".join(failures).lower()
    
    if "schema" in failure_text:
        suggestions.append("Add explicit schema validation step in instructions")
    if "monitoring" in failure_text:
        suggestions.append("Include monitoring checklist in output format")
    if "error handling" in failure_text:
        suggestions.append("Add error handling patterns to assets/templates")
    if "naming" in failure_text:
        suggestions.append("Reference naming conventions document in instructions")
    
    return suggestions


if __name__ == "__main__":
    failures = analyze_failures()
    suggestions = suggest_improvements(failures)
    
    print("Suggested improvements:")
    for i, s in enumerate(suggestions, 1):
        print(f"  {i}. {s}")
`,

  "scripts/package_skill.py": `#!/usr/bin/env python3
"""
Package a skill directory for distribution or versioned backup.

Creates a compressed archive of the skill with:
- All source files
- Evaluation history
- Version metadata
"""

import os
import json
import tarfile
from pathlib import Path
from datetime import datetime


def package_skill(skill_dir: str, output_dir: str = "./dist") -> str:
    """Create a versioned archive of the skill directory."""
    skill_path = Path(skill_dir)
    skill_name = skill_path.name
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    os.makedirs(output_dir, exist_ok=True)
    
    archive_name = f"{skill_name}_v{timestamp}.tar.gz"
    archive_path = os.path.join(output_dir, archive_name)
    
    with tarfile.open(archive_path, "w:gz") as tar:
        tar.add(skill_dir, arcname=skill_name)
    
    # Write manifest
    manifest = {
        "skill_name": skill_name,
        "packaged_at": datetime.now().isoformat(),
        "archive": archive_name,
        "files": [str(p.relative_to(skill_path)) for p in skill_path.rglob("*") if p.is_file()],
    }
    
    manifest_path = os.path.join(output_dir, f"{skill_name}_manifest.json")
    Path(manifest_path).write_text(json.dumps(manifest, indent=2))
    
    return archive_path


if __name__ == "__main__":
    import sys
    skill_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    path = package_skill(skill_dir)
    print(f"Packaged: {path}")
`,

  "scripts/quick_validate.py": `#!/usr/bin/env python3
"""
Quick validation script for skill-generated artifacts.

Performs fast checks without running full evaluation:
- File structure validation
- Import statement checking
- Configuration format validation
- Basic syntax checking
"""

import ast
import json
import sys
from pathlib import Path


def validate_python_syntax(filepath: str) -> tuple[bool, str]:
    """Check Python file for syntax errors."""
    try:
        with open(filepath) as f:
            ast.parse(f.read())
        return True, "OK"
    except SyntaxError as e:
        return False, f"Syntax error at line {e.lineno}: {e.msg}"


def validate_json(filepath: str) -> tuple[bool, str]:
    """Check JSON file for format errors."""
    try:
        with open(filepath) as f:
            json.load(f)
        return True, "OK"
    except json.JSONDecodeError as e:
        return False, f"JSON error: {e.msg}"


def validate_structure(artifact_dir: str, required_files: list[str]) -> list[str]:
    """Check that all required files exist."""
    missing = []
    for f in required_files:
        if not Path(artifact_dir, f).exists():
            missing.append(f)
    return missing


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    
    print(f"Validating: {target}")
    
    # Check Python files
    for py_file in Path(target).rglob("*.py"):
        valid, msg = validate_python_syntax(str(py_file))
        status = "✅" if valid else "❌"
        print(f"  {status} {py_file.name}: {msg}")
    
    # Check JSON files
    for json_file in Path(target).rglob("*.json"):
        valid, msg = validate_json(str(json_file))
        status = "✅" if valid else "❌"
        print(f"  {status} {json_file.name}: {msg}")
`,

  "scripts/run_eval.py": `#!/usr/bin/env python3
"""
Run evaluation pipeline for a skill's generated artifacts.

Executes the full evaluation chain:
1. Analyzer agent → structural & code quality checks
2. Comparator agent → diff against reference implementations
3. Grader agent → final scoring and decision

Usage:
    python run_eval.py --skill lambda-generator --artifacts ./output/
"""

import argparse
import json
from pathlib import Path
from datetime import datetime


class EvalPipeline:
    """Orchestrates the evaluation pipeline."""
    
    def __init__(self, skill_name: str, artifacts_dir: str):
        self.skill_name = skill_name
        self.artifacts_dir = Path(artifacts_dir)
        self.results = {"skill": skill_name, "timestamp": datetime.now().isoformat()}
    
    def run_analyzer(self) -> dict:
        """Run the analyzer agent."""
        print(f"[Analyzer] Checking {self.skill_name}...")
        # In production, this would invoke the analyzer agent
        return {"structural_completeness": 5, "code_quality": 4, "platform_compliance": 4}
    
    def run_comparator(self) -> dict:
        """Run the comparator agent."""
        print(f"[Comparator] Comparing against references...")
        return {"schema_alignment": "pass", "pattern_match": "pass", "config_drift": "none"}
    
    def run_grader(self, analyzer_result: dict, comparator_result: dict) -> dict:
        """Run the grader agent."""
        scores = list(analyzer_result.values())
        avg = sum(scores) / len(scores) if scores else 0
        grade = "A" if avg >= 4.5 else "B" if avg >= 3.5 else "C" if avg >= 2.5 else "D"
        return {"grade": grade, "score": round(avg * 20, 1), "decision": "approve" if grade in ("A", "B") else "revise"}
    
    def run(self) -> dict:
        """Execute full pipeline."""
        analyzer = self.run_analyzer()
        comparator = self.run_comparator()
        grader = self.run_grader(analyzer, comparator)
        
        self.results.update({
            "analyzer": analyzer,
            "comparator": comparator,
            "grader": grader,
            "overall_score": grader["score"],
        })
        return self.results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--skill", required=True)
    parser.add_argument("--artifacts", required=True)
    args = parser.parse_args()
    
    pipeline = EvalPipeline(args.skill, args.artifacts)
    results = pipeline.run()
    print(json.dumps(results, indent=2))
`,

  "scripts/run_loop.py": `#!/usr/bin/env python3
"""
Run iterative generation-evaluation loop for skill refinement.

Continuously generates artifacts, evaluates them, and feeds
evaluation results back into the generation process until
quality thresholds are met or max iterations reached.
"""

import json
from pathlib import Path


MAX_ITERATIONS = 5
QUALITY_THRESHOLD = 90


def run_generation(skill_name: str, feedback: str = "") -> dict:
    """Simulate artifact generation (in production, calls the LLM)."""
    return {"skill": skill_name, "artifacts": ["handler.py", "config.py"], "feedback_applied": bool(feedback)}


def run_evaluation(artifacts: dict) -> dict:
    """Simulate evaluation (in production, runs the eval pipeline)."""
    return {"score": 85, "findings": ["Add retry logic", "Improve error messages"]}


def run_loop(skill_name: str) -> dict:
    """Run the generation-evaluation loop."""
    feedback = ""
    
    for iteration in range(1, MAX_ITERATIONS + 1):
        print(f"\\n=== Iteration {iteration}/{MAX_ITERATIONS} ===")
        
        # Generate
        artifacts = run_generation(skill_name, feedback)
        print(f"Generated: {artifacts['artifacts']}")
        
        # Evaluate
        eval_result = run_evaluation(artifacts)
        score = eval_result["score"]
        print(f"Score: {score}")
        
        if score >= QUALITY_THRESHOLD:
            print(f"✅ Quality threshold met at iteration {iteration}")
            return {"iterations": iteration, "final_score": score, "status": "success"}
        
        # Prepare feedback for next iteration
        feedback = "; ".join(eval_result.get("findings", []))
        print(f"Feedback: {feedback}")
    
    print(f"⚠️ Max iterations reached")
    return {"iterations": MAX_ITERATIONS, "final_score": score, "status": "max_iterations"}


if __name__ == "__main__":
    result = run_loop("sample-skill")
    print(json.dumps(result, indent=2))
`,

  "scripts/utils.py": `"""
Shared utility functions for skill automation scripts.

Provides common functionality:
- File I/O helpers
- Logging configuration
- Path resolution
- Template rendering
"""

import os
import json
import logging
from pathlib import Path
from string import Template


def setup_logging(name: str = "skill", level: str = "INFO") -> logging.Logger:
    """Configure structured logging."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level))
    
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s | %(name)s | %(levelname)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger


def load_json(filepath: str) -> dict:
    """Load and parse a JSON file."""
    return json.loads(Path(filepath).read_text())


def save_json(data: dict, filepath: str, indent: int = 2) -> None:
    """Save data as formatted JSON."""
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    Path(filepath).write_text(json.dumps(data, indent=indent))


def resolve_skill_path(skill_name: str, base_dir: str = "./skills") -> Path:
    """Resolve the full path to a skill directory."""
    return Path(base_dir) / skill_name


def render_template(template_str: str, variables: dict) -> str:
    """Render a string template with variables."""
    return Template(template_str).safe_substitute(variables)


def ensure_directory(path: str) -> Path:
    """Create directory if it doesn't exist."""
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p
`,
};
