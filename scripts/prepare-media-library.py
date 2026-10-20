"""Prepare a public editorial library from the owner's explicit local source collections.
No database writes. Private provenance stays under .data/content-import/.
"""
from pathlib import Path
from collections import Counter
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, unquote
import csv, hashlib, json, re, shutil, subprocess

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT.parent.parent
FILES = DOCS / 'Files'
PACK = ROOT / 'content/media-library-assets'
PRIVATE = ROOT / '.data/content-import'
PACK.mkdir(parents=True, exist_ok=True)
PRIVATE.mkdir(parents=True, exist_ok=True)
posts, assets, ledger, excluded = [], {}, [], []
seen_sources, seen_bodies = set(), set()
BATCH = 'local-public-library-2026-10-20'

def uid(value):
    h = hashlib.sha256(('fde-library:' + value).encode()).hexdigest()
    return f'{h[:8]}-{h[8:12]}-4{h[13:16]}-8{h[17:20]}-{h[20:32]}'

def clean_url(url):
    url = url.rstrip('。；，.）】》”’').replace('&amp;', '&')
    if '…' in url:return ''
    try:
        p = urlsplit(url)
        if p.scheme not in ('https', 'http') or not p.hostname or p.username or p.password:
            return ''
        if p.hostname in ('localhost','127.0.0.1') or re.search(r'(feishu|larksuite|yuque|internal)',p.hostname):
            return ''
        if p.hostname == 'wx.zsxq.com': return ''
        params = [(k,v) for k,v in parse_qsl(p.query,keep_blank_values=True) if not re.search(r'utm_|token|auth|key|signature|scene|session|from',k,re.I)]
        return urlunsplit((p.scheme,p.netloc,p.path,urlencode(params),p.fragment))
    except ValueError:
        return ''

def add_asset(file):
    file = file.resolve()
    if not file.is_file() or file.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'):
        return None
    data = file.read_bytes()
    if not 12 <= len(data) <= 10*1024*1024: return None
    digest = hashlib.sha256(data).hexdigest()
    ext = 'jpg' if file.suffix.lower() in ('.jpg','.jpeg') else file.suffix[1:].lower()
    aid = uid('asset:'+digest)
    filename = aid+'.'+ext
    if aid not in assets:
        shutil.copyfile(file, PACK/filename)
        assets[aid] = dict(id=aid,file=filename,sha256=digest,size=len(data),mime={'jpg':'image/jpeg','png':'image/png','webp':'image/webp'}[ext])
    return aid

def clean_body(s, file, images=False):
    s = re.sub(r'\A---\n.*?\n---\n', '', s, flags=re.S)
    s = re.sub(r'^# [^\n]+\n', '', s, count=1, flags=re.M)
    s = re.sub(r'\n## 本地归档说明\b[\s\S]*', '', s)
    s = re.sub(r'\n###? 关键截图与阅读提示[\s\S]*', '', s)
    def image(m):
        alt, target = m.group(1),m.group(2)
        aid = add_asset(file.parent / unquote(target)) if images and not target.startswith(('http','/')) else None
        return f'![{alt}](/api/media/assets/{aid})' if aid else ''
    s = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)',image,s)
    def link(m):
        label,target=m.group(1),m.group(2)
        if target.startswith('/api/media/assets/'):return m.group(0)
        cleaned = clean_url(target)
        if 'google.com/s2/favicons' in target: return ''
        return f'[{label}]({cleaned})' if cleaned else label
    s = re.sub(r'(?<!!)\[([^\]]+)\]\(([^)]+)\)', link, s)
    s = re.sub(r'`(?:\.\./|/Users/)[^`]+`', '原始归档资料', s)
    s = re.sub(r'^.*(?:/Users/|file://|本地文件：|本地文件:).*$','',s,flags=re.M)
    s = re.sub(r'^\*[^\n]*(?:本图|图：|图为|封面|图示)[^\n]*\*\s*$', '', s, flags=re.M) if not images else s
    s = re.sub(r'\n{3,}', '\n\n', s).strip()
    return s

def plain(s):
    s=re.sub(r'!?\[([^\]]*)\]\([^)]*\)',r'\1',s)
    return re.sub(r'\s+',' ',re.sub(r'[*#>`|_]','',s)).strip()

