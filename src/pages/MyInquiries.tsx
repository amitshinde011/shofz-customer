import { motion } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquare, Plus, Search, Clock, Phone, CheckCircle2, AlertCircle, XCircle, Loader2, ChevronRight } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { Inquiry } from "@/services/inquiryService";
import { useUserInquiries } from "@/hooks/useInquiries";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type InquiryStatus = "all" | "pending" | "in_progress" | "completed" | "expired";

export default function MyInquiries() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<InquiryStatus>("all");
  const [userId, setUserId] = useState<string | null>(null);

  const handleBack = () => {
    navigate(-1);
  };

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  const { data: inquiriesResponse, isLoading, error } = useUserInquiries(
    userId || '',
    {
      status: selectedStatus === 'all' ? undefined : selectedStatus,
    }
  );

  const inquiries = inquiriesResponse?.data || [];

  const filteredInquiries = useMemo(() => {
    return inquiries.filter(inquiry => {
      const matchesSearch = searchQuery.trim() === "" ||
        inquiry.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inquiry.shops?.name && inquiry.shops.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inquiry.description && inquiry.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [inquiries, searchQuery]);

  const getStatusIcon = (status: Inquiry['status']) => {
      
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <MessageSquare className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'expired':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Inquiry['status']) => {
          
    switch (status) {
      case 'pending':
        return "bg-warning/10 text-warning";
      case 'in_progress':
        return "bg-primary/10 text-primary";
      case 'completed':
        return "bg-success/10 text-success";
      case 'expired':
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getDisplayStatus = (status: Inquiry['status']) => {
    if (status === 'in_progress') return 'In Progress';
    return status;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  const handleViewDetails = (inquiry: Inquiry) => {
    navigate(`/inquiries/${inquiry.id}`);
  };

  const handleChat = (inquiry: Inquiry) => {
    if (inquiry.status === 'pending') {
      toast({
        title: "No response yet",
        description: "The shop hasn't responded to your inquiry yet.",
      });
      return;
    }
    navigate(`/inquiries/${inquiry.id}#chat`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Breadcrumbs - Desktop only */}
      <div className="hidden lg:block bg-background border-b border-border px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-screen-2xl mx-auto">
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
                <BreadcrumbPage className="font-semibold">My Inquiries</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border px-3 sm:px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-inter">My Inquiries</h1>
            <p className="text-sm text-muted-foreground">
              {filteredInquiries.length} inquiries found
            </p>
          </div>
          <Button onClick={() => navigate("/inquiry/new")} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
        
        {/* Search */}
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search your inquiries..."
        />
      </div>

      {/* Desktop Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:block max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-40 shadow-sm"
      >
        <div className="flex items-center space-x-4 mb-4">          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground font-inter">My Inquiries</h1>
            <p className="text-sm text-muted-foreground">
              {filteredInquiries.length} inquiries found
            </p>
          </div>
          <Button onClick={() => navigate("/inquiry/new")}>
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>

        {/* Search */}
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search your inquiries..."
        />
      </motion.header>

      <div className="max-w-screen-xl mx-auto page-container section-spacing">
        {/* Status Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <Tabs value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as InquiryStatus)}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Inquiries List */}
        {filteredInquiries.length > 0 ? (
          <div className="space-y-4">
            {filteredInquiries.map((inquiry) => (
              <div key={inquiry.id}>
                <Card
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer border"
                  onClick={() => handleViewDetails(inquiry)}
                  style={{ backgroundColor: 'white' }}
                >
                  <CardContent className="p-4">
                    <div className="flex space-x-4">
                      {/* Shop Image */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        {inquiry.shops?.logo_url ? (
                          <img
                            src={inquiry.shops.logo_url}
                            alt={inquiry.shops?.name || 'Shop'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <span className="text-lg font-bold text-primary">
                              {inquiry.shops?.name?.charAt(0).toUpperCase() || 'S'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Inquiry Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground line-clamp-1">
                              {inquiry.product_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {inquiry.shops?.name || 'Unknown Shop'}
                            </p>
                          </div>
                          
                          <Badge className={`${getStatusColor(inquiry.status)} border-0 ml-2 flex-shrink-0`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(inquiry.status)}
                              <span className="text-xs font-medium capitalize">{getDisplayStatus(inquiry.status)}</span>
                            </div>
                          </Badge>
                        </div>

                        {/* Quantity and Budget */}
                        <div className="flex items-center space-x-4 mb-2 text-sm text-muted-foreground">
                          <span>Qty: {inquiry.quantity}</span>
                          {inquiry.budget_min !== undefined && inquiry.budget_max !== undefined && (
                            <span>
                              Budget: ₹{inquiry.budget_min.toLocaleString()} - ₹{inquiry.budget_max.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Description Preview */}
                        {inquiry.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {inquiry.description}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(inquiry.created_at)}
                          </span>
                          
                          <div className="flex space-x-2">
                            {inquiry.status !== 'pending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChat(inquiry);
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Chat
                              </Button>
                            )}
                            
                            {inquiry.preferred_contact !== 'chat' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `tel:${inquiry.shops?.phone_number}`;
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                <Phone className="w-3 h-3 mr-1" />
                                Call
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16"
          >
            <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              {searchQuery.trim() ? "No inquiries found" : "No inquiries yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery.trim() 
                ? `No inquiries match "${searchQuery}". Try different keywords.`
                : "Start discovering products and make your first inquiry to local shops."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/inquiry/new")}>
                <Plus className="w-4 h-4 mr-2" />
                New Inquiry
              </Button>
              {searchQuery.trim() && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}