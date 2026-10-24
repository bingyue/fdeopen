from pathlib import Path
import json
import zipfile
ROOT = Path(__file__).resolve().parent.parent
for pack in json.loads((ROOT / "content/practice-packs.json").read_text()):
    slug = pack["slug"]
    target = ROOT / "public/practice" / (slug + ".zip")
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in ["README.md", "LICENSE", "run.py", "input.json", "expected.json", "acceptance.md"]:
            info = zipfile.ZipInfo(slug + "/" + name, (2026, 10, 25, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, (ROOT / "content/practice" / slug / name).read_bytes())
    print(slug)
