import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copy } from './locale.ts';
import { previewCopy } from './preview-copy.ts';
import { colorBuilderCopy } from './color-builder-copy.ts';
import { developerCopy } from './developer-copy.ts';

function compareShape(en, tr, path = '') {
  assert.equal(typeof tr, typeof en, path);
  if (typeof en === 'string') {
    assert.ok(en.trim() && tr.trim(), `${path}: empty translation`);
  } else if (typeof en === 'object' && en !== null) {
    if (path.endsWith('.auditPhrases')) {
      assert.ok(Array.isArray(tr) && tr.every(([pattern, text]) => pattern instanceof RegExp && text.trim()), path);
      return;
    }
    assert.deepEqual(Object.keys(tr).sort(), Object.keys(en).sort(), `${path}: keys`);
    for (const key of Object.keys(en)) compareShape(en[key], tr[key], `${path}.${key}`);
  }
}

for (const [name, dictionary] of Object.entries({ studio: copy, preview: previewCopy, builder: colorBuilderCopy, developer: developerCopy })) {
  test(`${name}: complete Turkish and English translations`, () => compareShape(dictionary.en, dictionary.tr, name));
}
