
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, Phone } from 'lucide-react';

export default function NeedHelpPage() {
  const faqs = [
    {
      question: 'How do I sign up?',
      answer: 'You can sign up by clicking the "Get Started" button on the homepage or header. You will need to provide your phone number, vehicle registration, email, and a password.',
    },
    {
      question: 'I forgot my password. What should I do?',
      answer: 'On any login page, click the "Forgot your password?" link. Enter your email address, and we will send you instructions to reset it.',
    },
    {
      question: 'How does my service history get recorded?',
      answer: 'When you visit a partner carwash, they will create a job card for your service. As long as they use the same phone number you registered with, the job will automatically appear in your dashboard.',
    },
    {
      question: "I don't see a recent carwash in my history.",
      answer: 'Please allow a few moments for the system to update. If it still doesn\'t appear, confirm with the carwash that they used the correct phone number for the job card. If issues persist, please contact our support team.',
    },
    {
      question: 'How are carwash ratings calculated?',
      answer: 'After a job is marked as "Completed" by the carwash, the system generates a unique review link. The carwash owner can share this link with you to leave a rating and a comment. The ratings you see are an average of all customer reviews.',
    },
  ];

  return (
    <div className="py-12 bg-muted/50">
      <div className="container mx-auto px-4 grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
              <CardDescription>
                Find answers to common questions below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                If you can't find an answer, feel free to reach out.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <a href="mailto:support@cawash.com" className="text-primary hover:underline">
                  support@cawash.com
                </a>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <a href="tel:0114914948" className="text-primary hover:underline">
                  0114 914948
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
