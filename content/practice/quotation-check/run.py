import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent

def run(data):
    threshold = data["threshold"]
    if not isinstance(threshold, (int, float)) or not 0 < threshold < 1:
        raise ValueError("threshold 必须在 0 与 1 之间")
    errors, invalid, review, seen = [], [], [], set()
    for row in data["orders"]:
        if row["id"] in seen:
            raise ValueError("重复订单编号")
        seen.add(row["id"])
        actual, predicted = row["actual"], row["predicted"]
        if not isinstance(actual, (int, float)) or not isinstance(predicted, (int, float)) or actual <= 0 or predicted < 0:
            invalid.append(row["id"])
            continue
        error = abs(predicted - actual) / actual
        errors.append(error)
        if error >= threshold:
            review.append(row["id"])
    return {"valid": len(errors), "invalid": invalid, "review": review, "mape_percent": round(sum(errors) / len(errors) * 100, 2) if errors else None}

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
