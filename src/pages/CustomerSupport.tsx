import { useSearchParams } from 'react-router-dom';
import { ChatInterface } from '@/components/support/ChatInterface';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CustomerSupport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ticketId = searchParams.get('ticket');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Headphones className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Customer Support</h1>
                <p className="text-sm text-muted-foreground">
                  We're here to help you
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <ChatInterface fullPage initialTicketId={ticketId || undefined} />

        {/* Help Info */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Need Quick Help?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Response time: Usually within 24 hours</li>
            <li>• You can attach images and documents to your messages</li>
            <li>• You'll get notified when support replies</li>
            <li>• View all your tickets in the "My Tickets" tab</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
