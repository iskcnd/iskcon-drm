import { fetchReceiptData, renderReceiptPDF, receiptToken } from '@/lib/receipt';
import { bad, safeEqual } from '@/lib/util';

/**
 * GET /api/receipts/:no?t=<token>
 * Receipt numbers are sequential, so the HMAC token (handed out on the
 * thank-you redirect and in WhatsApp/email sends) is required — no enumeration.
 */
export async function GET(request, { params }) {
  const { no } = await params;
  const t = new URL(request.url).searchParams.get('t');
  if (!safeEqual(t, receiptToken(no))) return bad('Invalid receipt link', 403);

  const data = await fetchReceiptData(no);
  if (!data) return bad('Receipt not found', 404);

  // Buffered rather than streamed. A receipt is a few KB, and buffering means
  // a render failure is caught here — as a readable message — instead of
  // tearing down a response whose 200 and content-type are already sent.
  let pdf;
  try {
    pdf = await new Promise((resolve, reject) => {
      const doc = renderReceiptPDF(data);
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  } catch (err) {
    console.error(`[receipt] render failed for ${no}:`, err);
    return bad('The receipt could not be generated. Staff have been notified.', 500);
  }

  return new Response(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-length': String(pdf.length),
      'content-disposition': `inline; filename="Receipt-${no}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}
