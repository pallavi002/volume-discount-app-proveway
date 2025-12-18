import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);

    // Fetch current metafield configuration and shop ID
    const response = await admin.graphql(`
    query GetVolumeDiscountConfig {
      shop {
        id
        metafield(namespace: "volume_discount", key: "rules") {
          value
        }
      }
    }
  `);

    const { data } = await response.json();
    const shopId = data?.shop?.id;
    const metafieldValue = data?.shop?.metafield?.value;

    let config = null;
    if (metafieldValue) {
        try {
            config = JSON.parse(metafieldValue);
        } catch (e) {
            console.error("Failed to parse metafield:", e);
        }
    }

    return { config, shopId };
};

export const action = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();

    const productIds = JSON.parse(formData.get("productIds") || "[]");
    const percentOff = parseInt(formData.get("percentOff") || "10");
    const minQty = parseInt(formData.get("minQty") || "2");
    const shopId = formData.get("shopId");

    const config = {
        products: productIds,
        minQty,
        percentOff,
    };

    // Save to metafield
    const response = await admin.graphql(
        `#graphql
      mutation SetVolumeDiscountConfig($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
        {
            variables: {
                metafields: [
                    {
                        namespace: "volume_discount",
                        key: "rules",
                        type: "json",
                        value: JSON.stringify(config),
                        ownerId: shopId,
                    },
                ],
            },
        }
    );

    const { data } = await response.json();

    if (data?.metafieldsSet?.userErrors?.length > 0) {
        return {
            success: false,
            errors: data.metafieldsSet.userErrors
        };
    }

    return { success: true, config };
};

export default function DiscountConfig() {
    const { config, shopId } = useLoaderData();
    const fetcher = useFetcher();
    const shopify = useAppBridge();

    const [selectedProducts, setSelectedProducts] = useState([]);
    const [percentOff, setPercentOff] = useState(10);
    const [minQty, setMinQty] = useState(2);

    useEffect(() => {
        if (config) {
            setPercentOff(config.percentOff || 10);
            setMinQty(config.minQty || 2);
            // Note: We can't pre-populate selectedProducts without fetching product details
            // This would require an additional query
        }
    }, [config]);

    useEffect(() => {
        if (fetcher.data?.success) {
            shopify.toast.show("Discount configuration saved successfully!");
        } else if (fetcher.data?.errors) {
            shopify.toast.show("Error saving configuration", { isError: true });
        }
    }, [fetcher.data, shopify]);

    const handleProductPicker = async () => {
        const selected = await shopify.resourcePicker({
            type: "product",
            multiple: true,
            action: "select",
        });

        if (selected) {
            setSelectedProducts(selected);
        }
    };

    const handleSave = () => {
        const productIds = selectedProducts.map((p) => p.id);

        const formData = new FormData();
        formData.append("productIds", JSON.stringify(productIds));
        formData.append("percentOff", percentOff.toString());
        formData.append("minQty", minQty.toString());
        formData.append("shopId", shopId);

        fetcher.submit(formData, { method: "POST" });
    };

    const isLoading = fetcher.state === "submitting";

    return (
        <s-page heading="Volume Discount Configuration">
            <s-section heading="Discount Settings">
                <s-paragraph>
                    Configure which products should have the "Buy {minQty}, get {percentOff}% off" discount applied.
                </s-paragraph>

                <s-stack direction="block" gap="large">
                    {/* Product Selection */}
                    <s-stack direction="block" gap="base">
                        <s-text variant="heading-sm">Selected Products</s-text>
                        <s-button onClick={handleProductPicker}>
                            {selectedProducts.length > 0
                                ? `${selectedProducts.length} product(s) selected`
                                : "Select Products"}
                        </s-button>

                        {selectedProducts.length > 0 && (
                            <s-stack direction="block" gap="tight">
                                {selectedProducts.map((product) => (
                                    <s-box
                                        key={product.id}
                                        padding="base"
                                        borderWidth="base"
                                        borderRadius="base"
                                    >
                                        <s-text>{product.title}</s-text>
                                    </s-box>
                                ))}
                            </s-stack>
                        )}
                    </s-stack>

                    {/* Minimum Quantity */}
                    <s-stack direction="block" gap="base">
                        <s-text variant="heading-sm">Minimum Quantity</s-text>
                        <input
                            type="number"
                            min="2"
                            max="100"
                            value={minQty}
                            onChange={(e) => setMinQty(parseInt(e.target.value) || 2)}
                            style={{
                                padding: "8px",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                fontSize: "14px",
                            }}
                        />
                        <s-text variant="body-sm">
                            Customers must buy at least this many units to get the discount.
                        </s-text>
                    </s-stack>

                    {/* Discount Percentage */}
                    <s-stack direction="block" gap="base">
                        <s-text variant="heading-sm">Discount Percentage</s-text>
                        <input
                            type="number"
                            min="1"
                            max="80"
                            value={percentOff}
                            onChange={(e) => setPercentOff(parseInt(e.target.value) || 10)}
                            style={{
                                padding: "8px",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                fontSize: "14px",
                            }}
                        />
                        <s-text variant="body-sm">
                            Discount percentage to apply (1-80%).
                        </s-text>
                    </s-stack>

                    {/* Save Button */}
                    <s-button
                        variant="primary"
                        onClick={handleSave}
                        {...(isLoading ? { loading: true } : {})}
                        disabled={selectedProducts.length === 0}
                    >
                        Save Configuration
                    </s-button>
                </s-stack>
            </s-section>

            {/* Current Configuration Display */}
            {config && (
                <s-section heading="Current Configuration">
                    <s-box
                        padding="base"
                        borderWidth="base"
                        borderRadius="base"
                        background="subdued"
                    >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                            <code>{JSON.stringify(config, null, 2)}</code>
                        </pre>
                    </s-box>
                </s-section>
            )}
        </s-page>
    );
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
