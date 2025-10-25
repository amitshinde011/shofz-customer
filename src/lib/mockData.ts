// Mock data for LocalConnect Customer App

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: {
    address: string;
    city: string;
    pincode: string;
    coordinates: { lat: number; lng: number };
  };
  avatar?: string;
}

export interface BusinessHours {
  [key: string]: { open: string; close: string; isOpen: boolean };
}

export interface Shop {
  id: string;
  name: string;
  category: string;
  subcategories: string[];
  rating: number;
  reviewCount: number;
  distance: string;
  isOpen: boolean;
  nextStatusChange: string;
  image: string;
  coverImage: string;
  logo: string;
  gallery: string[];
  address: string;
  phone: string;
  email: string;
  website?: string;
  description: string;
  services: string[];
  paymentMethods: string[];
  delivery: boolean;
  pickup: boolean;
  deliveryTime?: string;
  businessHours: BusinessHours;
  coordinates: { lat: number; lng: number };
  isVerified: boolean;
  productCount: number;
  establishedYear?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  shopName: string;
  validUntil: string;
  image: string;
  category: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  shopName: string;
  category: string;
  rating: number;
  inStock: boolean;
}

// Mock user data
export const mockUser: User = {
  id: "1",
  name: "Rahul Sharma",
  email: "rahul.sharma@email.com",
  phone: "+91 9876543210",
  location: {
    address: "Sector 27, Pradhikaran",
    city: "Pimpri-Chinchwad",
    pincode: "411017",
    coordinates: { lat: 18.6298, lng: 73.7997 }
  },
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
};

// Categories with icons
export const categories: Category[] = [
  { id: "1", name: "Electronics", icon: "Smartphone", color: "bg-blue-500" },
  { id: "2", name: "Groceries", icon: "ShoppingCart", color: "bg-green-500" },
  { id: "3", name: "Fashion", icon: "Shirt", color: "bg-purple-500" },
  { id: "4", name: "Books", icon: "BookOpen", color: "bg-orange-500" },
  { id: "5", name: "Restaurants", icon: "UtensilsCrossed", color: "bg-red-500" },
  { id: "6", name: "Health", icon: "Heart", color: "bg-pink-500" },
  { id: "7", name: "Home", icon: "Home", color: "bg-indigo-500" },
  { id: "8", name: "Sports", icon: "Trophy", color: "bg-yellow-500" },
];

