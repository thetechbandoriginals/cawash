'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
    const pathname = usePathname();

    const isCarwashDashboard = pathname === '/carwash/dashboard';
    const isSuperAdminDashboard = pathname === '/cw/overview';

    if (isCarwashDashboard || isSuperAdminDashboard) {
        return null;
    }

    const pathSegments = pathname.split('/').filter(p => p);
    
    // Only show for carwash or cw sections
    const isCarwashSection = pathSegments[0] === 'carwash';
    const isSuperAdminSection = pathSegments[0] === 'cw';
    
    if (!isCarwashSection && !isSuperAdminSection) {
        return null;
    }

    const dashboardUrl = isCarwashSection ? '/carwash/dashboard' : '/cw/overview';

    const breadcrumbs = pathSegments.map((segment, index) => {
        const href = '/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;
        
        let formattedSegment = segment.charAt(0).toUpperCase() + segment.slice(1);
        if (segment.length > 20 && index > 0) { // Likely a Firestore ID
            const parentSegment = pathSegments[index-1];
            formattedSegment = `${parentSegment.slice(0, -1)} Details`;
        }

        return {
            label: formattedSegment,
            href,
            isLast
        };
    });
    
    // Filter out the base segment ('carwash' or 'cw') to start from the dashboard
    const displayCrumbs = breadcrumbs.slice(1);

    return (
        <nav className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <Link href={dashboardUrl}>
                    <Home className="h-4 w-4" />
                    <span className="sr-only">Dashboard</span>
                </Link>

                {displayCrumbs.map((crumb, index) => (
                    <div key={crumb.href} className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4" />
                        <Link
                            href={crumb.href}
                            className={crumb.isLast ? 'font-semibold text-foreground' : 'hover:underline'}
                            aria-current={crumb.isLast ? 'page' : undefined}
                        >
                            {crumb.label}
                        </Link>
                    </div>
                ))}
            </div>
             <Button variant="outline" size="sm" asChild>
                <Link href={dashboardUrl}>
                    Back to Dashboard
                </Link>
            </Button>
        </nav>
    );
};

export default Breadcrumbs;
