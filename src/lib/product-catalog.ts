export const PRODUCT_CATEGORIES = [
  { name: "Placas de inicio", skuPrefix: "DEV", subcategories: ["Arduino", "ESP32 y ESP8266", "STM32", "Raspberry Pi", "Micro:bit", "Otras placas"] },
  { name: "IoT e inalámbricos", skuPrefix: "IOT", subcategories: ["Wi-Fi", "Bluetooth", "RF y LoRa", "GSM y GPS", "Antenas", "Otros módulos"] },
  { name: "Módulos de potencia", skuPrefix: "PWR", subcategories: ["Step-down", "Step-up", "Cargadores de batería", "Fuentes", "Relés", "Otros módulos"] },
  { name: "Componentes pasivos", skuPrefix: "PAS", subcategories: ["Resistencias", "Capacitores", "Inductores", "Potenciómetros", "Cristales y osciladores", "Otros pasivos"] },
  { name: "Semiconductores", skuPrefix: "SEM", subcategories: ["Diodos", "Transistores", "MOSFETs", "Reguladores", "Circuitos integrados", "Optoelectrónica"] },
  { name: "Sensores", skuPrefix: "SNS", subcategories: ["Temperatura y humedad", "Distancia y proximidad", "Movimiento", "Luz y color", "Gas y calidad de aire", "RFID y biometría"] },
  { name: "Pantallas", skuPrefix: "DSP", subcategories: ["LCD", "OLED", "Táctiles", "LED", "Accesorios de pantalla"] },
  { name: "Robótica y drivers", skuPrefix: "ROB", subcategories: ["Motores DC", "Servomotores", "Motores paso a paso", "Drivers", "Chasis y mecánica", "Actuadores"] },
  { name: "Prototipado y cables", skuPrefix: "PRT", subcategories: ["Protoboards", "Jumpers", "Cables", "Conectores", "Adaptadores", "Kits"] },
  { name: "Herramientas y medición", skuPrefix: "TLS", subcategories: ["Multímetros", "Soldadura", "Fuentes de laboratorio", "Pinzas y herramientas", "Medición", "Accesorios"] },
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export function getProductCategory(name: string) {
  return PRODUCT_CATEGORIES.find((category) => category.name === name);
}

export function createSuggestedProductSku(categoryName: string) {
  const prefix = getProductCategory(categoryName)?.skuPrefix ?? "PRD";
  const token = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `NUB-${prefix}-${token}`;
}
