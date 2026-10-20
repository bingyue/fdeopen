type SourceContent = { body: string; source_name: string; source_url: string };

export const removedSourcePattern = /AI\s*制造探索营|响哥/i;
export const removedCaseUrl = 'https://articles.zsxq.com/id_ehsnjqzdgwg3.html';

/** Remove the selected source credits without rewriting case facts or other references. */
export function cleanMediaSource<T extends SourceContent>(post: T): T {
  let body = post.body;
  const selectedSource = removedSourcePattern.test(post.source_name);
  if (selectedSource) {
    body = body.replace(/^>\s*来源整理：[^\n]*(?:AI\s*制造探索营|响哥)[^\n]*(?:\n|$)/gim, '');
    // This is the source link appended by the library generator, not a case section.
    body = body.replace(
      /\n## 来源与阅读边界\n\n\[阅读来源原文\]\([^\n]+\)。本文按归档材料整理，不代表项目现状或本站独立审计结果。\s*$/,
      '',
    );
  }

  let removedReference = false;
  body = body
    .split(/(?=^#{1,6} )/m)
    .filter((section) => {
      const credit = section.match(/^-\s*来源[：:]\s*(.+)$/m);
      if (!credit || !removedSourcePattern.test(credit[1])) return true;
      // Only remove reference entries, never a narrative section mentioning a source.
      if (!/^#{1,6} (?:\d+[.、]\s*|Case\s+AI\s+Day)/i.test(section)) return true;
      removedReference = true;
      return false;
    })
    .join('');
  if (removedReference) {
    const references = body.indexOf('## 参考资料\n');
    if (references !== -1) {
      let index = 0;
      body =
        body.slice(0, references) +
        body.slice(references).replace(/^(#{2,6}) \d+[.、]\s+/gm, (_, heading) => {
          return `${heading} ${++index}. `;
        });
    }
  }
  body = body.replace(
    /\[([^\]]+)\]\(https:\/\/articles\.zsxq\.com\/id_ehsnjqzdgwg3\.html\)/g,
    '$1',
  );
  if (body !== post.body) body = body.replace(/\n{3,}/g, '\n\n').trim();
  return {
    ...post,
    body,
    source_name: selectedSource ? '公开案例资料整理' : post.source_name,
    source_url: selectedSource ? '' : post.source_url,
  };
}
