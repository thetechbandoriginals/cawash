
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="py-12 bg-muted">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Carwash Privacy Notice</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>Introduction</h2>
            <p>
              Welcome to Cawash. We are committed to protecting the privacy of our carwash partners and their customers. This Privacy Notice explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>

            <h2>1. Information We Collect</h2>
            <p>We may collect information about you in a variety of ways. The information we may collect on the platform includes:</p>
            <ul>
              <li><strong>Carwash Information:</strong> When you register as a carwash, we collect information such as your business name, owner's name, email address, phone number, physical address, and service details.</li>
              <li><strong>Financial Information:</strong> We collect information related to your credit purchases and transactions necessary to provide our services.</li>
              <li><strong>Customer & Job Information:</strong> Information you record about your customers and the jobs you perform, including client names, contact details, vehicle information, and service history. This data is managed by you, and we process it on your behalf.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>Having accurate information permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the platform to:</p>
            <ul>
              <li>Create and manage your carwash account.</li>
              <li>Process your transactions and manage your credit balance.</li>
              <li>Provide you with the tools to manage your jobs, team, customers, and expenses.</li>
              <li>Generate reports and analytics about your business performance.</li>
              <li>Notify you of updates to the platform.</li>
              <li>Monitor and analyze usage and trends to improve your experience with the platform.</li>
            </ul>

            <h2>3. Data Sharing and Disclosure</h2>
            <p>We do not share your personal or business information with third parties except as described in this Privacy Notice:</p>
            <ul>
                <li><strong>With Your Consent:</strong> We may share your information with your consent, for example, when you choose to use a third-party service integrated with our platform.</li>
                <li><strong>For Legal Reasons:</strong> We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to comply with a legal obligation.</li>
            </ul>

             <h2>4. Data Security</h2>
            <p>
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.
            </p>

            <h2>5. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal information. You can manage most of your information directly from your carwash dashboard or by contacting us for assistance.
            </p>

             <h2>6. Changes to This Notice</h2>
            <p>
              We may update this Privacy Notice from time to time. We will notify you of any changes by posting the new Privacy Notice on this page.
            </p>
            
            <h2>Contact Us</h2>
            <p>If you have questions or comments about this Privacy Notice, please contact us at: support@cawash.com</p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
