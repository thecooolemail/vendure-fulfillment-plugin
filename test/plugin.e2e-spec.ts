import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DefaultLogger, LogLevel, mergeConfig } from '@vendure/core';
import {
  createTestEnvironment,
  registerInitializer,
  SimpleGraphQLClient,
  PostgresInitializer,
  testConfig,
} from '@vendure/testing';
import { TestServer } from '@vendure/testing/lib/test-server';

import { BrandPlugin } from '../src/brand.plugin';
import { initialData } from './initial-data';

require('dotenv').config();

describe('Example plugin e2e', function () {
  let server: TestServer;
  let adminClient: SimpleGraphQLClient;
  let shopClient: SimpleGraphQLClient;
  let serverStarted = false;

  beforeAll(async () => {
    registerInitializer('postgres', new PostgresInitializer());

    const config = mergeConfig(testConfig, {
      logger: new DefaultLogger({ level: LogLevel.Debug }),
      plugins: [BrandPlugin],
      dbConnectionOptions: {
        type: 'postgres',
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        schema: process.env.DB_SCHEMA,
      }
    });

    ({ server, adminClient, shopClient } = createTestEnvironment(config));
    await server.init({
      initialData,
      productsCsvPath: path.join(__dirname, './product-import.csv'),
    });
  }, 60000);

  it('Should start successfully', async () => {
    await expect(server.app.getHttpServer).toBeDefined;
  });

  // TODO: write your tests here
  it('My little testcase', async () => {
    await expect(true).toBe(true);
  });

  afterAll(() => {
    return server.destroy();
  });
});
