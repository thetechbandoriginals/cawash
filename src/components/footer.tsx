import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4 mt-4 md:mt-0">
            <Link href="/carwash" className="text-primary hover:underline">Carwash</Link>
            <Link href="/carwash/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
            <Link href="/carwash/privacy" className="hover:text-primary transition-colors">Privacy Notice</Link>
            <Link href="/carwash/cookies" className="hover:text-primary transition-colors">Cookie Notice</Link>
          </div>
          <p className="mt-4 md:mt-0">&copy; {new Date().getFullYear()} Cawash. All Rights Reserved.</p>
        </div>
      </footer>
  );
}
