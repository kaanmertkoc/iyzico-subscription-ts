import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('package exports', () => {
  test('exposes a types-only entrypoint', () => {
    const packageJsonUrl = new URL('../package.json', import.meta.url);
    const packageJson = JSON.parse(
      readFileSync(packageJsonUrl, 'utf8')
    ) as {
      exports?: Record<string, unknown>;
    };

    const exportsMap = packageJson.exports as
      | Record<string, unknown>
      | undefined;
    expect(exportsMap).toBeDefined();

    const rootExport = exportsMap?.['.'] as { types?: string } | undefined;
    expect(rootExport?.types).toBe('./dist/types/index.d.ts');

    const typesExport = exportsMap?.['./types'] as
      | { types?: string; import?: string; require?: string }
      | undefined;

    expect(typesExport).toMatchObject({
      types: './dist/types/types/index.d.ts',
      import: './dist/esm/types/index.js',
      require: './dist/cjs/types/index.js',
    });
  });
});
