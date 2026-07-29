import { buildMockPaymentPayload } from "@/lib/manufacturing-order";

export type ManufacturingPaymentIntent = {
  provider: "MOCK";
  providerReference: string;
  qrPayload: string;
};

export interface ManufacturingPaymentProvider {
  createIntent(input: { orderId: string; amountBob: number }): ManufacturingPaymentIntent;
}

class MockManufacturingPaymentProvider implements ManufacturingPaymentProvider {
  createIntent({ orderId, amountBob }: { orderId: string; amountBob: number }): ManufacturingPaymentIntent {
    const providerReference = `MOCK-${crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
    return {
      provider: "MOCK",
      providerReference,
      qrPayload: buildMockPaymentPayload(orderId, amountBob, providerReference),
    };
  }
}

// Reemplazar esta instancia por un proveedor bancario firmado cuando Nubel entregue
// sus credenciales, documentación de QR y contrato de webhook.
export const manufacturingPaymentProvider: ManufacturingPaymentProvider = new MockManufacturingPaymentProvider();