def section(s, keyword):
    m=re.search(r'^## [^\n]*'+keyword+r'[^\n]*\n(.*?)(?=\n## |\Z)',s,re.M|re.S)
    return m.group(1).strip() if m else ''

def summary(s):
    candidates=[p for p in s.split('\n\n') if not p.startswith(('#','>','|','!','- ','```')) and len(plain(p))>45]
    text=plain(candidates[0] if candidates else s)
    if len(text)<=220:return text
    if '。' in text[:220]:return text[:220].rsplit('。',1)[0]+'。'
    return text[:210].rsplit('，',1)[0]+'…'

def classify(text):
    if re.search('组织|管理|人才|人机|培训',text):return 'management'
    if re.search('Agent|智能体|多智能体',text,re.I):return 'agents'
    if re.search('RAG|工程|架构|知识库|选型|交付|部署|评测',text,re.I):return 'engineering'
    return 'transformation'

def tags_for(text, family):
    tags=['enterprise-ai',family]
    for slug,pattern in [('agents','智能体|Agent'),('rag','知识库|RAG|检索'),('fde','FDE|交付|PoC'),('organization','组织|人才|培训'),('manufacturing','制造|工厂|工艺|排产|设备'),('commerce','电商|零售|跨境|销售|营销'),('automation','流程|自动化|RPA'),('evaluation','评测|验收|质量|PoC')]:
        if re.search(pattern,text,re.I):tags.append(slug)
    return list(dict.fromkeys(tags))[:16]

def add(slug,title,body,file,source_name,source_url='',channel='cases',details=None,date='2026-10-20',family='field-cases',authenticity='sourced',cover=None,home=0,topic=None):
    if not body or len(body)<160:
        excluded.append({'file':str(file),'reason':'insufficient body'});return
    h=hashlib.sha256(body.encode()).hexdigest()
    if h in seen_bodies or (source_url and source_url in seen_sources and channel=='cases'):
        excluded.append({'file':str(file),'reason':'duplicate source or body','url':source_url});return
    if source_url:seen_sources.add(source_url)
    seen_bodies.add(h)
    desc=summary(section(body,'摘要') or section(body,'为什么') or body)
    note=f'本地公开资料整理批次 {BATCH}；依据来源正文与归档索引核对标题、主体和场景，保留来源陈述与方法推断的边界。未取得企业项目台账，不标记独立核实。'
    if authenticity=='editorial': note=f'{BATCH}；依据可公开原创稿整理。保留方法建议、参考设计与研究日期，不将其标记为企业实际成果。'
    p=dict(slug=slug,title=title[:160],channel=channel,body=body,summary=desc,category=classify(title),tags=tags_for(title+' '+str(details or {}),family),authenticity=authenticity,source_name=source_name[:200],source_url=source_url,verification_note=note,status='published',published_at=date[:10]+'T00:00:00+08:00',cover_style=('report' if channel=='research' else ['grid','layers','circuit','field'][len(posts)%4]),details=details or {},home_rank=home,featured=bool(home),breaking=False)
    if cover:p.update(cover_id=cover,cover_alt=title[:180],cover_caption='来源资料配图，版权归原作者；仅作为本文阅读材料。')
    p['library_topic']=topic or family
    posts.append(p)
    ledger.append(dict(slug=slug,file=str(file),sha256=hashlib.sha256(file.read_bytes()).hexdigest() if file.is_file() else '',source_url=source_url))

