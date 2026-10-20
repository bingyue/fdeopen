import { expect, it } from 'vitest';
import { cleanMediaSource } from '../src/lib/media-source-cleanup';

it('removes the requested reference entry and renumbers the remaining references', () => {
  const body = `## 案例分析

原有业务事实与数据：报价从 3—5 天缩短至 30 分钟。

证据边界：依据[案例原文](https://articles.zsxq.com/id_ehsnjqzdgwg3.html)，未取得项目台账。

## 参考资料

## 1. Case AI Day39：某机械集团成本估算体系重构

- 来源：AI制造探索营 / 响哥
- 发布时间：2026-02-08
- URL：[原文](https://articles.zsxq.com/id_ehsnjqzdgwg3.html)
- 核心信息：四阶段实施路径。
- 使用边界：企业匿名。

## 2. Cost management software

- 来源：Siemens
- URL：https://www.siemens.com/en-gb/solutions/cost-management/

## 3. Valuation of Materials

- 来源：SAP Help Portal`;
  const original = { body, source_name: 'FDE前线 · 原创深度稿', source_url: '' };
  const clean = cleanMediaSource(original);
  expect(clean.body).not.toMatch(/AI制造探索营|响哥|Case AI Day39|zsxq\.com|四阶段实施路径/);
  expect(clean.body).toContain('报价从 3—5 天缩短至 30 分钟');
  expect(clean.body).toContain('证据边界：依据案例原文，未取得项目台账。');
  expect(clean.body).toContain('## 1. Cost management software');
  expect(clean.body).toContain('## 2. Valuation of Materials');
  expect(clean.body).toContain('https://www.siemens.com/en-gb/solutions/cost-management/');
  expect(clean.source_name).toBe(original.source_name);
  expect(cleanMediaSource(clean)).toEqual(clean);
});

it('cleans selected case credits while preserving factual boundaries and CMS edits', () => {
  const body = `> 来源整理：响哥 / AI制造探索营。来源记录日期：2026-02-08。

> **事实边界**：案例材料披露，未独立审计。

## 企业背景

编辑后来补充的正文，不能被初始化稿覆盖。

## 来源与阅读边界

[阅读来源原文](https://articles.zsxq.com/example.html)。本文按归档材料整理，不代表项目现状或本站独立审计结果。`;
  const clean = cleanMediaSource({
    body,
    source_name: 'AI制造探索营 · 响哥',
    source_url: 'https://articles.zsxq.com/example.html',
    authenticity: 'sourced',
    title: '保留当前标题',
  });
  expect(clean.body).toBe(`> **事实边界**：案例材料披露，未独立审计。

## 企业背景

编辑后来补充的正文，不能被初始化稿覆盖。`);
  expect(clean.source_name).toBe('公开案例资料整理');
  expect(clean.source_url).toBe('');
  expect(clean.authenticity).toBe('sourced');
  expect(clean.title).toBe('保留当前标题');
  expect(cleanMediaSource(clean)).toEqual(clean);
});

it('leaves other publishers and unrelated narrative mentions unchanged', () => {
  const original = {
    source_name: 'Datawhale《FDE案例100》',
    source_url: 'https://example.org/report',
    body: '## 企业背景\n\n这里讨论响应流程。\n\n## 来源与作者\n\nDatawhale。\n\n## 参考资料\n\n## 1. Siemens\n\n- 来源：Siemens',
  };
  expect(cleanMediaSource(original)).toEqual(original);
});
