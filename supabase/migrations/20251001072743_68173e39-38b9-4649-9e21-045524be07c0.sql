-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_related_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger for new inquiries
CREATE OR REPLACE FUNCTION notify_new_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_owner_id UUID;
  v_shop_name VARCHAR;
BEGIN
  -- Get shop owner
  SELECT owner_id, name INTO v_shop_owner_id, v_shop_name
  FROM shops
  WHERE id = NEW.shop_id;
  
  -- Create notification for shop owner
  PERFORM create_notification(
    v_shop_owner_id,
    'inquiry',
    'New Product Inquiry',
    format('New inquiry for %s', NEW.product_name),
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_inquiry_created ON inquiries;
CREATE TRIGGER on_inquiry_created
  AFTER INSERT ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_inquiry();

-- Trigger for new orders
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_owner_id UUID;
BEGIN
  -- Get shop owner
  SELECT owner_id INTO v_shop_owner_id
  FROM shops
  WHERE id = NEW.shop_id;
  
  -- Create notification for shop owner
  PERFORM create_notification(
    v_shop_owner_id,
    'order',
    'New Order Received',
    format('Order #%s - ₹%s', NEW.order_number, NEW.total_amount),
    NEW.id
  );
  
  -- Create notification for customer
  PERFORM create_notification(
    NEW.customer_id,
    'order',
    'Order Confirmed',
    format('Your order #%s has been confirmed', NEW.order_number),
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_created ON orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_order();

-- Trigger for order status changes
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify customer
    PERFORM create_notification(
      NEW.customer_id,
      'order_update',
      'Order Status Updated',
      format('Order #%s is now %s', NEW.order_number, NEW.status),
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_changed ON orders;
CREATE TRIGGER on_order_status_changed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- Trigger for low stock alerts
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_owner_id UUID;
BEGIN
  -- Get shop owner
  SELECT owner_id INTO v_shop_owner_id
  FROM shops
  WHERE id = NEW.shop_id;
  
  -- Check if stock went from above threshold to below
  IF OLD.stock_quantity > OLD.low_stock_threshold 
     AND NEW.stock_quantity <= NEW.low_stock_threshold 
     AND NEW.stock_quantity > 0 THEN
    
    PERFORM create_notification(
      v_shop_owner_id,
      'inventory_alert',
      'Low Stock Alert',
      format('%s is running low (%s units left)', NEW.name, NEW.stock_quantity),
      NEW.id
    );
  END IF;
  
  -- Check if went out of stock
  IF OLD.stock_quantity > 0 AND NEW.stock_quantity = 0 THEN
    PERFORM create_notification(
      v_shop_owner_id,
      'inventory_alert',
      'Out of Stock',
      format('%s is now out of stock', NEW.name),
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_product_stock_changed ON products;
CREATE TRIGGER on_product_stock_changed
  AFTER UPDATE OF stock_quantity ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();

-- Trigger for new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inquiry RECORD;
  v_recipient_id UUID;
BEGIN
  -- Get inquiry details
  SELECT customer_id, shop_id INTO v_inquiry
  FROM inquiries
  WHERE id = NEW.inquiry_id;
  
  -- Determine recipient (if sender is customer, notify shop owner; if sender is shop owner, notify customer)
  IF NEW.sender_id = v_inquiry.customer_id THEN
    -- Message from customer to shop
    SELECT owner_id INTO v_recipient_id
    FROM shops
    WHERE id = v_inquiry.shop_id;
    
    PERFORM create_notification(
      v_recipient_id,
      'message',
      'New Message',
      substring(NEW.message_text, 1, 50),
      NEW.inquiry_id
    );
  ELSE
    -- Message from shop to customer
    PERFORM create_notification(
      v_inquiry.customer_id,
      'message',
      'New Message',
      substring(NEW.message_text, 1, 50),
      NEW.inquiry_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Trigger for new reviews
CREATE OR REPLACE FUNCTION notify_new_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_owner_id UUID;
BEGIN
  -- Get shop owner
  SELECT owner_id INTO v_shop_owner_id
  FROM shops
  WHERE id = NEW.shop_id;
  
  PERFORM create_notification(
    v_shop_owner_id,
    'review',
    format('New %s-Star Review', NEW.rating),
    COALESCE(substring(NEW.comment, 1, 100), 'Customer left a review'),
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_created ON reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_review();