import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent

def run(data):
    groups = data["groups"]
    if len(groups) != 2 or [g["name"] for g in groups] != ["control", "experiment"]:
        raise ValueError("需要按顺序提供 control 和 experiment")
    results = []
    for row in groups:
        for key in ["users", "orders", "revenue", "goods_cost", "discount", "contact_cost", "complaints"]:
            if not isinstance(row[key], (int, float)) or row[key] < 0:
                raise ValueError(key + " 需要非负数")
        if row["users"] <= 0 or row["orders"] > row["users"] or row["complaints"] > row["users"]:
            raise ValueError("用户数需大于零；订单按成交用户计，不可多于总用户数")
        results.append({"name": row["name"], "conversion_percent": round(row["orders"] / row["users"] * 100, 2), "contribution": row["revenue"] - row["goods_cost"] - row["discount"] - row["contact_cost"], "complaint_percent": round(row["complaints"] / row["users"] * 100, 2)})
    return {"groups": results, "decision": "继续验证：合成样本不能证明业务增量或统计显著性"}

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
