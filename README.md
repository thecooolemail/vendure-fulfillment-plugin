# Vendure Fulfillment Dashboard Plugin

- A Fulfilment dashboard where each channel/shop can check their own dashboard to view critical information in order to successfully process day to day orders (delivery, collection and preparations)

## Getting Started

1. And then add this to your `vendure-config.ts`.

```ts
import { VendureFulfillmentsDashboardPlugin } from 'vendure-plugin-fulfillment-dashboard';

plugins: [VendureFulfillmentsDashboardPlugin];
```

2. Make sure to run database migrations after updating your `vendure-config.ts`
3. Make sure your google api key is in .env file with the key `API_KEY`
