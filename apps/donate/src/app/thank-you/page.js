import ThankYouClient from './ThankYouClient';

export const metadata = { title: 'Hare Krishna | ISKCON Chennai' };

export default async function ThankYou({ searchParams }) {
  const sp = await searchParams;
  return (
    <ThankYouClient
      status={sp.status || 'unknown'}
      receipt={sp.receipt || ''}
      token={sp.t || ''}
      donation={sp.donation || ''}
      gateway={sp.gateway || ''}
      final={sp.final === '1'}
    />
  );
}
