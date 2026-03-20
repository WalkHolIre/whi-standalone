import dynamic from 'next/dynamic';

const DestinationEditContent = dynamic(() => import('./DestinationEditContent'), { ssr: false });

export default function DestinationEditPage() {
  return <DestinationEditContent />;
}
