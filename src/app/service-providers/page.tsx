import dynamic from 'next/dynamic';

const ServiceProvidersContent = dynamic(() => import('./ServiceProvidersContent'), { ssr: false });

export default function ServiceProvidersPage() {
  return <ServiceProvidersContent />;
}
