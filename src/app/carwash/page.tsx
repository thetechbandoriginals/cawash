
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BarChart, Smartphone, Users } from 'lucide-react';
import Link from 'next/link';

export default function CarwashLandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Elevate Your Carwash Business with <span className="text-primary">Cawash</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            The all-in-one platform to manage your operations, attract more customers, and boost your revenue.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/carwash-create-account">Get Started for Free</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/carwash-login">Carwash Login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Cawash? Section */}
      <section className="py-20 bg-muted -mx-5 px-5">
        <div>
          <h2 className="text-xl font-bold text-center mb-12">Why Choose Cawash?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader className="items-center">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="mt-4 text-lg">Streamline Operations</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                Manage jobs, track expenses, and oversee your team from a single, easy-to-use dashboard.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="items-center">
                <div className="bg-primary/10 p-4 rounded-full">
                    <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="mt-4 text-lg">Engage Customers</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                Build a loyal client base with detailed customer profiles, activity logs, and a simple review system.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="items-center">
                <div className="bg-primary/10 p-4 rounded-full">
                    <BarChart className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="mt-4 text-lg">Boost Revenue</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                Gain insights with powerful reports, manage your services and pricing, and optimize your business for growth.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
        <section className="py-20">
            <div>
                <h2 className="text-xl font-bold text-center mb-12">Get Started in 3 Simple Steps</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center bg-primary text-primary-foreground h-16 w-16 rounded-full text-2xl font-bold mb-4">1</div>
                        <h3 className="text-lg font-semibold mb-2">Create Your Account</h3>
                        <p className="text-muted-foreground">Sign up in minutes and tell us about your carwash. It’s free to get started!</p>
                    </div>
                     <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center bg-primary text-primary-foreground h-16 w-16 rounded-full text-2xl font-bold mb-4">2</div>
                        <h3 className="text-lg font-semibold mb-2">Set Up Your Business</h3>
                        <p className="text-muted-foreground">Add your location, services, pricing, and team members through our guided setup.</p>
                    </div>
                     <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center bg-primary text-primary-foreground h-16 w-16 rounded-full text-2xl font-bold mb-4">3</div>
                        <h3 className="text-lg font-semibold mb-2">Start Managing Jobs</h3>
                        <p className="text-muted-foreground">Use your free credits to create your first job cards and experience the power of Cawash.</p>
                    </div>
                </div>
            </div>
        </section>

      {/* Onboarding Request Section */}
      <section className="py-20 bg-muted -mx-5 px-5">
        <div className="text-center">
          <h2 className="text-xl font-bold">Ready to Transform Your Carwash?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join the growing community of smart carwash owners using Cawash to drive success.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/carwash-create-account">
                Sign Up Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer Section for Legal Links */}
      <footer className="border-t -mx-5 px-5">
        <div className="py-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Cawash. All Rights Reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/carwash/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
            <Link href="/carwash/privacy" className="hover:text-primary transition-colors">Privacy Notice</Link>
            <Link href="/carwash/cookies" className="hover:text-primary transition-colors">Cookie Notice</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
