import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'http://localhost:3050/admin-api',
  config: {
    scalars: { Money: 'number' },
    namingConvention: { enumValues: 'keep' },
  },
  generates: {
    './src/gql/generated.ts': { plugins: ['typescript'] },
    './src/ui/generated-types.ts': {
      documents: './src/ui/**/*.graphql.ts',
      plugins: [
        {
          add: {
            content: '/* eslint-disable */',
          },
        },
        'typescript',
        'typescript-operations',
        'typed-document-node',
      ],
      config: {
        scalars: {
          ID: 'string',
        },
      },
    },
  },
};

export default config;
