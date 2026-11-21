// Starter code for the Python playground: the functions and classes the prompt names, taken from
// the reference solution's top level, with function bodies left for the reader. Helpers the
// prompt doesn't mention stay hidden, so the starter doesn't give the solution's structure away.
// Pure (no imports) so `node --test` can check it.

export function starterCode(prompt: string, solution: string): string {
  const lines = solution.split('\n');
  const blocks: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(def|class)\s+([A-Za-z_]\w*)/.exec(lines[i]);
    if (!m || !new RegExp(`\\b${m[2]}\\b`).test(prompt)) continue;
    // Collect the full header (a signature can span lines until the line ending with ':').
    let j = i;
    while (j < lines.length && !/:\s*(#.*)?$/.test(lines[j])) j++;
    const header = lines.slice(i, j + 1);
    if (m[1] === 'class') {
      // Classes the prompt names (e.g. an exception) are given in full: they're part of the spec.
      let k = j + 1;
      while (k < lines.length && (lines[k].startsWith(' ') || lines[k].trim() === '')) k++;
      blocks.push(lines.slice(i, k).join('\n').trimEnd());
    } else {
      blocks.push([...header, '    # your code here', '    raise NotImplementedError'].join('\n'));
    }
    i = j;
  }
  // Only imports the visible signatures need (e.g. `sleep=time.sleep`); others would hint at the approach.
  const shown = blocks.join('\n');
  const imports = lines.filter((l) => {
    const m = /^(?:import\s+(.+)|from\s+\S+\s+import\s+(.+))$/.exec(l);
    const names = (m?.[1] ?? m?.[2] ?? '').split(',').map(
      (n) =>
        n
          .trim()
          .split(/\s+as\s+/)
          .pop() ?? '',
    );
    return names.some((n) => n && new RegExp(`\\b${n}\\b`).test(shown));
  });
  return [...(imports.length ? [imports.join('\n')] : []), ...blocks].join('\n\n\n') + '\n';
}
