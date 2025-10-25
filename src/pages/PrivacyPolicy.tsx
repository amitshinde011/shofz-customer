import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Privacy Policy</h1>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to LocalConnect. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our platform and tell you about your privacy rights.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. Data We Collect</h2>
              <p className="text-muted-foreground mb-2">
                We may collect, use, store and transfer different kinds of personal data about you:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Identity Data: name, username, profile information</li>
                <li>Contact Data: phone number, address</li>
                <li>Location Data: your geographic location for shop proximity features</li>
                <li>Transaction Data: inquiries, messages, quotes, and orders</li>
                <li>Technical Data: IP address, device information, browser type</li>
                <li>Usage Data: how you use our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. How We Use Your Data</h2>
              <p className="text-muted-foreground mb-2">
                We use your personal data to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Provide and maintain our marketplace services</li>
                <li>Process your inquiries and facilitate communication with shops</li>
                <li>Send you OTP codes for authentication</li>
                <li>Show you nearby shops based on your location</li>
                <li>Improve our platform and user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Data Sharing</h2>
              <p className="text-muted-foreground">
                We may share your personal data with:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Shop owners when you submit inquiries</li>
                <li>Service providers who help us operate the platform (e.g., Supabase for hosting)</li>
                <li>Law enforcement when required by law</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We do not sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">5. Data Security</h2>
              <p className="text-muted-foreground">
                We have implemented appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way. We use industry-standard encryption and secure authentication methods.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including satisfying any legal, accounting, or reporting requirements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">7. Your Rights</h2>
              <p className="text-muted-foreground mb-2">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Request access to your personal data</li>
                <li>Request correction of your personal data</li>
                <li>Request erasure of your personal data</li>
                <li>Object to processing of your personal data</li>
                <li>Request restriction of processing your personal data</li>
                <li>Request transfer of your personal data</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">8. Location Data</h2>
              <p className="text-muted-foreground">
                Our app uses your location to show you nearby shops and provide relevant local services. You can control location permissions through your device settings. Disabling location services may limit some features of the app.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">9. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar tracking technologies to track activity on our platform and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">10. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">11. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">12. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us through the app's support section.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