# 1. Structured source cases; recover attribution from the original archive.
base=FILES/'AI项目交付案例集_FDE结构化版'
rawbase=FILES/'AI制造探索营_Case260'
provenance={r['id']:r for r in json.loads((base/'build/provenance.json').read_text())}
rawindex={r['本地文件'].split('/')[-1]:r for r in csv.DictReader(open(rawbase/'index.csv',encoding='utf-8-sig'))}
for r in csv.DictReader(open(base/'index.csv',encoding='utf-8-sig')):
    file=base/r['本地文件']
    if r['案例编号']=='FDE-102':
        excluded.append(dict(file=str(file),reason='duplicate case of field-fde-050'));continue
    rawfile=rawbase/'cases'/provenance[r['案例编号']]['sourceFile']
    raw=rawfile.read_text(); info=rawindex[rawfile.name]
    links=list(dict.fromkeys(clean_url(x) for x in re.findall(r'https?://[^\s)\]<>]+',raw)))
    links=[u for u in links if u and '...' not in u]
    origin=next((u for u in links if 'zsxq.com' not in u), next(iter(links),''))
    if not origin:
        excluded.append(dict(file=str(file),reason='community-group-only: public source not established'));continue
    if r['企业/对象']=='多企业案例集合':
        excluded.append(dict(file=str(file),reason='compilation duplicates individual case records'));continue
    body=clean_body(file.read_text(),file)
    company=r['企业/对象'].split('|')[0]
    if r['案例编号']=='FDE-050':
        company='某家电制造企业（原材料未披露名称）'
        r['行业']='家电制造'
        r['核心场景']='产品知识与渠道服务'
    if r['案例编号']=='FDE-123':r['核心场景']='生产计划与智能调度'
    if company in ['GM','电子','电气','汽车','装备','医药行业','电子行业','能源设备','电机制造','装备制造','汽配','汽配行业','PCB'] or re.search('随着|今天的|所有发票|流程挖掘|智能体实现|AI驱动|一家装备|隶属于|首发',company):
        company='某'+r['行业']+'企业（原材料未明确披露名称）'
    body=re.sub(r'(\| 企业/对象 \| )[^\n]+',r'\g<1>'+company+' |',body)
    body=body.replace(r['企业/对象']+'围绕',company+'围绕')
    title=r['标题'].split('｜',1)[-1]
    if r['案例编号']=='FDE-086':title='维达纸业：数字化工厂的能耗、培训与物流协同'
    body=f'> 来源整理：{info["作者"]} / AI制造探索营。来源记录日期：{info["发布时间"][:10]}。企业成效为材料披露，FDE复盘与PoC门槛为方法建议。\n\n'+body+f'\n\n## 来源与阅读边界\n\n[阅读来源原文]({origin})。本文按归档材料整理，不代表项目现状或本站独立审计结果。'
    det=dict(company=company,industry=r['行业'],scenario=r['核心场景'],stage=r['项目阶段'],technology=('RAG / 知识检索' if '知识' in r['核心场景'] else 'AI 与业务系统集成'),results=r['关键结果'][:3000],lessons='材料中的 FDE复盘、PoC指标与实施门槛为方法建议。')
    add('field-'+r['案例编号'].lower(),title,body,file,'AI制造探索营 · '+info['作者'],origin,details=det,date=info['发布时间'],home=3 if r['案例编号']=='FDE-031' else 0)

# 2. CAICT report cases: use the source text instead of mechanically expanded templates.
base=FILES/'信通院制造业数智化案例2025'
expanded=FILES/'制造业AI案例库_FDE扩展版2025'
manifest=json.loads((base/'manifest.json').read_text())
extra={r['caseNo']:r for r in json.loads((expanded/'manifest.json').read_text())['cases']}
for r in manifest['cases']:
    file=base/r['markdown']; e=extra[r['caseNo']]
    body=clean_body(file.read_text(),file)
    body=re.sub(r'^打开来源 PDF 对应页面\s*$', '',body,flags=re.M)
    body='> 报告案例整理：以下建设过程与数字来自中国信息通信研究院《2025年度制造业数字化转型典型案例集》，不是本站自行测量的数据。\n\n'+body
    body+=f'\n\n## 资料定位\n\n中国信息通信研究院《2025年度制造业数字化转型典型案例集》，PDF 第 {r["startPage"]}—{r["endPage"]} 页。报告版本为2025年，整理日期为2026年10月20日。'
    det=dict(company=r['company'],industry=r['industry'],scenario=e['scene'],technology='、'.join(r['technologies'])[:200],stage='公开报告所载建设案例（2025年）',results='报告披露：'+e['outcome'])
    add(f'caict-2025-{r["caseNo"]:02}',r['company']+'：'+e['scene'],body,file,'中国信息通信研究院 · 2025年度制造业数字化转型典型案例集',details=det,date='2026-10-20',family='manufacturing',cover=add_asset(expanded/e['cover']),home=5 if r['caseNo']==1 else 0,topic='manufacturing')