// Comprehensive shops data
export const allShops: Shop[] = [
  {
    id: "1",
    name: "Tech World Electronics",
    category: "Electronics",
    subcategories: ["Smartphones", "Laptops", "Accessories"],
    rating: 4.5,
    reviewCount: 324,
    distance: "0.5 km",
    isOpen: true,
    nextStatusChange: "Closes at 9:00 PM",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&h=300&fit=crop"
    ],
    address: "Shop 12, Sector 29, PCMC",
    phone: "+91 9876543210",
    email: "info@techworld.com",
    website: "https://techworld.com",
    description: "Your one-stop destination for all electronics needs. We offer the latest smartphones, laptops, and accessories with genuine products and competitive prices.",
    services: ["Product Demo", "Technical Support", "Home Delivery", "EMI Options"],
    paymentMethods: ["Cash", "Card", "UPI", "EMI"],
    delivery: true,
    pickup: true,
    deliveryTime: "30 mins",
    businessHours: {
      monday: { open: "10:00", close: "21:00", isOpen: true },
      tuesday: { open: "10:00", close: "21:00", isOpen: true },
      wednesday: { open: "10:00", close: "21:00", isOpen: true },
      thursday: { open: "10:00", close: "21:00", isOpen: true },
      friday: { open: "10:00", close: "21:00", isOpen: true },
      saturday: { open: "10:00", close: "21:00", isOpen: true },
      sunday: { open: "11:00", close: "20:00", isOpen: true }
    },
    coordinates: { lat: 18.6298, lng: 73.7997 },
    isVerified: true,
    productCount: 156,
    establishedYear: 2015
  },
  {
    id: "2", 
    name: "Fresh Mart Grocery",
    category: "Groceries",
    subcategories: ["Fresh Produce", "Dairy", "Packaged Foods"],
    rating: 4.2,
    reviewCount: 189,
    distance: "0.8 km",
    isOpen: true,
    nextStatusChange: "Closes at 10:00 PM",
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&h=300&fit=crop"
    ],
    address: "Market Area, Pimpri",
    phone: "+91 9876543211",
    email: "orders@freshmart.com",
    description: "Fresh groceries delivered to your doorstep. We source directly from farms to ensure quality and freshness for all your daily needs.",
    services: ["Fresh Produce", "Home Delivery", "Bulk Orders", "Subscription Plans"],
    paymentMethods: ["Cash", "Card", "UPI", "Digital Wallet"],
    delivery: true,
    pickup: true,
    deliveryTime: "45 mins",
    businessHours: {
      monday: { open: "07:00", close: "22:00", isOpen: true },
      tuesday: { open: "07:00", close: "22:00", isOpen: true },
      wednesday: { open: "07:00", close: "22:00", isOpen: true },
      thursday: { open: "07:00", close: "22:00", isOpen: true },
      friday: { open: "07:00", close: "22:00", isOpen: true },
      saturday: { open: "07:00", close: "22:00", isOpen: true },
      sunday: { open: "08:00", close: "21:00", isOpen: true }
    },
    coordinates: { lat: 18.6187, lng: 73.7833 },
    isVerified: true,
    productCount: 892,
    establishedYear: 2018
  },
  {
    id: "3",
    name: "Style Hub Fashion",
    category: "Fashion",
    subcategories: ["Men's Wear", "Women's Wear", "Accessories"],
    rating: 4.7,
    reviewCount: 267,
    distance: "1.2 km",
    isOpen: false,
    nextStatusChange: "Opens at 10:00 AM tomorrow",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop"
    ],
    address: "Mall Road, Chinchwad",
    phone: "+91 9876543212",
    email: "contact@stylehub.com",
    description: "Trendy fashion for the modern generation. Latest styles, premium quality fabrics, and affordable prices for men and women.",
    services: ["Personal Styling", "Alterations", "Gift Wrapping", "Size Exchange"],
    paymentMethods: ["Cash", "Card", "UPI", "Buy Now Pay Later"],
    delivery: false,
    pickup: true,
    businessHours: {
      monday: { open: "10:00", close: "20:00", isOpen: true },
      tuesday: { open: "10:00", close: "20:00", isOpen: true },
      wednesday: { open: "10:00", close: "20:00", isOpen: true },
      thursday: { open: "10:00", close: "20:00", isOpen: true },
      friday: { open: "10:00", close: "20:00", isOpen: true },
      saturday: { open: "10:00", close: "20:00", isOpen: true },
      sunday: { open: "00:00", close: "00:00", isOpen: false }
    },
    coordinates: { lat: 18.6389, lng: 73.8047 },
    isVerified: true,
    productCount: 234,
    establishedYear: 2016
  },
  {
    id: "4",
    name: "BookWorm Store",
    category: "Books",
    subcategories: ["Fiction", "Non-Fiction", "Educational"],
    rating: 4.3,
    reviewCount: 156,
    distance: "2.1 km",
    isOpen: true,
    nextStatusChange: "Closes at 8:00 PM",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
    logo: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=100&h=100&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop"
    ],
    address: "University Road, PCMC",
    phone: "+91 9876543213",
    email: "books@bookworm.com",
    description: "A haven for book lovers. Curated collection of bestsellers, classics, and rare finds. Reading consultations available.",
    services: ["Book Recommendations", "Order on Demand", "Reading Events", "Book Exchange"],
    paymentMethods: ["Cash", "Card", "UPI"],
    delivery: true,
    pickup: true,
    deliveryTime: "60 mins",
    businessHours: {
      monday: { open: "09:00", close: "20:00", isOpen: true },
      tuesday: { open: "09:00", close: "20:00", isOpen: true },
      wednesday: { open: "09:00", close: "20:00", isOpen: true },
      thursday: { open: "09:00", close: "20:00", isOpen: true },
      friday: { open: "09:00", close: "20:00", isOpen: true },
      saturday: { open: "09:00", close: "20:00", isOpen: true },
      sunday: { open: "10:00", close: "18:00", isOpen: true }
    },
    coordinates: { lat: 18.6425, lng: 73.8006 },
    isVerified: false,
    productCount: 1247,
    establishedYear: 2012
  }
];

