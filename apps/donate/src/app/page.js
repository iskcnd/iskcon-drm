import { getPageContent } from '@/lib/ops-donate';
import DonateClient from './DonateClient';

export const dynamic = 'force-dynamic'; // categories/campaign progress are live data

export default async function Home() {
  let categories = [], campaigns = [];
  try {
    ({ categories, campaigns } = await getPageContent());
  } catch (e) {
    console.error('page content:', e);
  }
  return (
    <DonateClient
      categories={categories}
      campaigns={campaigns}
      videoId={process.env.HERO_VIDEO_ID || '5QpfnawBEXY'}
    />
  );
}
