// Mock data for inquiry system testing

export interface Inquiry {
  id: string;
  customer_id: string;
  shop_id: string;
  product_name: string;
  description?: string;
  quantity: number;
  budget_min?: number;
  budget_max?: number;
  image_url?: string;
  preferred_contact: 'chat' | 'call' | 'both';
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  expires_at?: string;
  created_at: string;
  updated_at: string;
  shop_name: string;
  shop_image: string;
  shop_phone: string;
}

export interface ChatMessage {
  id: string;
  inquiry_id: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'customer' | 'shop';
  message_text: string;
  message_type: 'text' | 'image' | 'system';
  attachments?: any;
  is_read: boolean;
  created_at: string;
}

export const mockInquiries: Inquiry[] = [
  {
    id: "inq_1",
    customer_id: "user_1",
    shop_id: "1",
    product_name: "iPhone 15 Pro Max 256GB",
    description: "Looking for the space black color variant. Need to check if warranty is available.",
    quantity: 1,
    budget_min: 85000,
    budget_max: 95000,
    preferred_contact: "chat",
    status: "in_progress",
    created_at: "2024-12-20T10:30:00Z",
    updated_at: "2024-12-20T11:15:00Z",
    shop_name: "Tech World Electronics",
    shop_image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop",
    shop_phone: "+91 9876543210"
  },
  {
    id: "inq_2", 
    customer_id: "user_1",
    shop_id: "2",
    product_name: "Organic Vegetables Pack",
    description: "Need fresh vegetables for the week. Prefer locally grown produce.",
    quantity: 2,
    budget_min: 200,
    budget_max: 400,
    preferred_contact: "both",
    status: "pending",
    created_at: "2024-12-21T08:45:00Z",
    updated_at: "2024-12-21T08:45:00Z",
    shop_name: "Fresh Mart Grocery",
    shop_image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300&h=200&fit=crop",
    shop_phone: "+91 9876543211"
  },
  {
    id: "inq_3",
    customer_id: "user_1",
    shop_id: "3",
    product_name: "Formal Business Suit",
    description: "Need a complete formal suit for office meetings. Navy blue or charcoal gray preferred.",
    quantity: 1,
    budget_min: 3000,
    budget_max: 5000,
    preferred_contact: "call",
    status: "completed",
    created_at: "2024-12-18T16:20:00Z",
    updated_at: "2024-12-19T10:30:00Z", 
    shop_name: "Style Hub Fashion",
    shop_image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop",
    shop_phone: "+91 9876543212"
  },
  {
    id: "inq_4",
    customer_id: "user_1", 
    shop_id: "4",
    product_name: "Programming Books Bundle",
    description: "Looking for JavaScript and React development books. Latest editions preferred.",
    quantity: 3,
    budget_min: 800,
    budget_max: 1200,
    preferred_contact: "chat",
    status: "expired",
    expires_at: "2024-12-15T00:00:00Z",
    created_at: "2024-12-10T14:00:00Z",
    updated_at: "2024-12-15T00:00:00Z",
    shop_name: "BookWorm Store",
    shop_image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop",
    shop_phone: "+91 9876543213"
  }
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: "msg_1",
    inquiry_id: "inq_1",
    sender_id: "user_1",
    sender_name: "Rahul Sharma",
    sender_type: "customer",
    message_text: "Hi! I'm interested in the iPhone 15 Pro Max. Do you have the space black variant available?",
    message_type: "text",
    is_read: true,
    created_at: "2024-12-20T10:35:00Z"
  },
  {
    id: "msg_2",
    inquiry_id: "inq_1", 
    sender_id: "shop_1",
    sender_name: "Tech World Electronics",
    sender_type: "shop",
    message_text: "Hello Rahul! Yes, we have the space black iPhone 15 Pro Max 256GB in stock. The price is ₹89,999 with 1 year Apple warranty included.",
    message_type: "text",
    is_read: true,
    created_at: "2024-12-20T10:45:00Z"
  },
  {
    id: "msg_3",
    inquiry_id: "inq_1",
    sender_id: "user_1", 
    sender_name: "Rahul Sharma",
    sender_type: "customer",
    message_text: "Perfect! Can I visit your store this evening to check it out?",
    message_type: "text",
    is_read: true,
    created_at: "2024-12-20T11:00:00Z"
  },
  {
    id: "msg_4",
    inquiry_id: "inq_1",
    sender_id: "shop_1",
    sender_name: "Tech World Electronics", 
    sender_type: "shop",
    message_text: "Absolutely! We're open until 9 PM today. I'll keep one unit aside for you. When you're ready to purchase, we also accept EMI options if needed.",
    message_type: "text", 
    is_read: false,
    created_at: "2024-12-20T11:15:00Z"
  }
];

export const mockUserProfile = {
  id: "user_1",
  name: "Rahul Sharma",
  email: "rahul.sharma@email.com", 
  phone_number: "+91 9876543210",
  profile_image_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  address: "Sector 27, Pradhikaran, Pimpri-Chinchwad, Maharashtra 411017",
  location: "Pimpri-Chinchwad",
  preferences: {
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    marketing_messages: true,
    inquiry_responses: true,
    offer_alerts: true,
    order_updates: true
  }
};