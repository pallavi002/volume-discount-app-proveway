import {
  ProductDiscountSelectionStrategy,
} from '../generated/api';

/**
  * @typedef {import("../generated/api").CartInput} RunInput
  * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
  */

/**
  * @param {RunInput} input
  * @returns {CartLinesDiscountsGenerateRunResult}
  */

export function cartLinesDiscountsGenerateRun(input) {
  // Return early if no cart lines
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  // Parse metafield configuration
  const metafieldValue = input.shop?.metafield?.value;
  if (!metafieldValue) {
    // No configuration set, return no discounts
    return { operations: [] };
  }

  let config;
  try {
    config = JSON.parse(metafieldValue);
  } catch (e) {
    console.error('Failed to parse volume discount config:', e);
    return { operations: [] };
  }

  // Extract configuration values
  const { products = [], minQty = 2, percentOff = 10 } = config;

  if (!products.length || percentOff <= 0) {
    return { operations: [] };
  }

  const operations = [];

  // Check each cart line for qualifying products
  for (const line of input.cart.lines) {
    const productId = line.merchandise?.product?.id;

    // Check if this product is in the configured list
    if (!productId || !products.includes(productId)) {
      continue;
    }

    // Check if quantity meets minimum requirement
    if (line.quantity < minQty) {
      continue;
    }

    // Add discount operation for this cart line
    operations.push({
      productDiscountsAdd: {
        candidates: [
          {
            message: `Buy ${minQty}, get ${percentOff}% off`,
            targets: [
              {
                cartLine: {
                  id: line.id,
                },
              },
            ],
            value: {
              percentage: {
                value: percentOff,
              },
            },
          },
        ],
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    });
  }

  return {
    operations,
  };
}