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

  const doc = renderReceiptPDF(data);
  const stream = new ReadableStream({
    start(controller) {
      doc.on('data', (c) => controller.enqueue(new Uint8Array(c)));
      doc.on('end', () => controller.close());
      doc.on('error', (e) => controller.error(e));
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${no}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}
