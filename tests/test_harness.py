import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("check_harness", ROOT / "scripts/check_harness.py")
HARNESS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HARNESS)


class HarnessRoutingTests(unittest.TestCase):
    def altered_check(self, relative, before, after):
        original = Path.read_text

        def read(path, *args, **kwargs):
            content = original(path, *args, **kwargs)
            return content.replace(before, after) if path == ROOT / relative else content

        with patch.object(Path, "read_text", read):
            return HARNESS.check(ROOT)[0]

    def test_missing_prompt_ux_route_is_detected(self):
        failures = self.altered_check("docs/plans/agent-prompts.md", "11-history-tab.md", "missing-history.md")
        self.assertIn("Missing copy-ready UX routing: T4", failures)

    def test_missing_plan_mapping_is_detected(self):
        failures = self.altered_check("docs/plans/v1-build.md", "| T3 |", "| Removed |")
        self.assertIn("Missing UX acceptance mapping: T3", failures)

    def test_missing_skill_route_is_detected(self):
        failures = self.altered_check(".agents/skills/gurukul-build-slice/SKILL.md", "docs/UX/README.md", "other.md")
        self.assertIn("Missing UX context routing in skill: gurukul-build-slice", failures)

    def test_broken_ux_link_is_detected(self):
        failures = self.altered_check("docs/UX/13-settings-overview.md", "# Settings overview", "# Settings overview\n[Missing](missing-design.png)")
        self.assertTrue(any("Broken link in docs/UX/13-settings-overview.md" in failure for failure in failures))


if __name__ == "__main__":
    unittest.main()