# 3. Datawhale interview collection: 24 actual cases, not 100 invented entries.
base=FILES/'FDE案例集整理/Datawhale-FDE案例100_本地整理'
industries=['制造业','政务服务','法律服务','城市规划','跨境电商','跨境物流','软件研发','工业制造','财务管理','线下零售','外贸','鞋服电商','消防维保','国企管理','本地生活','通信运营','非标制造','生物科技','消费品研发','制造业','建筑设计','跨境电商','工程租赁','跨境快消']
for i,r in enumerate(csv.DictReader(open(base/'manifest.csv',encoding='utf-8-sig'))):
    file=base/r['case_file']; body=clean_body(file.read_text(),file,images=True)
    body='> 访谈资料整理：依据 Datawhale《FDE案例100》所收录访谈。案例叙述与成果均归属于原访谈，本站未进行独立项目审计。\n\n'+body
    body+=f'\n\n## 来源与作者\n\nDatawhale《FDE案例100》，受访者：{r["interviewee"]}（{r["organization"]}）；PDF 第 {r["pdf_pages"]} 页，书内页码 {r["printed_pages"]}。本文为访谈资料的第三人称整理，不是本站新采访。'
    scenario=Path(r['case_file']).stem.split('-',3)[-1]
    det=dict(company='受访案例企业（按原访谈匿名）',industry=industries[i],scenario=scenario,technology='AI 应用与业务流程集成',stage='以原访谈披露范围为准')
    add(r['case_id'].lower(),r['title'],body,file,'Datawhale《FDE案例100》· 受访者 '+r['interviewee'],details=det,date='2026-09-09',family='field-cases',cover=add_asset(base/r['cover_file']),home=4 if i==0 else 0,topic='fde-delivery')

# 4. The owner's complete editorial manuscripts, retaining their references and diagrams.
originals=[(DOCS/'Personal/FDE前线/文章/2026-10-19-全员AI与组织提效/正文.md','organization-ai-productivity','2026-10-19',1),(FILES/'FDE前线/文章/2026-09-10-机械集团智能报价/正文.md','mechanical-quoting-deep-dive','2026-09-10',2),(FILES/'FDE前线/文章/2026-09-10-老师傅经验AI系统/正文.md','industrial-experience-to-ai','2026-09-10',6)]
for file,slug,date,home in originals:
    raw=file.read_text(); title=re.search(r'^title:\s*["\']?(.+?)["\']?$',raw,re.M).group(1)
    covermatch=re.search(r'^coverImage:\s*["\']?(.+?)["\']?$',raw,re.M)
    cover=add_asset(file.parent/covermatch.group(1)) if covermatch else None
    body=clean_body(raw,file,images=True)
    refs=file.parent/'参考资料.md'
    if refs.exists():body+='\n\n## 参考资料\n\n'+clean_body(refs.read_text(),refs)
    add(slug,title,body,file,'FDE前线 · 原创深度稿',channel='features',date=date,family='organization',authenticity='editorial',cover=cover,home=home,topic='organization')

# 5. Existing public editorial methods from the owner's FDE site (no example events).
file=ROOT.parent/'51fde/src/lib/frontline-content.ts'
code='const {frontlineEntries}=await import('+json.dumps(file.as_uri())+');process.stdout.write(JSON.stringify(frontlineEntries));'
entries=json.loads(subprocess.check_output(['node','--import','tsx','--input-type=module','-e',code],cwd=ROOT))
for p in entries:
    if p['type']=='活动与训练':continue
    body='## 阅读要点\n\n'+'\n'.join('- '+s for s in p['takeaways'])+'\n\n'+'\n\n'.join('## '+s['heading']+'\n\n'+'\n\n'.join(s['paragraphs']) for s in p['sections'])
    add(p['slug'],p['title'],body,file,'FDE前线 · 企业AI交付方法',channel='insights',date=p['publishedAt'],family='fde',authenticity='editorial',topic='fde-delivery')

