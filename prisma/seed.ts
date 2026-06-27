import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.upsert({
    where: { sku: "MOS-IRFZ44N-TO220" },
    update: {},
    create: {
      name: "IRFZ44N MOSFET N-Channel TO-220",
      sku: "MOS-IRFZ44N-TO220",
      slug: "irfz44n-mosfet-n-channel-to220",
      category: "Semiconductors",
      subcategory: "MOSFETs",
      brand: "Generic",
      shortDescription: "N-Channel MOSFET in TO-220 package for power switching.",
      longDescription:
        "Power MOSFET suitable for DC motors, PWM control, LED strips and similar loads. Verify gate drive requirements before using directly from microcontrollers.",
      priceSale: 8,
      stock: 400,
      minStock: 30,
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
    update: {},
    create: {
      name: "HC-12 433MHz UART Module",
      sku: "RF-HC12-433-UART",
      slug: "modulo-hc12-433mhz-uart",
      category: "Wireless Communication",
      subcategory: "RF",
      brand: "Generic",
      shortDescription: "433MHz UART wireless module for embedded projects.",
      longDescription:
        "HC-12 module for serial wireless communication through UART TX/RX, commonly used with microcontrollers.",
      priceSale: 45,
      stock: 30,
      minStock: 5,
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
