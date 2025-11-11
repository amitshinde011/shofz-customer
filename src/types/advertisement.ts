export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  ad_type: 'carousel' | 'banner';
  placement?: string;
  is_active: boolean;
  priority: number;
  click_count: number;
  impression_count: number;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
