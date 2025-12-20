
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CookieNoticePage() {
  return (
    <div className="py-12 bg-muted">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Cookie Notice</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit certain websites. They are used to 'remember' you and your preferences, either for a single visit (through a 'session cookie') or for multiple repeat visits (using a 'persistent cookie').
            </p>

            <h2>How We Use Cookies</h2>
            <p>We use cookies for several essential purposes, including:</p>
            <ul>
              <li>
                <strong>Authentication:</strong> We use cookies to identify you when you log in to our Service. This allows us to secure your account and keep you signed in as you navigate the platform.
              </li>
              <li>
                <strong>Security:</strong> Cookies help us enable and support our security features, and to detect malicious activity and violations of our Terms of Use.
              </li>
              <li>
                <strong>Preferences:</strong> We use cookies to remember your settings and preferences, such as your preferred language or layout, so you don’t have to re-configure them on each visit.
              </li>
              <li>
                <strong>Performance and Analytics:</strong> We may use cookies to collect information about how you interact with our services and to help us improve them. For example, we may use cookies to determine if you have interacted with a certain page.
              </li>
            </ul>

            <h2>Types of Cookies We Use</h2>
            <ul>
                <li><strong>Strictly Necessary Cookies:</strong> These are essential for you to be able to experience the full functionality of our site. Without these cookies, services that you have asked for, like logging in, cannot be provided.</li>
                <li><strong>Functionality Cookies:</strong> These cookies are used to recognize you when you return to our platform and enable us to personalize our content for you and remember your preferences.</li>
            </ul>

            <h2>Your Choices</h2>
            <p>
              Most web browsers are set to accept cookies by default. However, you can usually modify your browser setting to decline cookies if you prefer. Please note that if you choose to remove or reject cookies, this could affect the availability and functionality of our services. Because our authentication system relies on cookies, you will not be able to log in or use the platform if you disable them.
            </p>
            
            <h2>Changes to This Notice</h2>
            <p>
              We may update this Cookie Notice from time to time. We will notify you of any changes by posting the new notice on this page.
            </p>
            
            <h2>Contact Us</h2>
            <p>If you have questions or comments about this Cookie Notice, please contact us at: support@cawash.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
