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
      // Only set when a confirmed payment could not be recorded. They are the
      // donor's proof, so they must survive onto the page.
      orderRef={sp.ref || ''}
      txn={sp.txn || ''}
    />
  );
}
