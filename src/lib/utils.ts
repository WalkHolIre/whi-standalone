import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function createPageUrl(pageNameWithParams: string) {
    // Split off any query string (e.g. "DestinationEditor?id=xxx")
    const [pageName, queryString] = pageNameWithParams.split('?');

    // Map existing Vite page names to Next.js routes
    const routes: Record<string, string> = {
        'Bookings': '/bookings',
        'BookingDetail': '/bookings/detail',
        'PartnerDetail': '/partners/detail',
        'AdminTourManagement': '/tours',
        'AdminTourEditor': '/tours/edit',
        'Customers': '/customers',
        'ServiceProviders': '/service-providers',
        'PartnersIndex': '/partners',
        'PartnerProfile': '/partners/profile',
        'AdminRouteLibrary': '/routes',
        'AdminRouteDetail': '/routes/detail',
        'DestinationManager': '/destinations',
        'DestinationEditor': '/destinations/edit',
        // Add more as needed
    };

    const basePath = routes[pageName] || `/${pageName.toLowerCase()}`;
    return queryString ? `${basePath}?${queryString}` : basePath;
}
