from pathlib import Path
import hashlib
import re
import sys
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_HASHES = {
    "docs/my-research/architecuture.md": "dc1c38a8040ec0b1a5d8a5c9f01bff097b11ec167a1a44d61c30434f0f09398b",
    "docs/my-research/compaitator.md": "6d6f8b6743f55446ee94c1af108a5accb345657057e9ba18ca2d946e561d7b76",
    "docs/my-research/ideas.md": "4f55b75fe36a5accb578f36d872a315f45704c181c2ce7b07421842651eecbbd",
    "docs/my-research/laya.py": "7d049133e276aaa2c3c31f78f7d8ac8e5943910e67f578c27648b554672dd524",
    "docs/my-research/monitization.md": "e3edbbbad8bd5cec6722ee85e1c0cfd2b8011989305afb4407da65682c7f7de3",
    "docs/my-research/product_palning.md": "3478f37d66472094ac9b41064593beb16ce4b3064999730baa70be72ee9d6fb1",
    "docs/my-research/school.ai.md": "b559c2fdddf3e6d506101c8b251aadc401b3cdfd0c025a2ae7b0847b9bbd8e7a",
    "docs/my-research/school.aiv2.md": "4e4f455739345bf684c0cdedefb771da8e768c1a1f66fa6b6deba01fa9870c84",
    "docs/SWE_os.md": "e2462d0d5f7b1d2d8801601a447456b7008dfe2413f1e643efb6b6e30b8ce693",
}
REQUIRED = (
    "README.md",
    "AGENTS.md",
    "docs/product/v1-spec.md",
    "docs/research/synthesis.md",
    "docs/architecture/system.md",
    "docs/architecture/ai.md",
    "docs/architecture/data.md",
    "docs/decisions/ADR-001-offline-v1.md",
    "docs/plans/v1-build.md",
    "docs/plans/agent-prompts.md",
    "docs/UX/README.md",
    "docs/quality/evaluation.md",
    "docs/engineering/agent-workflow.md",
    "docs/engineering/state.md",
    "docs/engineering/templates/task.md",
    "docs/engineering/templates/review.md",
    "docs/engineering/templates/benchmark.md",
)
SKILLS = (
    "gurukul-plan-feature",
    "gurukul-build-slice",
    "gurukul-evaluate-local-ai",
    "gurukul-review-change",
)
UX_TASK_REFERENCES = {
    "T0": ("01-start-learning-v2.png",),
    "T1": ("01-start-learning-v2.png", "09-home-ready-viewport.md", "13-settings-overview.md"),
    "T2": ("12-digital-teacher.md", "13-settings-overview.md", "07-resilience-states.md"),
    "T3": ("02-notes-and-study.png", "08-notebook-carousel.md", "09-home-ready-viewport.md", "10-all-notebooks.md"),
    "T4": ("02-notes-and-study.png", "04-study-states.md", "11-history-tab.png", "11-history-tab.md"),
    "T5": ("03-practice-and-revision.png", "05-quiz-states.md"),
    "T6": ("03-practice-and-revision.png", "06-progress-states.md"),
    "T7": ("03-practice-and-revision.png", "07-resilience-states.md", "13-settings-overview.md"),
}
UX_ASSETS = (
    "assets/illustrations/book-mascot.png",
    "assets/illustrations/open-book.png",
    "assets/illustrations/settings-avatar.png",
    "docs/UX/12-digital-teacher-avatar.png",
)


def check(root):
    failures = []
    documents = []
    for relative in REQUIRED:
        document = root / relative
        if not document.is_file():
            failures.append(f"Missing required file: {relative}")
        else:
            documents.append(document)

    for relative, expected in ORIGINAL_HASHES.items():
        original = root / relative
        if not original.is_file():
            failures.append(f"Missing original input: {relative}")
        elif hashlib.sha256(original.read_bytes()).hexdigest() != expected:
            failures.append(f"Original input changed: {relative}")

    for name in SKILLS:
        skill = root / ".agents" / "skills" / name / "SKILL.md"
        if not skill.is_file():
            failures.append(f"Missing skill: {name}")
            continue
        documents.append(skill)
        content = skill.read_text(encoding="utf-8")
        frontmatter = re.match(r"\A---\n(.*?)\n---(?:\n|$)", content, re.DOTALL)
        if not frontmatter:
            failures.append(f"Missing skill frontmatter: {name}")
            continue
        fields = {}
        for line in frontmatter.group(1).splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                fields[key.strip()] = value.strip()
        if fields.get("name") != name or not fields.get("description"):
            failures.append(f"Invalid skill name/description: {name}")
        if "docs/UX/README.md" not in content or "required-ux-delivery-t0t7" not in content:
            failures.append(f"Missing UX context routing in skill: {name}")

    for relative in UX_ASSETS:
        if not (root / relative).is_file():
            failures.append(f"Missing approved UX asset: {relative}")
    for reference in sorted({reference for references in UX_TASK_REFERENCES.values() for reference in references}):
        path = root / "docs/UX" / reference
        if not path.is_file():
            failures.append(f"Missing required UX reference: {reference}")
    documents.extend(path for path in sorted((root / "docs/UX").glob("*.md")) if path not in documents)
    plan = root / "docs/plans/v1-build.md"
    prompts = root / "docs/plans/agent-prompts.md"
    if plan.is_file() and prompts.is_file():
        plan_text = plan.read_text(encoding="utf-8")
        prompt_text = prompts.read_text(encoding="utf-8")
        for task, references in UX_TASK_REFERENCES.items():
            row = re.search(rf"^\| {task} \|.*$", plan_text, re.MULTILINE)
            prompt = re.search(rf"^## {task} —.*?(?=^## |\Z)", prompt_text, re.MULTILINE | re.DOTALL)
            if not row or any(reference not in row.group() for reference in references):
                failures.append(f"Missing UX acceptance mapping: {task}")
            if not prompt or any(token not in prompt.group() for token in ("docs/UX/README.md", "Required UX delivery T0–T7", *references)):
                failures.append(f"Missing copy-ready UX routing: {task}")

    for document in documents:
        content = document.read_text(encoding="utf-8")
        for target in re.findall(r"\[[^\]\n]+\]\(([^)\n]+)\)", content):
            target = target.strip().strip("<>")
            if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith("#"):
                continue
            local_target = unquote(target.split("#", 1)[0])
            if local_target and not (document.parent / local_target).exists():
                failures.append(f"Broken link in {document.relative_to(root)}: {target}")
    return failures, len(documents)


def main():
    failures, count = check(ROOT)
    if failures:
        for failure in failures:
            print(f"FAIL: {failure}")
        return 1
    print(f"PASS: {count} maintained documents, {len(SKILLS)} skills, local file links.")
    print(f"PASS: all {len(ORIGINAL_HASHES)} original input hashes unchanged.")
    print("PASS: T0–T7 UX mapping, copy-ready prompts, approved assets and skill routing.")
    print("Application, visual fidelity, native device, and AI quality checks: not run by this validator.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
