
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfUsePage() {
  return (
    <div className="py-12 bg-muted">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Carwash Terms of Use</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Acceptance of Terms</h2>
            <p>
              By creating an account and using the Cawash platform ("Service"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>

            <h2>2. Account Registration and Responsibilities</h2>
            <p>
              You must provide accurate and complete information when creating your carwash account. You are responsible for maintaining the confidentiality of your account and password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>

            <h2>3. Use of the Service</h2>
            <p>
              Cawash grants you a limited, non-exclusive, non-transferable license to access and use the Service for your internal business purposes to manage your carwash operations. You agree not to misuse the Service or help anyone else to do so.
            </p>
            
            <h2>4. Fees and Payments</h2>
            <p>
              Certain features of the Service, such as creating job cards, require the use of "Credits." Credits can be purchased through the platform. All purchases are final and non-refundable. The cost per job card is defined in the global settings and is subject to change.
            </p>
            
            <h2>5. Data and Privacy</h2>
            <p>
              You are responsible for the accuracy and legality of the data you enter into the Service, including customer and job information. Our collection and use of personal information are described in our Privacy Notice.
            </p>

            <h2>6. Termination</h2>
            <p>
              We may terminate or suspend your access to the Service at any time, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>

            <h2>7. Disclaimers and Limitation of Liability</h2>
            <p>
              The Service is provided "AS IS" and "AS AVAILABLE" without any warranty of any kind. In no event shall Cawash be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Service.
            </p>

             <h2>8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of any changes by posting the new Terms on this page. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
            </p>
            
            <h2>Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at: support@cawash.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
