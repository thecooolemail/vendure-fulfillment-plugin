import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import {
  AutoIncrementIdStrategy,
  DefaultLogger,
  DefaultSearchPlugin,
  LogLevel,
  defaultOrderProcess,
  mergeConfig,
} from '@vendure/core';
import {
  createTestEnvironment,
  registerInitializer,
  SqljsInitializer,
  testConfig,
} from '@vendure/testing';
import path from 'path';
import { initialData } from './initial-data';

import { VendureFulfillmentsDashboardPlugin } from '../dist';
import { compileUiExtensions } from '@vendure/ui-devkit/compiler';
import { testPaymentMethod } from './test-payment-method';
import {Preparations, Fulfill} from '../src/custom-states'
// import {VendureFulfillmentsDashboardPlugin} from '../src/plugin'

require('dotenv').config();

(async () => {
  registerInitializer('sqljs', new SqljsInitializer('__data__'));
  const devConfig = mergeConfig(testConfig, {
    logger: new DefaultLogger({ level: LogLevel.Debug }),
    orderOptions: { 
      process: [defaultOrderProcess, Preparations, Fulfill ] as any
    },
    customFields: {
      Channel: [
          {name: "Logitude", type: 'string'},
          {name: "Latitude", type: 'string'},
          {name: "Address", type: 'string'},
          {name: "Hours", type: 'string'},
          {name: "Phone", type: 'string'},
          {name: "google_place_id", type: 'string'},
      ],
      Address:[
          {name: "Place_id", type: 'string'},
          {name: "Long", type: 'string'},
          {name: "Lat", type: 'string'}
      ],
      Order:[
          {name: "Is_Delivery", type: "boolean", defaultValue: false},
          {name: "Delivery_Collection_Date", type: "datetime" },
          {name: "Time_Slot", type: "string" },
          {name: "Order_Note", type: "string" },
          {name: "Reschedule_Reason", type: "string" },
          {name: "Review", type: "int" },
          {name: "google_place_id", type: "string"},
      ],
    },
    plugins: [
      AssetServerPlugin.init({
        assetUploadDir: path.join(__dirname, '__data__/assets'),
        route: 'assets',
      }),
      AdminUiPlugin.init({
        route: 'admin',
        port: 3002,
        app: compileUiExtensions({
          outputPath: path.join(__dirname, '__admin-ui'),
          extensions: [VendureFulfillmentsDashboardPlugin.ui],
          devMode: true,
        }),
      }),
      DefaultSearchPlugin,
      VendureFulfillmentsDashboardPlugin
    ],
    apiOptions: {
      shopApiPlayground: true,
      adminApiPlayground: true,
    },
    authOptions: {
      tokenMethod: 'bearer',
    },
    paymentOptions: {
      paymentMethodHandlers: [testPaymentMethod],
    },
    entityOptions:{
      entityIdStrategy: new AutoIncrementIdStrategy()
    }
  });
  const { server } = createTestEnvironment(devConfig);
  await server.init({
    initialData: {
      ...initialData,
      paymentMethods: [
        {
          name: testPaymentMethod.code,
          handler: { code: testPaymentMethod.code, arguments: [] },
        },
      ],
    },
    productsCsvPath: './test/products-import.csv',
    customerCount: 5,
  });
})();