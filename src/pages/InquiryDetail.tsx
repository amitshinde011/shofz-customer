import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  MessageSquare, 
  Phone, 
  Send, 
  CheckCircle2, 
  Loader2,
  Paperclip,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useRealtimeInquiry } from "@/hooks/useRealtimeInquiry";
import { useAuth } from "@/hooks/useAuth";
import { TypingIndicator } from "@/components/TypingIndicator";
import { MultiAttachmentUpload, Attachment } from "@/components/MultiAttachmentUpload";
import { MessageAttachments } from "@/components/MessageAttachments";
import { ReviewEligibilityChecker } from "@/components/reviews/ReviewEligibilityChecker";
import { inquiryService } from "@/services/inquiryService";
import { parseMessage, isQuoteMessage, isPaymentRequestMessage } from '@/lib/messageParser';
import { QuoteMessageBubble } from '@/components/chat/QuoteMessageBubble';
import { PaymentRequestBubble } from '@/components/chat/PaymentRequestBubble';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function InquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const [newMessage, setNewMessage] = useState("");
  const [messageAttachments, setMessageAttachments] = useState<Attachment[]>([]);
  const { user } = useAuth();

  // Real-time inquiry hook with live status updates
  const { inquiry, isLoading, error, isConnected: inquiryConnected } = useRealtimeInquiry({
    inquiryId: id || "",
    enabled: !!id
  });

  // Real-time chat hook
  const {
    messages,
    typingUsers,
    isConnected,
    isReconnecting,
    sendMessage,
    startTyping,
    stopTyping,
    reconnect,
  } = useRealtimeChat({
    inquiryId: id || "",
    userId: user?.id,
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && messageAttachments.length === 0) || !user) return;

    const messageToSend = newMessage.trim();
    const attachmentsToSend = messageAttachments.map(att => ({
      url: att.url,
      name: att.name,
      type: att.type,
      path: att.path
    }));
    
    stopTyping();
    setNewMessage("");
    setMessageAttachments([]);

    const success = await sendMessage(
      messageToSend || "📷", 
      messageAttachments.length > 0 ? 'image' : 'text',
      attachmentsToSend
    );
    
    if (!success) {
      setNewMessage(messageToSend);
      setMessageAttachments(messageAttachments);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (e.target.value.trim()) {
      startTyping();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 1000);
    } else {
      stopTyping();
    }
  };

  const handleCall = () => {
    if (inquiry?.shops?.phone_number) {
      window.location.href = `tel:${inquiry.shops.phone_number}`;
    }
  };

  const handleMarkCompleted = async () => {
    if (!inquiry) return;
    
    try {
      await inquiryService.updateInquiryStatus(inquiry.id, 'completed');
      
      toast({
        title: "Inquiry completed",
        description: "This inquiry has been marked as completed.",
      });
      
      navigate("/inquiries");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark inquiry as complete.",
        variant: "destructive",
      });
    }
  };

  if (!inquiry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Inquiry not found
            </h2>
            <p className="text-muted-foreground mb-4">
              The inquiry you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/inquiries")}>
              Back to Inquiries
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Map old statuses to simplified ones
  const getSimplifiedStatus = (status: string) => {
    if (['pending', 'in_progress'].includes(status)) {
      return 'active';
    }
    if (status === 'completed') return 'completed';
    if (status === 'expired') return 'expired';
    return 'active';
  };

  const simplifiedStatus = inquiry ? getSimplifiedStatus(inquiry.status) : 'active';

  return (
    <div className="max-w-screen-xl mx-auto page-container section-spacing">
      {/* Breadcrumbs - Desktop only */}
      <div className="hidden lg:block bg-background border-b border-border px-4 sm:px-6 py-3 mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="w-4 h-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/inquiries">My Inquiries</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="w-4 h-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="font-semibold line-clamp-1">{inquiry.product_name}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card border-b border-border px-4 sm:px-6 py-4"
      >
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inquiries")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground font-inter line-clamp-1">
              {inquiry.product_name}
            </h1>
            <p className="text-sm text-muted-foreground">{inquiry.shops?.name}</p>
          </div>
          <Badge className={`${
            simplifiedStatus === 'active' ? "bg-success/10 text-success" :
            simplifiedStatus === 'completed' ? "bg-primary/10 text-primary" :
            "bg-muted text-muted-foreground"
          } border-0`}>
            <div className="flex items-center space-x-1">
              {simplifiedStatus === 'active' && <div className="w-2 h-2 bg-success rounded-full" />}
              {simplifiedStatus === 'completed' && <CheckCircle2 className="w-3 h-3" />}
              <span className="text-xs font-medium capitalize">{simplifiedStatus}</span>
            </div>
          </Badge>
        </div>
      </motion.header>

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* Review Button - only show for completed inquiries */}
        {inquiry.status === 'completed' && inquiry.shops && (
          <div className="flex justify-end">
            <ReviewEligibilityChecker 
              inquiry={inquiry}
              shop={inquiry.shops}
            />
          </div>
        )}

        {/* Inquiry Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inquiry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <p className="font-medium">{inquiry.quantity}</p>
                </div>
                
                {inquiry.budget_min !== undefined && inquiry.budget_max !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Budget:</span>
                    <p className="font-medium">
                      ₹{inquiry.budget_min.toLocaleString()} - ₹{inquiry.budget_max.toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-muted-foreground">Contact:</span>
                  <p className="font-medium capitalize">{inquiry.preferred_contact}</p>
                </div>

                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {inquiry.description && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Description:</span>
                    <p className="text-sm mt-1 leading-relaxed">{inquiry.description}</p>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleCall} 
                  variant="outline" 
                  className="flex-1"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Shop
                </Button>
                
                {simplifiedStatus === 'active' && (
                  <Button 
                    onClick={handleMarkCompleted} 
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chat Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="flex flex-col">
            <CardContent className="flex flex-col p-0">
              {/* Messages Area */}
              <div className="h-[400px] overflow-y-auto px-4 py-2 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground">
                      Start a conversation with {inquiry.shops?.name}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isCurrentUser = message.sender_id === user?.id;
                    const parsedMessage = parseMessage(message.message_text || '');
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Quote Message */}
                        {isQuoteMessage(parsedMessage) ? (
                          <div className="max-w-[85%]">
                            <QuoteMessageBubble
                              quoted_price={parsedMessage.data.quoted_price}
                              estimated_delivery_days={parsedMessage.data.estimated_delivery_days}
                              response_message={parsedMessage.data.response_message}
                              isCurrentUser={isCurrentUser}
                            />
                            <p className="text-xs text-muted-foreground mt-1 px-1">
                              {new Date(message.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        ) : isPaymentRequestMessage(parsedMessage) ? (
                          <div className="max-w-[85%]">
                            <PaymentRequestBubble
                              amount={parsedMessage.data.amount}
                              expires_at={parsedMessage.data.expires_at}
                              payment_request_id={parsedMessage.data.payment_request_id}
                              description={parsedMessage.data.description}
                              isCurrentUser={isCurrentUser}
                              inquiry={inquiry}
                              shop={inquiry.shops}
                            />
                            <p className="text-xs text-muted-foreground mt-1 px-1">
                              {new Date(message.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        ) : (
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 ${
                              isCurrentUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {message.message_text && message.message_text !== "📷" && (
                              <p className="text-sm leading-relaxed">{message.message_text}</p>
                            )}
                            
                            {message.attachments && message.attachments.length > 0 && (
                              <MessageAttachments 
                                attachments={message.attachments}
                                isCurrentUser={isCurrentUser}
                              />
                            )}
                            
                            <div className="flex items-center justify-between mt-1">
                              <p className={`text-xs ${
                                isCurrentUser 
                                  ? 'text-primary-foreground/70' 
                                  : 'text-muted-foreground'
                              }`}>
                                {new Date(message.created_at).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                              {isCurrentUser && !message.is_read && (
                                <div className="w-2 h-2 bg-primary-foreground/50 rounded-full ml-2" />
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
                
                {/* Typing Indicators */}
                <AnimatePresence>
                  {typingUsers.map((typingUser) => (
                    <TypingIndicator
                      key={typingUser.user_id}
                      userName={inquiry.shops?.name || "Shop"}
                    />
                  ))}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {inquiry.status !== 'expired' && (
                <div className="border-t border-border p-4 space-y-3 flex-shrink-0">
                  <MultiAttachmentUpload
                    value={messageAttachments}
                    onAttachmentsChange={setMessageAttachments}
                    inquiryId={inquiry.id}
                    disabled={!isConnected}
                    maxAttachments={5}
                  />
                  
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder={isConnected ? "Type your message..." : "Connecting..."}
                        disabled={!isConnected}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      size="icon"
                      disabled={(!newMessage.trim() && messageAttachments.length === 0) || !isConnected}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </div>
  );
}