# 6. Original research archives; preserve snapshot dates, not current product promises.
base=ROOT.parent/'Knowledge'
for name in ['01-weknora-map.md','02-weknora-extension.md','03-weknora-ecosystem.md','04-landscape.md','06-architecture.md','07-delivery.md','10-vertical-ai-30.md','11-vertical-ai-opportunities.md','12-20-scenarios-illustrated-tutorial.md']:
    file=base/name; raw=file.read_text(); title=re.search(r'^# (.+)',raw).group(1)
    raw=raw.replace('本题最重要的决策','重点选型决策')
    body='> 研究归档：本篇保留2026年9月30日前后的本地公开资料研究。开源版本、功能、许可和星数属于当时快照；技术决策应复核所列官方来源。架构与交付计划为参考设计。\n\n'+clean_body(raw,file)
    add('research-'+file.stem,title,body,file,'FDE前线 · 开源方案研究归档（2026-09）',channel='research',date='2026-09-30',family='engineering',authenticity='editorial',details={'research_type':'article','team':'FDE前线'},home=8 if name=='04-landscape.md' else 0,topic='engineering')
file=FILES/'企业AI工程蓝图_2026-10-18/交付/工程设计与选型附件.md'
body=clean_body(file.read_text(),file).replace('本课的','本文的')
body=re.sub(r'\n## 10\. 授课节奏与互动[\s\S]*','',body)
add('enterprise-ai-engineering-blueprint','企业 AI 工程蓝图：七层架构、四个运行平面与交付门禁',body,file,'FDE前线 · 企业AI工程蓝图（2026-10-18研究版）',channel='research',date='2026-10-18',family='engineering',authenticity='editorial',details={'research_type':'report','team':'FDE前线'},home=7,topic='engineering')

# 7. Public solution walkthroughs, explicitly methods rather than real customer outcomes.
base=ROOT.parent/'enterprise-ai-casebook-2026-v2/publication/feishu/parts'
for file in sorted(base.glob('*.md')):
    if not re.match(r'0[1-9]-|10-',file.name):continue
    raw=file.read_text(); m=re.search(r'^## (.+)',raw,re.M)
    if not m:continue
    title=re.sub(r'^案例\d+[｜|]','',m.group(1))+'：从业务任务到可验证交付'
    body='> 方案实践：本文来自 FDE前线公开演示方案材料。演示数据、试点目标和产品能力说明不构成真实客户收益或生产部署承诺。\n\n'+clean_body(raw,file)
    add('practice-'+file.stem,title,body,file,'FDE前线 · 企业AI智能体行业和案例分享',channel='features',date='2026-10-13',family='fde',authenticity='editorial',topic='fde-delivery')

# 8. Reading guides connect the original reports to their actual, traceable case entries.
for prefix,slug,title,source_name,topic in [
 ('caict-2025-','caict-2025-reading-guide','制造业数字化转型报告导读：35个企业案例的场景与技术路径','中国信息通信研究院 · 2025年度制造业数字化转型典型案例集','manufacturing'),
 ('dw-fde-','datawhale-fde-interview-reading-guide','Datawhale FDE访谈案例导读：24个业务现场与交付问题','Datawhale《FDE案例100》','fde-delivery')]:
    selected=[p for p in posts if p['slug'].startswith(prefix)]
    body=f'本篇将《{source_name.split(" · ")[-1]}》中已整理的{len(selected)}篇案例组织为阅读路径。案例提供业务问题、方案选择和交付过程的参考；来源披露的结果不构成对其他企业的效果承诺。\n\n## 怎样阅读这些案例\n\n先按行业与核心业务任务找到相近项目，再检查原有流程、输入资料、异常分支与业务负责人。技术名词相同，并不意味着数据基础、流程复杂度和投入条件相同。\n\n## 案例阅读索引\n\n| 案例 | 行业 | 核心场景 |\n| --- | --- | --- |\n'
    for p in selected:body+=f'| [{p["title"]}](/cases/{p["slug"]}) | {p["details"]["industry"]} | {p["details"]["scenario"]} |\n'
    body+='\n## 把阅读变成可执行的调研\n\n- 对照客户现有流程，记录哪些环节与材料相同，哪些条件尚不成立。\n- 将原文披露结果与自己的现状基线分开，明确指标的分母、时间范围和成本边界。\n- 把案例中的方案拆成资料准备、模型能力、系统接口与人工责任，逐项判断可复用程度。\n- 对未公开的预算、人员、周期和异常处理记录待确认问题，不用行业案例替代客户验收。\n\n## 来源范围\n\n本导读不增加新的企业事实或量化成效。具体来源、页码或受访者见各案例正文；方法性阅读建议由FDE前线编辑部整理。'
    origin_file=(FILES/'信通院制造业数智化案例2025/manifest.json') if prefix=='caict-2025-' else (FILES/'FDE案例集整理/Datawhale-FDE案例100_本地整理/manifest.csv')
    add(slug,title,body,origin_file,source_name,channel='research',date='2026-10-20',family=topic if topic=='manufacturing' else 'fde',authenticity='editorial',details={'research_type':'series','team':'FDE前线'},topic=topic)

