import fs from 'node:fs';
import path from 'node:path';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  ShadingType 
} from 'docx';

async function generateReport() {
  const primaryColor = '006A4E'; // Somali/Ethiopian green tone
  const darkNavy = '1E293B';
  const lightBg = 'F1F5F9';
  const headerBg = '0F172A';

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // Header / Title Block
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'JIJIGA EXPRESS DELIVERY SERVICE',
                font: 'Calibri',
                size: 36, // 18pt
                bold: true,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: 'Systems Analysis & Senior Technical Product Management Report',
                font: 'Calibri',
                size: 28, // 14pt
                bold: true,
                color: darkNavy,
              }),
            ],
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: lightBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Project / Applet ID', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'jijiga-express-delivery-service (1f63c62a-8c1b-4f72-a44a-bdfb0854f9b2)', size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: lightBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Target Firebase Project', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'sunny-discipline-hvd6f', size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: lightBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Cloud Firestore Database', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286', size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: lightBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Production Target Host', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'https://jijiga-express-delivery-service.vercel.app', size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: lightBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Operational Locale', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Jijiga City & Somali Region, Ethiopia', size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: lightBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Date & Verification Status', bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'October 2026 | Verified Codebase State (Build & 7/7 Tests Passing)', size: 20 })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 300 }, children: [] }),

          // SECTION 1
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: '1. WORKSPACE PIPELINE & RECENT ACTIVITIES',
                bold: true,
                size: 26,
                color: primaryColor,
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: 'Telegram Bot Integration Track', bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Status: Awaiting Engineering Specification / External Service Track.\n',
                bold: true,
              }),
              new TextRun({
                text: 'A thorough audit across the codebase (src/, package.json, and root configurations) verifies that no client-side Telegram bot scripts or webhook endpoints are bundled into the frontend React/Vite distribution. To safely operate a Telegram dispatch channel without credential leakage:\n' +
                '• Environment Configuration: Runtime environment variables (TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, APP_SERVICE_URL) must reside strictly on a secure backend service (e.g. Node/Express or Cloud Functions) and never be prefixed with VITE_.\n' +
                '• Backend Webhook Mapping: The incoming payload route (POST /api/webhooks/telegram) must authenticate using the X-Telegram-Bot-Api-Secret-Token header before parsing messages.\n' +
                '• Dispatch Pipeline: A server-side listener queries Firestore for orders in PENDING or READY_FOR_RIDER states, formatting actionable dispatch notifications (pickup landmark, destination Kebele, payout in ETB, and one-tap driver accept callback).'
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: 'Repository Status & Local Test Suite', bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: '• Framework & Tools: React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, Capacitor v8 for Android compilation.\n' +
                '• Typecheck Suite: "npm run typecheck" (tsc --noEmit) validates cleanly with 0 type errors.\n' +
                '• Unit Regression Suite: "npm test" executes scripts/unit-regression.mjs, passing all 7/7 critical assertions covering EEU electricity principal isolation (75 ETB fee vs 1500 ETB utility principal), food merchant payout separation, Marhaba taxi/moto tariffs, 13-digit meter number validation, and strict 5-phase EEU custody state transitions.'
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: 'Role of Emulator-Based Testing Safety Reviews', bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: 'To protect production data integrity in database "ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286", rules verification is routed through local Firebase Auth and Firestore emulators ("npm run test:rules"). This verifies that unauthorized role transitions, invalid tariffs, and fabricated driver assignments are rejected without touching live user records or live driver queues.'
              }),
            ],
          }),

          // SECTION 2
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: '2. CORE SYSTEM ARCHITECTURE & DATA STRUCTURES',
                bold: true,
                size: 26,
                color: primaryColor,
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: 'Multi-Role Identity Framework (RBAC)', bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Access control is partitioned into five distinct operational roles:\n' +
                '1. CUSTOMER: Can create orders with status PENDING, view personal orders where customerId == auth.uid, and file disputes.\n' +
                '2. MAMILA (Merchant): Vendor role restricted to modifying product batches owned by their mamilaId and confirming preparation (VERIFIED_READY).\n' +
                '3. RUNNER: Hyperlocal market picker who claims orders, coordinates batch assembly at stalls, and transfers custody to riders.\n' +
                '4. RIDER: Logistics courier (motorcycle/bajaj or taxi) who accepts assigned deliveries, transitions order status across in-transit milestones, and collects cash on delivery.\n' +
                '5. ADMIN: Platform operators with allowlisted emails (andualemawraris4@gmail.com, etc.) authorized to audit accounts, manage users, and reconcile ledger accounts.'
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: 'Atomic Transaction Processing Chain', bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: 'During peak morning market periods, simultaneous orders for limited inventory batches can cause severe race conditions. The system resolves this via Firestore native runTransaction in orderTransactionService.ts:\n' +
                '1. Concurrent Read Phase: Atomically locks and reads both doc(orders, orderId) and doc(batches, batchId).\n' +
                '2. Pre-condition Validation: Verifies that order does not already exist and batch.available >= order.quantity.\n' +
                '3. Atomic Writes: Updates batch available stock (available - quantity), creates the order document, and writes an immutable audit record in inventoryReservations/{orderId} with action "RESERVE".\n' +
                '4. Cancellation & Reversal: Order cancellations in valid statuses atomically restore batch inventory and record a "RELEASE" action.'
              }),
            ],
          }),

          // SECTION 3
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: '3. STRATEGIC BOTTLENECKS & BLOCKING ARCHITECTURAL ISSUES',
                bold: true,
                size: 26,
                color: primaryColor,
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: 'Checkout Permissions & Security Rule Mismatches', bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Previous "Missing or insufficient permissions" exceptions were diagnosed as a contract mismatch between the customer client and firestore.rules:\n' +
                '• The UI submitted ride requests with digital payment flags (paymentStatus: PAYMENT_PENDING) and speculative driver details.\n' +
                '• Firestore rules explicitly validate ride orders (validRideOrder) requiring paymentMethod == "COD", paymentStatus == "UNPAID", and fixed verified tariffs (283 ETB for Taxi, 136 ETB for Moto).\n' +
                '• Resolution: The customer booking flow now initiates purely as a ride request (rideStatus: REQUESTED, COD/UNPAID), leaving driver matching to the rider dispatch workflow.'
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: 'Regional Payment Gateway Integration (Telebirr & CBE Birr)', bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Transitioning from manual offline Cash on Delivery (COD) to automated settlement requires dedicated backend infrastructure:\n' +
                '• Webhook Ingestion: Secure endpoints (POST /api/payments/telebirr/notify and /api/payments/cbe-birr/callback).\n' +
                '• Cryptographic Signature Verification: RSA/AES decryption for Telebirr and HMAC-SHA256 for CBE Birr.\n' +
                '• Idempotency Collection: Persisting payment transaction numbers in idempotencyKeys/{txnId} to prevent double-crediting.\n' +
                '• Specification Status: Awaiting Engineering Specification for official merchant API credentials.'
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: 'Mid-Checkout Stock Depletion & Catalog Sync', bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: 'When high-demand items (e.g. Abo Mismar fresh leaf) run out mid-checkout, the Firestore transaction safely aborts. However, client-side modals require live onSnapshot subscriptions to display real-time stock warnings and prevent customer frustration upon clicking checkout.'
              }),
            ],
          }),

          // SECTION 4
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: '4. REGIONAL OPERATIONAL METRICS & LOGISTICS MAP',
                bold: true,
                size: 26,
                color: primaryColor,
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: 'Jijiga City Layout Constraints & Tariff Calculation', bold: true, size: 22 })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Jijiga City spans 20 Kebele zones characterized by landmark-based navigation:\n' +
                '• Kebele 04: Central Plaza & Commercial Core (Lat 9.3562, Lng 42.8002)\n' +
                '• Taiwan Commercial Market Hub (m4): High-density trade zone (Lat 9.3580, Lng 42.7980)\n' +
                '• Arada Sector (m2): Central food and bakery depot (Lat 9.3510, Lng 42.7915)\n' +
                '• Sheger Depot (m3): Southern perimeter dairy & cold-chain (Lat 9.3470, Lng 42.8045)\n' +
                '• North Greenbelt (m1): Agricultural and fresh produce intake (Lat 9.3620, Lng 42.8020)\n\n' +
                'Tariffs are computed using the Haversine distance formula with simulated street doglegs, base dispatch fees, and per-km vehicle multipliers.'
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
            children: [new TextRun({ text: '4-Phase Execution Priority Checklist', bold: true, size: 22 })],
          }),

          // Priority Checklist Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Phase', bold: true, color: 'FFFFFF', size: 20 })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Scope & Deliverables', bold: true, color: 'FFFFFF', size: 20 })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: headerBg },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, color: 'FFFFFF', size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phase 1', bold: true, size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Core Transaction & Security Integrity (Firestore rules parity, atomic stock reservations, test suite 7/7 passing)', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'VERIFIED & ACTIVE', color: primaryColor, bold: true, size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phase 2', bold: true, size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Hyperlocal Dispatch & Real-Time Logistics (Kebele 01-20 boundaries, zone-based dynamic tariff matrices, EEU custody proof)', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'IN PROGRESS', bold: true, size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phase 3', bold: true, size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Regional Digital Payments & Webhooks (Telebirr & CBE Birr server endpoints, RSA/HMAC verification, idempotency records)', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Awaiting Engineering Spec', italic: true, size: 19 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phase 4', bold: true, size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Operational Automation & Telegram Track (Server-side bot webhook, driver dispatch broadcast queue, admin reconciliation)', size: 19 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Awaiting Engineering Spec', italic: true, size: 19 })] })] }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 300 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '— End of Report | Generated for Jijiga Express Delivery Service Engineering & Product Operations —',
                italic: true,
                size: 18,
                color: '64748B',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  // 1. Save to public/downloads for direct web app download
  const downloadsDir = path.resolve('public', 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }
  const publicFilePath = path.join(downloadsDir, 'Jijiga_Express_Systems_Analysis_Report.docx');
  fs.writeFileSync(publicFilePath, buffer);
  console.log(`Saved to ${publicFilePath} (${buffer.length} bytes)`);

  // 2. Also save to artifacts folder if accessible
  const artifactDir = '/.aistudio/artifacts/brain/1f63c62a-8c1b-4f72-a44a-bdfb0854f9b2';
  try {
    if (fs.existsSync(artifactDir)) {
      const artifactFilePath = path.join(artifactDir, 'Jijiga_Express_Systems_Analysis_Report.docx');
      fs.writeFileSync(artifactFilePath, buffer);
      console.log(`Saved to artifact path: ${artifactFilePath}`);
    }
  } catch (err) {
    console.warn('Could not write to artifact directory:', err);
  }
}

generateReport().catch((err) => {
  console.error('Failed to generate Word document:', err);
  process.exit(1);
});
