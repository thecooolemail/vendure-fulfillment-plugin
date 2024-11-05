import path from 'path';

import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import {
  AutoIncrementIdStrategy,
  DefaultLogger,
  DefaultSearchPlugin,
  LogLevel,
  mergeConfig,
} from '@vendure/core';
import {
  createTestEnvironment,
  PostgresInitializer,
  registerInitializer,
  testConfig,
} from '@vendure/testing';
import { compileUiExtensions } from '@vendure/ui-devkit/compiler';

import { VendureFulfillmentsDashboardPlugin } from '../src';
import { initialData } from './initial-data';
import { testPaymentMethod } from './test-payment-method';

require('dotenv').config();

registerInitializer('postgres', new PostgresInitializer());
const devConfig = mergeConfig(testConfig, {
  logger: new DefaultLogger({ level: LogLevel.Debug }),
  plugins: [
    AssetServerPlugin.init({
      assetUploadDir: path.join(__dirname, '__data__/assets'),
      route: 'assets',
    }),
    DefaultSearchPlugin.init({
      bufferUpdates: false,
      indexStockStatus: true,
    }),
    VendureFulfillmentsDashboardPlugin,
    AdminUiPlugin.init({
      port: 3002,
      route: 'admin',
      app: compileUiExtensions({
        outputPath: path.join(__dirname, '__admin-ui'),
        extensions: [VendureFulfillmentsDashboardPlugin.ui],
        devMode: true,
      }),
    }),
  ],
  paymentOptions: {
    paymentMethodHandlers: [testPaymentMethod],
  },
  entityOptions: {
    entityIdStrategy: new AutoIncrementIdStrategy(),
  },
  apiOptions: {
    shopApiPlayground: true,
    adminApiPlayground: true,
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME,
      password: process.env.SUPERADMIN_PASSWORD,
    },
    requireVerification: true,
    cookieOptions: {
      secret: process.env.COOKIE_SECRET,
    },
  },
  dbConnectionOptions: {
    type: 'postgres',
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    schema: process.env.DB_SCHEMA,
  },
});
const { server, adminClient, shopClient } = createTestEnvironment(devConfig);
server.init({
  initialData: {
    ...initialData,
    paymentMethods: [
      {
        name: testPaymentMethod.code,
        handler: { code: testPaymentMethod.code, arguments: [] },
      },
    ],
  },
  productsCsvPath: path.join(__dirname, './product-import.csv'),
  customerCount: 5,
});
