# Recommended Electronics Inventory For Nubel Store

## Scope

This is a first purchasing shortlist for the electronics store only. It excludes the 3D printing quote/manufacturing workflow.

The list is based on public catalog signals from Bolivian electronics stores and practical demand for Arduino, ESP32, STM32, power modules, passive components, prototyping, repair, and education.

Important: most stores do not expose real sales volume. Treat "best sellers" here as a mix of:

- products explicitly shown in a "most sold" or featured area,
- products repeatedly present in local catalogs,
- common educational/prototyping demand,
- high-rotation consumables for electronics work.

## Sources Checked

- EPY Electronica: public categories include Arduino, STM32, Espressif, Raspberry Pi, sensors, modules, drivers, communication modules, microcontrollers, ICs and electronic components.
  - https://epyelectronica.com/
  - https://epyelectronica.com/categoria-producto/placas/
  - https://epyelectronica.com/categoria-producto/placas/espressif/
- Ardunel: public homepage/category data shows robotics/electronics categories, a "Los mas vendidos" section, resistors, LEDs, jumpers, ESP32, Arduino Uno/Nano, STM32F407 and related development boards.
  - https://ventas.ardunel.com.bo/
- Sawers: public catalog/search results show Arduino boards, STM32F103C8T6, ESP32 boards, XL4015 step-down modules, shields and power regulator categories.
  - https://tienda.sawers.com.bo/arduino-uno-r3
  - https://tienda.sawers.com.bo/esp32-de-38-pines-wifi---bluetooth
  - https://tienda.sawers.com.bo/placa-desarrollo-esp32-dualcore-wifi-bluetooth-2019
  - https://tienda.sawers.com.bo/regulador-step-down-xl4015-5a-

## Evidence Notes

- Ardunel exposes a "Los mas vendidos" area with LED 5mm, 1/2W resistors, jumper wires, 1/4W resistors and related basic components.
- Ardunel featured development-board listings include Arduino Uno R3, ESP32 30 pin, ESP32 38 pin Type-C, Wemos D1 Mini ESP8266, STM32F407VET6, Pro Micro and Mega-related boards.
- EPY exposes strong catalog categories for Arduino, STM32, Espressif, sensors, modules, shields, drivers and communication modules; its Espressif category lists ESP32 30 pin, ESP32 38 pin, ESP32-CAM, NodeMCU ESP8266 and Wemos D1 Mini variants.
- Sawers product pages confirm local availability/search presence for Arduino Uno R3, ESP32 30/38 pin and XL4015 5A step-down modules.

## Buy First: High Rotation Core

These should be the first China order because they are broad-demand items for students, makers, repair, prototyping and embedded systems.

| Priority | Product | Suggested initial order | Why |
|---|---:|---:|---|
| A | Arduino Uno R3 compatible, CH340/ATmega328P | 50-100 pcs | Entry-level education and prototyping board. Always asked by students. |
| A | Arduino Nano V3 compatible, CH340/ATmega328P | 80-150 pcs | Smaller and cheaper than Uno, useful for final projects. |
| A | Arduino Mega 2560 R3 compatible | 20-40 pcs | Used when many I/O pins are needed, robotics and automation. |
| A | ESP32 DevKit 30 pin / 38 pin, CH340 or CP2102 | 80-150 pcs | WiFi/Bluetooth projects, IoT, automation. High practical demand. |
| A | STM32F103C8T6 "Blue Pill" | 50-100 pcs | Cheap ARM board, common in embedded learning and advanced projects. |
| A | XL4015 step-down 5A module | 50-100 pcs | Very useful power module for DC projects, batteries, robotics. |
| A | MT3608 step-up boost converter | 50-100 pcs | Small boost module, common with batteries and portable projects. |
| A | LM2596 step-down buck converter | 80-150 pcs | Classic low-cost regulator module, strong rotation. |
| A | Resistor assortment 1/4W 5% | 100-300 kits or bulk values | Consumable. Ardunel exposes resistors in best-seller/product areas. |
| A | LED 5mm assorted colors | 1000+ pcs mixed | Very high rotation for education, indicators and testing. |
| A | Jumper wires M-M, M-F, F-F 20cm | 100-200 packs | Required with Arduino, ESP32, protoboard and sensors. |
| A | Protoboard 830 points and mini breadboard | 50-100 pcs each | Essential for every beginner/electronics kit. |

## Microcontrollers And Development Boards

