import {resolve} from 'path';
import {transform} from 'babel-core';
import {readFileSync} from 'fs-extra';
import babelPluginTransformReactPureToComponent from '../src';

function readFixture(fixture, inputOrOutput) {
  return readFileSync(resolve(__dirname, 'fixtures', `${fixture}.${inputOrOutput}.js`)).toString().trim();
}

function expectToTransform(fixture) {
  const inputFixture = readFixture(fixture, 'input');
  const outputFixture = readFixture(fixture, 'output');

  expect(transform(inputFixture, {
    babelrc: false,
    plugins: [babelPluginTransformReactPureToComponent],
  }).code.trim()).toBe(outputFixture);
}

describe('babel-plugin-pure-to-impure-component', () => {
  const tests = {
    'works with React default imports': 'default',
    'reuses an existing Component named import with default export': 'default-reuse',
    'works with React namespace imports': 'namespace',
    'works with named imports': 'named',
    'reuses an existing Component named import': 'named-reuse',
    'ignores undefined superclass identifiers that would otherwise be replaced': 'undefined',
    'ignores classes without superclasses': 'no-super',
    'ignores classes not coming from React': 'non-react',
    'does not overwrite existing reference names': 'no-overwrite',
    'does not remove imports that are still referenced': 'partially-referenced',
  };

  Object.keys(tests).forEach((name) => {
    it(name, () => expectToTransform(tests[name]));
  });
});
