import dynamic from 'next/dynamic';

const FAQsContent = dynamic(() => import('./FAQsContent'), { ssr: false });

export default function FAQsPage() {
  return <FAQsContent />;
}
