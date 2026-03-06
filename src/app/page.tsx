"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/bookings');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-4 border-whi border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}