| Priority | Product | Suggested initial order | Notes |
|---|---:|---:|---|
| A | Arduino Uno R3 compatible | 50-100 | Stock both "with cable" and "without cable" if price allows. |
| A | Arduino Nano V3 compatible | 80-150 | Prefer CH340 USB-C or mini/micro USB depending supplier price. |
| B | Arduino Pro Mini 5V 16MHz | 30-60 | Needs USB-TTL adapter, good for compact projects. |
| B | Arduino Micro / Pro Micro ATmega32U4 | 20-50 | Keyboard/HID projects, niche but useful. |
| B | Arduino Mega 2560 R3 | 20-40 | Lower rotation than Uno/Nano but important. |
| A | ESP32 DevKit V1 30 pin | 80-150 | Main IoT product. |
| A | ESP32 WROOM 38 pin | 50-100 | Common alternative format. |
| B | ESP32-CAM + OV2640 | 30-80 | Camera projects, surveillance prototypes. |
| B | ESP8266 NodeMCU | 40-80 | Still asked because it is cheap. |
| B | Wemos D1 Mini ESP8266 | 40-80 | Compact WiFi projects. |
| A | STM32F103C8T6 Blue Pill | 50-100 | Strong embedded value. |
| B | STM32F401 / STM32F411 Black Pill | 20-50 | Better performance than F103, growing demand. |
| B | STM32F407VET6 board | 10-25 | More expensive, advanced users. |

## Power Modules

| Priority | Product | Suggested initial order | Notes |
|---|---:|---:|---|
| A | LM2596 adjustable step-down | 80-150 | Classic buck regulator. |
| A | XL4015 5A step-down | 50-100 | Sawers has several XL4015 variants. |
| B | XL4015 5A with voltmeter | 30-60 | Good upsell vs standard XL4015. |
| B | XL4016 8A/10A step-down | 20-50 | Higher current projects. Use honest specs. |
| A | MT3608 step-up boost | 50-100 | Portable battery projects. |
| B | LM2577 step-up | 20-50 | Higher-current boost alternative. |
| A | AMS1117 3.3V modules | 100-200 | ESP32/sensor logic power. |
| A | MB102 breadboard power supply | 50-100 | Pairs with protoboards. |
| B | TP4056 charger module USB-C/Micro USB | 80-150 | Lithium battery projects. |
| B | BMS 1S/2S/3S boards | 30-80 each | Battery protection demand. |

## Passive Components

| Priority | Product | Suggested initial order | Notes |
|---|---:|---:|---|
| A | Resistor kit 1/4W 5%, E12/E24 common values | 100-300 kits or bulk | Must-have. Include 220R, 330R, 1K, 2.2K, 4.7K, 10K, 47K, 100K. |
| B | Resistor kit 1/2W 5% | 50-100 kits or bulk | Repair/power circuits. Ardunel lists 1/2W resistors. |
| A | Ceramic capacitor kit | 100-200 kits | Include 10pF, 22pF, 100nF, 1nF, 10nF. |
| A | Electrolytic capacitor kit | 100-200 kits | Include 1uF, 10uF, 47uF, 100uF, 220uF, 470uF, 1000uF. |
| B | Film capacitor kit | 30-80 kits | Repair/audio/power filtering. |
| A | Potentiometer kit 10K/100K | 50-100 kits | User controls and calibration. |
| B | Trimpots 10K/100K | 100-200 pcs | Calibration in modules and analog circuits. |

## Semiconductors

| Priority | Product | Suggested initial order | Notes |
|---|---:|---:|---|
| A | 1N4007 diode | 500-1000 pcs | General rectifier. |
| A | 1N4148 signal diode | 500-1000 pcs | Logic/signal circuits. |
| A | SS14 / SS34 Schottky diode | 200-500 pcs | Power and switching circuits. |
| A | 2N2222 NPN transistor | 300-500 pcs | General switching. |
| A | S8050 / S8550 transistor pair | 300-500 pcs each | Low-cost common transistors. |
| A | BC547 / BC557 transistor pair | 200-500 pcs each | Education and general use. |
| A | IRFZ44N MOSFET | 100-300 pcs | Already in Nubel seed, useful for motor/LED power switching. |
| B | IRLZ44N logic-level MOSFET | 100-200 pcs | Better for Arduino/ESP32 gate drive than IRFZ44N. |
| B | AOD4184 / AO3400 MOSFET modules | 100-200 pcs | Compact logic-level switching. |
| A | 7805 / 7812 linear regulators | 100-200 pcs each | Repair and basic power. |
| B | LM317 adjustable regulator | 50-100 pcs | Educational/power supply projects. |

## Sensors And Common Modules