// Featured shops (subset of all shops)
export const featuredShops: Shop[] = allShops.slice(0, 4);

// Current offers
export const currentOffers: Offer[] = [
  {
    id: "1",
    title: "50% Off Electronics",
    description: "Get 50% discount on all electronic items",
    discount: "50% OFF",
    shopName: "Tech World Electronics",
    validUntil: "2024-12-31",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop",
    category: "Electronics"
  },
  {
    id: "2",
    title: "Fresh Vegetables Deal",
    description: "Buy 2 kg get 1 kg free on all vegetables",
    discount: "Buy 2 Get 1",
    shopName: "Fresh Mart Grocery",
    validUntil: "2024-12-25",
    image: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=300&h=200&fit=crop",
    category: "Groceries"
  },
  {
    id: "3",
    title: "Fashion Fiesta",
    description: "Minimum 30% off on all clothing items",
    discount: "30% OFF",
    shopName: "Style Hub Fashion",
    validUntil: "2024-12-30",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=200&fit=crop",
    category: "Fashion"
  }
];

// Extended sample products for comprehensive testing
export const sampleProducts: Product[] = [
  // Electronics
  {
    id: "1",
    name: "iPhone 15 Pro Max 256GB",
    price: 89999,
    originalPrice: 99999,
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop",
    shopName: "Tech World Electronics",
    category: "Electronics",
    rating: 4.8,
    inStock: true
  },
  {
    id: "2",
    name: "Samsung Galaxy S24 Ultra",
    price: 79999,
    originalPrice: 89999,
    image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&h=300&fit=crop",
    shopName: "Mobile Hub",
    category: "Electronics",
    rating: 4.6,
    inStock: true
  },
  {
    id: "3",
    name: "MacBook Air M3",
    price: 114900,
    originalPrice: 124900,
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=300&fit=crop",
    shopName: "Tech World Electronics",
    category: "Electronics",
    rating: 4.9,
    inStock: true
  },
  {
    id: "4",
    name: "Sony WH-1000XM5 Headphones",
    price: 29990,
    originalPrice: 34990,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
    shopName: "Audio Zone",
    category: "Electronics",
    rating: 4.7,
    inStock: true
  },
  {
    id: "5",
    name: "iPad Pro 11-inch",
    price: 81900,
    originalPrice: 89900,
    image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=300&fit=crop",
    shopName: "Tech World Electronics",
    category: "Electronics",
    rating: 4.8,
    inStock: false
  },

  // Groceries
  {
    id: "6",
    name: "Fresh Bananas (1kg)",
    price: 60,
    image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=300&fit=crop",
    shopName: "Fresh Mart Grocery",
    category: "Groceries",
    rating: 4.5,
    inStock: true
  },
  {
    id: "7",
    name: "Organic Apples (1kg)",
    price: 180,
    originalPrice: 200,
    image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop",
    shopName: "Green Valley Organic",
    category: "Groceries",
    rating: 4.6,
    inStock: true
  },
  {
    id: "8",
    name: "Basmati Rice 5kg",
    price: 550,
    originalPrice: 600,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop",
    shopName: "Fresh Mart Grocery",
    category: "Groceries",
    rating: 4.4,
    inStock: true
  },
  {
    id: "9",
    name: "Amul Milk 1L",
    price: 58,
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop",
    shopName: "Daily Needs Store",
    category: "Groceries",
    rating: 4.3,
    inStock: true
  },
  {
    id: "10",
    name: "Fresh Vegetables Combo",
    price: 299,
    originalPrice: 350,
    image: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&h=300&fit=crop",
    shopName: "Green Valley Organic",
    category: "Groceries",
    rating: 4.7,
    inStock: true
  },

  // Fashion
  {
    id: "11",
    name: "Cotton Casual T-Shirt",
    price: 899,
    originalPrice: 1299,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop",
    shopName: "Style Hub Fashion",
    category: "Fashion",
    rating: 4.3,
    inStock: true
  },
  {
    id: "12",
    name: "Denim Jeans - Slim Fit",
    price: 1599,
    originalPrice: 1999,
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=300&fit=crop",
    shopName: "Urban Outfitters",
    category: "Fashion",
    rating: 4.5,
    inStock: true
  },
  {
    id: "13",
    name: "Formal Shirt - White",
    price: 1299,
    originalPrice: 1599,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=300&fit=crop",
    shopName: "Style Hub Fashion",
    category: "Fashion",
    rating: 4.4,
    inStock: true
  },
  {
    id: "14",
    name: "Sneakers - Running Shoes",
    price: 2499,
    originalPrice: 2999,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop",
    shopName: "Sports Central",
    category: "Fashion",
    rating: 4.6,
    inStock: false
  },
  {
    id: "15",
    name: "Kurti - Ethnic Wear",
    price: 799,
    originalPrice: 999,
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=300&fit=crop",
    shopName: "Ethnic Collection",
    category: "Fashion",
    rating: 4.2,
    inStock: true
  },

  // Books
  {
    id: "16",
    name: "Rich Dad Poor Dad",
    price: 299,
    originalPrice: 399,
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop",
    shopName: "BookWorm Store",
    category: "Books",
    rating: 4.9,
    inStock: true
  },
  {
    id: "17",
    name: "Atomic Habits",
    price: 399,
    originalPrice: 499,
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
    shopName: "Knowledge Corner",
    category: "Books",
    rating: 4.8,
    inStock: true
  },
  {
    id: "18",
    name: "The Psychology of Money",
    price: 350,
    originalPrice: 450,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
    shopName: "BookWorm Store",
    category: "Books",
    rating: 4.7,
    inStock: true
  },
  {
    id: "19",
    name: "Think and Grow Rich",
    price: 249,
    originalPrice: 299,
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
    shopName: "Classic Books",
    category: "Books",
    rating: 4.6,
    inStock: true
  },

  // Home & Kitchen
  {
    id: "20",
    name: "Non-Stick Cookware Set",
    price: 3999,
    originalPrice: 4999,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
    shopName: "Home Essentials",
    category: "Home",
    rating: 4.4,
    inStock: true
  },
  {
    id: "21",
    name: "LED Table Lamp",
    price: 1299,
    originalPrice: 1599,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop",
    shopName: "Lighting Solutions",
    category: "Home",
    rating: 4.3,
    inStock: true
  },
  {
    id: "22",
    name: "Cotton Bed Sheets Set",
    price: 1799,
    originalPrice: 2299,
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop",
    shopName: "Home Comfort",
    category: "Home",
    rating: 4.5,
    inStock: true
  },

  // Health & Wellness
  {
    id: "23",
    name: "Multivitamin Tablets",
    price: 799,
    originalPrice: 999,
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop",
    shopName: "Health Plus Pharmacy",
    category: "Health",
    rating: 4.2,
    inStock: true
  },
  {
    id: "24",
    name: "Yoga Mat - Premium",
    price: 1599,
    originalPrice: 1999,
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
    shopName: "Fitness World",
    category: "Health",
    rating: 4.6,
    inStock: true
  },

  // Sports
  {
    id: "25",
    name: "Cricket Bat - Willow",
    price: 2499,
    originalPrice: 2999,
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=300&fit=crop",
    shopName: "Sports Central",
    category: "Sports",
    rating: 4.5,
    inStock: true
  },
  {
    id: "26",
    name: "Badminton Racket Set",
    price: 1899,
    originalPrice: 2299,
    image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop",
    shopName: "Game Zone",
    category: "Sports",
    rating: 4.4,
    inStock: true
  }
];

export const locations = [
  { name: "Pimpri-Chinchwad", pincode: "411017" },
  { name: "Wakad", pincode: "411057" },
  { name: "Hinjewadi", pincode: "411057" },
  { name: "Aundh", pincode: "411007" },
  { name: "Baner", pincode: "411045" }
];