import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.upsert({
    where: { sku: "MOS-IRFZ44N-TO220" },
    update: {
      category: "Semiconductores",
      subcategory: "MOSFETs",
      imageUrl: "/products/IRF44N.png",
    },
    create: {
      name: "IRFZ44N MOSFET N-Channel TO-220",
      sku: "MOS-IRFZ44N-TO220",
      slug: "irfz44n-mosfet-n-channel-to220",
      category: "Semiconductores",
      subcategory: "MOSFETs",
      brand: "Generic",
      shortDescription: "N-Channel MOSFET in TO-220 package for power switching.",
      longDescription:
        "Power MOSFET suitable for DC motors, PWM control, LED strips and similar loads. Verify gate drive requirements before using directly from microcontrollers.",
      priceSale: 8,
      stock: 400,
      minStock: 30,
      imageUrl: "/products/IRF44N.png",
      location: "Initial inventory",
      isActive: true,
      isFeatured: true,
      tags: ["mosfet", "irfz44n", "to-220", "power", "pwm"],
      technicalAttributes: {
        type: "N-Channel MOSFET",
        package: "TO-220",
        applications: ["DC motors", "PWM", "LED strips", "Power loads"],
        warning:
          "Do not confuse with IRLZ44N; verify gate voltage when driving from microcontrollers.",
      },
      technicalWarnings:
        "Do not confuse with IRLZ44N; verify gate voltage when driving from microcontrollers.",
    },
  });

  await prisma.product.upsert({
    where: { sku: "RF-HC12-433-UART" },
    update: {
      category: "IoT e inalámbricos",
      subcategory: "RF",
      imageUrl: "/products/HC12.png",
    },
    create: {
      name: "HC-12 433MHz UART Module",
      sku: "RF-HC12-433-UART",
      slug: "modulo-hc12-433mhz-uart",
      category: "IoT e inalámbricos",
      subcategory: "RF",
      brand: "Generic",
      shortDescription: "433MHz UART wireless module for embedded projects.",
      longDescription:
        "HC-12 module for serial wireless communication through UART TX/RX, commonly used with microcontrollers.",
      priceSale: 45,
      stock: 30,
      minStock: 5,
      imageUrl: "/products/HC12.png",
      location: "Initial inventory",
      isActive: true,
      isFeatured: true,
      tags: ["hc-12", "433mhz", "uart", "rf", "arduino", "stm32", "esp32"],
      technicalAttributes: {
        type: "RF UART Module",
        frequency: "433MHz",
        interface: "UART TX/RX",
        compatible: ["Arduino", "STM32", "ESP32", "PIC"],
      },
    },
  });

  const printers = [
    ["Bambu Lab", "A1 mini", "FDM", 180, 180, 180, "https://us.store.bambulab.com/products/a1-mini"],
    ["Bambu Lab", "A1", "FDM", 256, 256, 256, "https://us.store.bambulab.com/products/a1"],
    ["Bambu Lab", "P1P", "FDM", 256, 256, 256, "https://bambulab.com/en-us/p1p"],
    ["Bambu Lab", "P1S", "FDM", 256, 256, 256, "https://bambulab.com/en-us/p1p"],
    ["Bambu Lab", "X1 Carbon", "FDM", 256, 256, 256, "https://us.store.bambulab.com/products/x1-carbon"],
    ["Bambu Lab", "X1E", "FDM", 256, 256, 256, "https://bambulab.com/en/x1e"],
    ["Prusa", "MK4S", "FDM", 250, 210, 220, "https://www.prusa3d.com/en/product/original-prusa-mk4s-3d-printer-kit-4/"],
    ["Prusa", "CORE One", "FDM", 250, 220, 270, "https://www.prusa3d.com/product/prusa-core-one/"],
    ["Prusa", "XL", "FDM", 360, 360, 360, "https://www.prusa3d.com/en/product/original-prusa-xl-3d-printer-3/"],
    ["Prusa", "MINI+", "FDM", 180, 180, 180, "https://cdn.prusa3d.com/product/original-prusa-mini-semi-assembled-3d-printer-enclosure-bundle-5/"],
    ["Creality", "Ender-3 V3 SE", "FDM", 220, 220, 250, "https://store.creality.com/mx/pages/compare"],
    ["Creality", "K1C", "FDM", 220, 220, 250, "https://store.creality.com/mx/pages/compare"],
    ["Creality", "K2 Plus", "FDM", 350, 350, 350, "https://store.creality.com/uk/products/creality-k2-plus-combo-3d-printer/"],
    ["Anycubic", "Kobra 3", "FDM", 250, 250, 260, "https://store.anycubic.com/products/anycubic-kobra-3"],
    ["Anycubic", "Kobra S1", "FDM", 250, 250, 250, "https://store.anycubic.com/collections/3d-printers/products/kobra-s1"],
    ["Anycubic", "Kobra 2 Max", "FDM", 420, 420, 500, "https://store.anycubic.com/products/kobra-2-max"],
    ["Anycubic", "Kobra 3 Max", "FDM", 420, 420, 500, "https://store.anycubic.com/products/kobra-3-max-combo"],
    ["Elegoo", "Neptune 4 Pro", "FDM", 225, 225, 265, "https://us.elegoo.com/products/elegoo-neptune-4-pro-fdm-3d-printer"],
    ["Elegoo", "Centauri Carbon", "FDM", 256, 256, 256, "https://us.elegoo.com/pages/compare-products"],
    ["Elegoo", "OrangeStorm Giga", "FDM", 800, 800, 1000, "https://us.elegoo.com/pages/elegoo-new-products"],
    ["Anycubic", "Photon Mono X", "RESIN", 192, 120, 245, "https://store.anycubic.com/products/photon-mono-x"],
    ["Anycubic", "Photon Mono 4 Ultra", "RESIN", 153.4, 87, 165, "https://store.anycubic.com/products/photon-mono-4-ultra"],
    ["Anycubic", "Photon Mono M7 Pro", "RESIN", 223, 126, 230, "https://store.anycubic.com/products/photon-mono-m7-pro"],
    ["Anycubic", "Photon Mono M5", "RESIN", 218, 123, 200, "https://store.anycubic.com/blogs/3d-printing-guides/anycubic-photon-mono-m5s-vs-photon-mono-m5"],
    ["Anycubic", "Photon Mono M5s", "RESIN", 218, 123, 200, "https://store.anycubic.com/products/photon-mono-m5s"],
    ["Anycubic", "Photon Mono M5s Pro", "RESIN", 224, 126, 200, "https://store.anycubic.com/blogs/3d-printing-guides/anycubic-photon-mono-m5s-vs-m5s-pro"],
    ["Elegoo", "Mars 5 Ultra", "RESIN", 153.36, 77.76, 165, "https://us.elegoo.com/products/mars-5-ultra-9k-7inch-monochrome-lcd-resin-3d-printer"],
    ["Elegoo", "Mars 4 Ultra", "RESIN", 153.36, 77.76, 165, "https://us.elegoo.com/products/elegoo-mars-4-ultra-msla-resin-3d-printer-with-9k-mono-lcd"],
    ["Elegoo", "Saturn 4 Ultra", "RESIN", 218.88, 122.88, 220, "https://us.elegoo.com/products/saturn-4-ultra-12k-10inch-monochrome-lcd-resin-3d-printer"],
    ["Elegoo", "Saturn 4", "RESIN", 218.88, 122.88, 220, "https://us.elegoo.com/pages/elegoo-new-products"],
    ["Elegoo", "Jupiter SE", "RESIN", 277.848, 156.264, 300, "https://us.elegoo.com/products/elegoo-jupiter-se-6k-mono-msla-3d-printer"],
    ["Elegoo", "Jupiter 2", "RESIN", 302, 162, 300, "https://us.elegoo.com/pages/elegoo-new-products"],
    ["Creality", "HALOT-MAGE PRO", "RESIN", 228, 128, 230, "https://www.creality.com/products/halot-mage-pro-3d-printer"],
    ["Formlabs", "Form 4", "RESIN", 200, 125, 210, "https://formlabs.com/global/products/form-4-basic-package/"],
    ["Formlabs", "Form 4L", "RESIN", 353, 196, 350, "https://formlabs.com/3d-printers/form-4l/"],
    ["Prusa", "SL1S SPEED", "RESIN", 127, 80, 150, "https://help.prusa3d.com/article/faq-frequently-asked-questions_1932?product=xl"],
  ] as const;

  for (const [brand, model, technology, width, depth, height, sourceUrl] of printers) {
    await prisma.printerCatalog.upsert({
      where: { brand_model_technology: { brand, model, technology } },
      update: { buildWidthMm: width, buildDepthMm: depth, buildHeightMm: height, sourceUrl, isVerified: true, isActive: true },
      create: { brand, model, technology, buildWidthMm: width, buildDepthMm: depth, buildHeightMm: height, sourceUrl },
    });
  }

  const materials = [
    ["FDM", "PLA", 1.24],
    ["FDM", "PETG", 1.27],
    ["FDM", "ABS", 1.04],
    ["FDM", "ASA", 1.07],
    ["FDM", "TPU", 1.21],
    ["FDM", "Nylon / PA", 1.14],
    ["FDM", "PC", 1.2],
    ["RESIN", "Resina estándar", null],
    ["RESIN", "Resina PLA-like", null],
    ["RESIN", "Resina ABS-like", null],
    ["RESIN", "Resina tough", null],
    ["RESIN", "Resina lavable al agua", null],
    ["RESIN", "Resina alta temperatura", null],
    ["RESIN", "Resina calcinable", null],
  ] as const;

  for (const [technology, name, defaultDensityGcm3] of materials) {
    await prisma.materialCatalog.upsert({
      where: { technology_name: { technology, name } },
      update: { defaultDensityGcm3, isActive: true },
      create: { technology, name, defaultDensityGcm3 },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
