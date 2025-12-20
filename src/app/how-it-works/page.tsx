
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function HowItWorksPage() {
  const steps = [
    {
      title: '1. Sign Up & Log In',
      description: 'Create your free account in seconds using your email, phone number, and vehicle registration. This helps us tailor your experience.',
    },
    {
      title: '2. Find a Carwash Near You',
      description: 'Use our search bar on the homepage to find approved carwashes. You can filter by location, ratings, and available cleaners to find the perfect spot.',
    },
    {
      title: '3. Get Your Car Washed',
      description: 'Visit the carwash of your choice. When they create a job for your vehicle, it will automatically link to your account using your phone number.',
    },
    {
      title: '4. View Your Service History',
      description: 'After your service, the job details will appear in your personal dashboard. Track all your past services, see costs, and monitor job statuses in one place.',
    },
  ];

  return (
    <div className="py-12 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold">How It Works</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Getting your car sparkling clean has never been easier. Follow these simple steps.
          </p>
        </div>
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Your Journey to a Clean Car</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-8">
              {steps.map((step, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-primary/10 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground mt-1">{step.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
