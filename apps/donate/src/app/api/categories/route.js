import { getPageContent } from '@/lib/ops-donate';
import { json, bad } from '@/lib/util';

export async function GET() {
  try {
    return json(await getPageContent());
  } catch (err) {
    console.error('categories:', err);
    return bad('Could not load sevas', 500);
  }
}
