import dynamic from 'next/dynamic';

const EmailSettingsContent = dynamic(() => import('./EmailSettingsContent'), { ssr: false });

export default function EmailSettingsPage() {
  return <EmailSettingsContent />;
}
