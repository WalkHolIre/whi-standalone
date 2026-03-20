import dynamic from 'next/dynamic';

const TourEditContent = dynamic(() => import('./TourEditContent'), { ssr: false });

export default function TourEditPage() {
  return <TourEditContent />;
}
