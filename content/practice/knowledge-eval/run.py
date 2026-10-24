import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent

def run(data):
    results = []
    for row in data["answers"]:
        reasons = []
        if set(row["citations"]) - set(row["allowed"]):
            reasons.append("引用越权")
        if row["answered"] and not row["citations"]:
            reasons.append("回答缺少引用")
        if row["answered"] and not row["answerable"]:
            reasons.append("无答案时应转人工")
        if not row["answered"] and row["answerable"]:
            reasons.append("可回答问题被拒答")
        results.append({"id": row["id"], "pass": not reasons, "reasons": reasons})
    return {"passed": sum(row["pass"] for row in results), "failed": sum(not row["pass"] for row in results), "results": results}

if __name__ == "__main__":
    try:
        result = run(json.loads((ROOT / "input.json").read_text(encoding="utf-8")))
        if "--check" in sys.argv:
            expected = json.loads((ROOT / "expected.json").read_text(encoding="utf-8"))
            if result != expected:
                raise ValueError("结果与 expected.json 不一致；请检查输入和计算口径")
            print("PASS")
        else:
            (ROOT / "output.json").write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
            print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, TypeError, KeyError, OSError, ZeroDivisionError) as error:
        print("无法处理输入: " + str(error), file=sys.stderr)
        sys.exit(1)