categories=[{'slug':s,'name':n,'description':d} for s,n,d in [('transformation','企业 AI 转型','从业务问题到持续运营'),('agents','智能体产业','技术、产品与应用边界'),('engineering','FDE 与工程交付','架构、评测、集成与交付'),('management','组织与管理','组织协作、知识与价值创造')]]
tag_names={'enterprise-ai':'企业 AI','agents':'智能体','rag':'RAG','fde':'FDE','organization':'组织变革','manufacturing':'智能制造','commerce':'电商与零售','automation':'流程自动化','evaluation':'评测与验收','field-cases':'产业案例','engineering':'工程架构'}
topics=[{'slug':s,'title':n,'description':d,'published':True} for s,n,d in [('manufacturing','制造业 AI 与数字化实践','从公开制造业报告追踪质量、工艺、调度、运维和供应链的改造路径。'),('fde-delivery','FDE 走进业务现场','从访谈案例到公开演示方案，理解问题诊断、业务边界、评测和生产交付。'),('organization','从个人提效到组织能力','围绕组织流程、隐性知识和管理责任，讨论企业 AI 的价值转化。'),('engineering','企业 AI 工程与开源选型','基于有日期的技术研究，梳理知识、智能体、网关、评测和持续运行。'),('field-cases','企业 AI 转型案例库','按来源追溯企业AI应用实践，区分披露事实、方法推断与项目成果。')]]
# Reject accidental local paths, credentials, and impossible dates before writing the public pack.
for p in posts:
    if re.search(r'/Users/|file://|\]\((?:\.\./|图片/)|poc_token=|sk-[A-Za-z0-9]{20}',p['body']):raise ValueError('Unsafe public material: '+p['slug'])
    if len(p['body'])>80000:raise ValueError('Oversized article: '+p['slug'])
    if len(p['summary'])<20:raise ValueError('Insufficient summary: '+p['slug'])
assert len({p['slug'] for p in posts})==len(posts)
pack=dict(version=1,batch=BATCH,prepared_at='2026-10-20',author={'id':uid('editor'),'slug':'frontline-editorial','name':'FDE前线编辑部','title':'内容整理与研究','bio':'整理公开案例、访谈、研究资料与原创方法。第三方事实和指标注明来源，分析建议与项目实际成果分开呈现。'},categories=categories,tags=[dict(slug=k,name=v,description='') for k,v in tag_names.items()],topics=topics,assets=list(assets.values()),posts=posts)
(ROOT/'content/media-library.json').write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
(PRIVATE/'source-ledger.json').write_text(json.dumps(dict(batch=BATCH,imported=ledger,excluded=excluded),ensure_ascii=False,indent=2)+'\n')
subprocess.run(['node','--import','tsx','scripts/clean-media-sources.ts','--apply'],cwd=ROOT,check=True)
print(json.dumps(dict(posts=len(posts),channels=Counter(p['channel'] for p in posts),assets=len(assets),asset_mib=round(sum(a['size'] for a in assets.values())/1024**2,2),excluded=len(excluded),minimum_body=min(len(p['body']) for p in posts)),ensure_ascii=False,indent=2))
