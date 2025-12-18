# Volume Discount App

A Shopify app that creates "Buy 2, get X% off" automatic discounts using Shopify Functions. Merchants can configure which products qualify and what discount percentage to apply through an admin UI.

## Features

- 🎯 **Admin Configuration**: Select products and set discount percentage (1-80%) through an intuitive UI
- 🛒 **Automatic Discounts**: Applies discounts automatically when customers add qualifying products to cart
- 📦 **Minimum Quantity**: Requires customers to buy at least 2 units to receive the discount
- 🎨 **Product Page Widget**: Shows "Buy 2, get X% off" message on qualifying product pages
- 💾 **Metafield Storage**: Configuration stored in shop metafields for reliability

## Quick Start

### Prerequisites

1. **Node.js**: [Download and install](https://nodejs.org/en/download/) (v18 or higher recommended)
2. **Shopify Partner Account**: [Create an account](https://partners.shopify.com/signup)
3. **Development Store**: [Create a development store](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store)
4. **Shopify CLI**: Install globally
   ```bash
   npm install -g @shopify/cli@latest
   ```

### Installation

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd volume-discount-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   shopify app dev
   ```

4. Press **P** to open the app URL and install it on your development store

5. Navigate to the app in your Shopify admin to configure discounts

## How to Use

### 1. Configure Discount Settings

1. Open the app in your Shopify admin
2. Navigate to the "Discount Configuration" page
3. Click **"Select Products"** to choose which products should have the volume discount
4. Set the **Minimum Quantity** (default: 2)
5. Set the **Discount Percentage** (1-80%)
6. Click **"Save Configuration"**

### 2. Add Widget to Product Pages

1. Go to **Online Store > Themes** in your Shopify admin
2. Click **Customize** on your active theme
3. Navigate to a product page
4. Click **Add block** in the product information section
5. Select **"Volume Discount Widget"** from the app blocks
6. Save your theme

### 3. Test the Discount

1. Visit a configured product page - you should see "Buy 2, get X% off"
2. Add 1 unit to cart - no discount applied
3. Add 2+ units to cart - discount automatically applies
4. Check cart/checkout to verify the discount amount

## Configuration Storage

The app stores configuration in a shop metafield:

- **Namespace**: `volume_discount`
- **Key**: `rules`
- **Type**: JSON
- **Structure**:
  ```json
  {
    "products": ["gid://shopify/Product/123", "gid://shopify/Product/456"],
    "minQty": 2,
    "percentOff": 10
  }
  ```

You can view this metafield using the GraphiQL Admin API:
```graphql
query {
  shop {
    metafield(namespace: "volume_discount", key: "rules") {
      value
    }
  }
}
```

## Architecture

### Components

1. **Admin UI** (`app/routes/app.discount-config.jsx`)
   - Product picker for selecting qualifying products
   - Form inputs for minQty and percentOff
   - Saves configuration to shop metafield using GraphQL mutation

2. **Discount Function** (`extensions/volume-discount-function/`)
   - Runs on `cart.lines.discounts.generate.run` target
   - Reads configuration from shop metafield
   - Applies percentage discount to qualifying cart lines
   - Only applies when quantity >= minQty

3. **Theme App Extension** (`extensions/volume-discount-widget/`)
   - Liquid template block for product pages
   - Displays "Buy X, get Y% off" message
   - Only shows on configured products

### Build

Build the app by running the command below with the package manager of your choice:

Using yarn:

```shell
yarn build
```

Using npm:

```shell
npm run build
```

Using pnpm:

```shell
pnpm run build
```

## Hosting

When you're ready to set up your app in production, you can follow [our deployment documentation](https://shopify.dev/docs/apps/launch/deployment) to host it externally. From there, you have a few options:

- [Google Cloud Run](https://shopify.dev/docs/apps/launch/deployment/deploy-to-google-cloud-run): This tutorial is written specifically for this example repo, and is compatible with the extended steps included in the subsequent [**Build your app**](tutorial) in the **Getting started** docs. It is the most detailed tutorial for taking a React Router-based Shopify app and deploying it to production. It includes configuring permissions and secrets, setting up a production database, and even hosting your apps behind a load balancer across multiple regions. 
- [Fly.io](https://fly.io/docs/js/shopify/): Leverages the Fly.io CLI to quickly launch Shopify apps to a single machine. 
- [Render](https://render.com/docs/deploy-shopify-app): This tutorial guides you through using Docker to deploy and install apps on a Dev store. 
- [Manual deployment guide](https://shopify.dev/docs/apps/launch/deployment/deploy-to-hosting-service): This resource provides general guidance on the requirements of deployment including environment variables, secrets, and persistent data. 

When you reach the step for [setting up environment variables](https://shopify.dev/docs/apps/deployment/web#set-env-vars), you also need to set the variable `NODE_ENV=production`.

## Gotchas / Troubleshooting

### Database tables don't exist

If you get an error like:

```
The table `main.Session` does not exist in the current database.
```

Create the database for Prisma. Run the `setup` script in `package.json` using `npm`, `yarn` or `pnpm`.

### Navigating/redirecting breaks an embedded app

Embedded apps must maintain the user session, which can be tricky inside an iFrame. To avoid issues:

1. Use `Link` from `react-router` or `@shopify/polaris`. Do not use `<a>`.
2. Use `redirect` returned from `authenticate.admin`. Do not use `redirect` from `react-router`
3. Use `useSubmit` from `react-router`.

This only applies if your app is embedded, which it will be by default.

### Webhooks: shop-specific webhook subscriptions aren't updated

If you are registering webhooks in the `afterAuth` hook, using `shopify.registerWebhooks`, you may find that your subscriptions aren't being updated.  

Instead of using the `afterAuth` hook declare app-specific webhooks in the `shopify.app.toml` file.  This approach is easier since Shopify will automatically sync changes every time you run `deploy` (e.g: `npm run deploy`).  Please read these guides to understand more:

1. [app-specific vs shop-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions)
2. [Create a subscription tutorial](https://shopify.dev/docs/apps/build/webhooks/subscribe/get-started?deliveryMethod=https)

If you do need shop-specific webhooks, keep in mind that the package calls `afterAuth` in 2 scenarios:

- After installing the app
- When an access token expires

During normal development, the app won't need to re-authenticate most of the time, so shop-specific subscriptions aren't updated. To force your app to update the subscriptions, uninstall and reinstall the app. Revisiting the app will call the `afterAuth` hook.

### Webhooks: Admin created webhook failing HMAC validation

Webhooks subscriptions created in the [Shopify admin](https://help.shopify.com/en/manual/orders/notifications/webhooks) will fail HMAC validation. This is because the webhook payload is not signed with your app's secret key.  

The recommended solution is to use [app-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions) defined in your toml file instead.  Test your webhooks by triggering events manually in the Shopify admin(e.g. Updating the product title to trigger a `PRODUCTS_UPDATE`).

### Webhooks: Admin object undefined on webhook events triggered by the CLI

When you trigger a webhook event using the Shopify CLI, the `admin` object will be `undefined`. This is because the CLI triggers an event with a valid, but non-existent, shop. The `admin` object is only available when the webhook is triggered by a shop that has installed the app.  This is expected.

Webhooks triggered by the CLI are intended for initial experimentation testing of your webhook configuration. For more information on how to test your webhooks, see the [Shopify CLI documentation](https://shopify.dev/docs/apps/tools/cli/commands#webhook-trigger).

### Incorrect GraphQL Hints

By default the [graphql.vscode-graphql](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) extension for will assume that GraphQL queries or mutations are for the [Shopify Admin API](https://shopify.dev/docs/api/admin). This is a sensible default, but it may not be true if:

1. You use another Shopify API such as the storefront API.
2. You use a third party GraphQL API.

If so, please update [.graphqlrc.ts](https://github.com/Shopify/shopify-app-template-react-router/blob/main/.graphqlrc.ts).

### Using Defer & await for streaming responses

By default the CLI uses a cloudflare tunnel. Unfortunately  cloudflare tunnels wait for the Response stream to finish, then sends one chunk.  This will not affect production.

To test [streaming using await](https://reactrouter.com/api/components/Await#await) during local development we recommend [localhost based development](https://shopify.dev/docs/apps/build/cli-for-apps/networking-options#localhost-based-development).

### "nbf" claim timestamp check failed

This is because a JWT token is expired.  If you  are consistently getting this error, it could be that the clock on your machine is not in sync with the server.  To fix this ensure you have enabled "Set time and date automatically" in the "Date and Time" settings on your computer.

### Using MongoDB and Prisma

If you choose to use MongoDB with Prisma, there are some gotchas in Prisma's MongoDB support to be aware of. Please see the [Prisma SessionStorage README](https://www.npmjs.com/package/@shopify/shopify-app-session-storage-prisma#mongodb).

### Unable to require(`C:\...\query_engine-windows.dll.node`).

Unable to require(`C:\...\query_engine-windows.dll.node`).
  The Prisma engines do not seem to be compatible with your system.

  query_engine-windows.dll.node is not a valid Win32 application.

**Fix:** Set the environment variable:
```shell
PRISMA_CLIENT_ENGINE_TYPE=binary
```

This forces Prisma to use the binary engine mode, which runs the query engine as a separate process and can work via emulation on Windows ARM64.

## Limitations & Next Steps

### Current Limitations

- Discount applies per cart line (not cumulative across multiple products)
- Minimum quantity is configurable but defaults to 2
- Widget styling is basic and may need theme-specific adjustments
- No support for variant-specific discounts

### Potential Enhancements

- Add support for tiered discounts (e.g., Buy 2 get 10% off, Buy 5 get 20% off)
- Support for collection-based discounts instead of individual products
- Cart page widget in addition to product page widget
- Admin dashboard showing discount usage analytics
- Support for scheduling discounts (start/end dates)

## Tech Stack

- **Framework**: React Router
- **UI**: Shopify Polaris Web Components
- **Backend**: Node.js with Shopify App Bridge
- **Database**: Prisma with SQLite (for session storage)
- **Extensions**: Shopify Functions + Theme App Extensions

## Resources

- [Shopify Functions Documentation](https://shopify.dev/docs/api/functions)
- [Discount Function API](https://shopify.dev/docs/api/functions/reference/cart-and-checkout-validation/graphql/common-objects/discountapplicationstrategy)
- [Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [Metafields Guide](https://shopify.dev/docs/apps/build/custom-data/metafields)
- [React Router Shopify App Docs](https://shopify.dev/docs/api/shopify-app-react-router)