| Priority | Product | Suggested initial order | Notes |
|---|---:|---:|---|
| A | HC-SR04 ultrasonic sensor | 50-100 | Robotics education. |
| A | DHT11 / DHT22 | 50-100 each | Temperature/humidity projects. |
| A | DS18B20 waterproof temperature sensor | 50-100 | Practical measurement projects. |
| A | PIR motion sensor HC-SR501 | 50-100 | Security/automation. |
| A | Relay module 1 channel / 2 channel / 4 channel | 50-100 each | Automation, lamps, pumps. |
| A | OLED 0.96 inch I2C SSD1306 | 50-100 | Very popular with ESP32/Arduino. |
| A | LCD 16x2 + I2C backpack | 50-100 | Education and control panels. |
| B | MPU6050 accelerometer/gyro | 30-80 | Robotics and IMU projects. |
| B | MQ gas sensors kit | 20-50 each | Educational/environmental projects. |
| B | RFID RC522 kit | 30-80 | Access systems. |

## Motors, Drivers And Robotics

| Priority | Product | Suggested initial order | Notes |
|---|---:|---:|---|
| A | L298N motor driver | 50-100 | Classic educational robotics. |
| A | A4988 stepper driver | 50-100 | CNC/3D/stepper projects. |
| A | DRV8825 stepper driver | 30-80 | Higher-current alternative. |
| A | SG90 micro servo | 100-200 | Very high robotics rotation. |
| B | MG996R servo | 30-80 | Higher torque robotics. |
| B | NEMA17 stepper motor | 20-50 | CNC/automation. |
| B | TT gear motor + wheel kits | 50-100 | Robot cars. |

## Prototyping, Connectors And Tools

| Priority | Product | Suggested initial order | Notes |
|---|---:|---:|---|
| A | Dupont jumper packs M-M/M-F/F-F | 100-200 packs | Always needed. |
| A | Header pins male/female 2.54mm | 500+ strips | Repair and module soldering. |
| A | Screw terminals KF301/KF128 | 300-500 pcs | Power/control wiring. |
| A | USB cables: Type-B, Micro USB, Type-C | 100-200 each | Required for boards. |
| A | Protoboards 830 and 400 points | 50-100 each | Core prototyping. |
| B | Perfboard / universal PCB | 100-200 pcs | Final soldered prototypes. |
| B | JST-XH connectors 2/3/4 pin | 100-300 sets | Batteries/sensors. |
| B | Heat shrink tubing kits | 50-100 kits | Repair/prototyping. |
| B | Solder wire, flux, solder wick | 30-80 each | Consumable but depends on tool strategy. |

## Suggested First China Order Bundle

If cash is limited, start with this lean but strong mix:

1. Arduino Uno R3 compatible: 50 pcs.
2. Arduino Nano V3 compatible: 100 pcs.
3. Arduino Mega 2560: 20 pcs.
4. ESP32 DevKit 30 pin/38 pin: 100 pcs mixed.
5. STM32F103C8T6 Blue Pill: 50 pcs.
6. LM2596 step-down: 100 pcs.
7. XL4015 5A step-down: 60 pcs.
8. MT3608 step-up: 80 pcs.
9. TP4056 charger: 100 pcs.
10. Resistor kits 1/4W: 100 kits or bulk values.
11. Ceramic capacitor kits: 100 kits.
12. Electrolytic capacitor kits: 100 kits.
13. Diode/transistor starter packs: 100-300 pcs per common reference.
14. Jumper wire packs: 150 packs mixed.
15. Protoboards: 100 mixed.
16. OLED 0.96 I2C: 50 pcs.
17. Relay modules: 100 mixed.
18. HC-SR04, DHT11/DHT22, PIR: 50 pcs each.

## Products To Avoid Overbuying At First

- Expensive STM32F4 boards: buy small quantities first.
- Raspberry Pi boards: high ticket, supply/pricing risk.
- Niche FPGA boards: low rotation unless you already have buyers.
- Industrial tools and measurement equipment: better as preorder/cotizacion at first.
- Very specific ICs without known local demand.

## Next Step Before Importing

For each item, confirm:

- exact supplier model,
- USB connector type,
- driver chip,
- package/quality grade,
- expected landed cost,
- local target sale price,
- warranty risk,
- whether it should be sold as loose unit, kit, or bundle.

Recommended Nubel Store structure:

- Starter boards
- Wireless and IoT
- Power modules
- Passive components
- Semiconductors
- Sensors
- Displays
- Robotics and drivers
- Prototyping and cables
