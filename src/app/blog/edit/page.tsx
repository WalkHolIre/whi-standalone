import dynamic from 'next/dynamic';

const BlogEditContent = dynamic(() => import('./BlogEditContent'), { ssr: false });

export default function BlogEditPage() {
  return <BlogEditContent />;
}
