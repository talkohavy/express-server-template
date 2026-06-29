import pluginJs from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import perfectionist from 'eslint-plugin-perfectionist';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist'],
  },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      perfectionist,
      import: importPlugin,
    },
  },
  {
    rules: {
      'no-useless-concat': 'error', // <--- Disallow (no auto fix): const foo = 'a' + 'b';
      yoda: 'error',
      'prefer-object-spread': 'error',
      'object-shorthand': 'error', // <--- Disallow & fix: const foo = { x: x, y: y, z: z };
      'no-useless-return': 'error', // <--- Disallow unnecessary return statements.
      'no-useless-rename': 'error', // <--- Disallow (no auto fix): import { foo as foo } from 'bar';
      'no-useless-constructor': 'error', // <--- Disallow empty constructors.
      'no-useless-computed-key': 'error', // <--- Disallow & fix: const foo = {["a"]: "b"};
      'no-return-assign': 'error', // <--- Disallow assignment expressions in return statements.
      'no-param-reassign': 'error', // <--- Disallow assignment to parameters.
      'no-new-object': 'error', // <--- Disallow the use of the `new` operator with the `Object` object.
      'no-new-wrappers': 'error', // <--- Disallow new operators with the String, Number, and Boolean objects.
      'no-nested-ternary': 'error',
      'no-negated-condition': 'error',
      'no-multi-assign': 'error',
      'no-lone-blocks': 'error',
      'no-else-return': 'error',
      'new-cap': 'error', // <--- Capital letter is required for class names.
      'no-unreachable-loop': 'error',
      'no-self-compare': 'error',
      // 'no-promise-executor-return': 'error',
      'no-async-promise-executor': 'error',

      // Error Rules
      'no-throw-literal': 'error',
      'import/newline-after-import': ['error', { count: 1 }],
      'import/no-duplicates': ['error', { 'prefer-inline': false }], // <--- Use only this rule! Do NOT use the 'no-duplicate-imports' rule, as it doesn't know how to auto-fix.
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
          sortBy: 'path', // <--- defaults to 'path'. Options are: 'path' | 'specifier'
          ignoreCase: true,
          specialCharacters: 'keep',
          internalPattern: ['^@src/.+', '^~/.+'], // <--- defaults to default: ['^~/.+', '^@/.+']. Specifies a pattern for identifying internal imports. This is useful for distinguishing your own modules from external dependencies.
          partitionByComment: false,
          newlinesBetween: 0, // <--- number | 'ignore' (0 = no newlines, 1 = one newline, etc.)
          maxLineLength: undefined,
          groups: [
            'react',
            'builtin', // <--- import fs from 'fs';
            'external', // <--- import express from 'express';
            'internal', // <--- import myUtil from '@src/myUtil';
            ['parent', 'sibling', 'index'],
            'type-builtin',
            'type-external',
            'type-internal',
            ['type-parent', 'type-sibling', 'type-index'],
            'unknown',
          ],
          customGroups: [
            {
              groupName: 'react',
              selector: 'type',
              elementNamePattern: ['^react$', '^react-.+'],
            },
            {
              groupName: 'react',
              elementNamePattern: ['^react$', '^react-.+'],
            },
          ],
          environment: 'node', // <--- Possible Options: 'node' | 'bun'
        },
      ],
      'import/order': [
        'error',
        {
          groups: [['builtin', 'external', 'internal', 'unknown', 'parent', 'sibling', 'index', 'object', 'type']],
          'newlines-between': 'ignore',
          alphabetize: {
            order: 'ignore',
            caseInsensitive: true,
          },
          named: {
            enabled: true,
            types: 'types-last',
          },
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'all',
          argsIgnorePattern: '(^_|^req$|^res$|^next$)',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: false,
          varsIgnorePattern: '^React$',
        },
      ],

      // Warning Rules
      'no-debugger': 'warn',

      // Off Rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'preserve-caught-error': 'off',

      // 'sort-imports': [ <--- DO NOT ENABLE! Collides with perfectionist/sort-imports
      //   'error',
      //   {
      //     ignoreCase: false,
      //     ignoreDeclarationSort: false,
      //     ignoreMemberSort: false,
      //     memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
      //     allowSeparatedGroups: false,
      //   },
      // ],
      // 'sort-keys': ['error', 'asc', { caseSensitive: true, natural: false, minKeys: 2 }], <--- DO NOT ENABLE! Collides with perfectionist/sort-imports
    },
  },
];
