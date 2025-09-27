# 🗄️ Supabase Database Setup Guide

This guide will help you set up a Supabase database for your SplintaxStore if you want to store order data, customer information, or product inventory.

## 📋 Prerequisites

- Supabase account (free tier available)
- Basic understanding of SQL

## 🔧 Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name:** `splintaxstore`
   - **Database Password:** Generate a strong password
   - **Region:** Choose closest to your users
4. Click "Create new project"
5. Wait for project to be ready (2-3 minutes)

## 🗃️ Step 2: Create Database Tables

### Orders Table
```sql
-- Create orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_discord VARCHAR(255),
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_orders_transaction_id ON orders(transaction_id);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

### Products Table
```sql
-- Create products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  icon VARCHAR(10),
  category VARCHAR(100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample products
INSERT INTO products (name, description, price, icon, category) VALUES
('Premium Discord Bot', 'Advanced Discord bot with moderation, music, and custom commands. Easy setup and 24/7 support.', 29.99, '🤖', 'bots'),
('Website Template Pack', 'Professional website templates for businesses. Responsive design, modern UI, and easy customization.', 49.99, '🎨', 'templates'),
('Social Media Graphics', 'High-quality social media graphics and templates. Perfect for influencers and businesses.', 19.99, '📱', 'graphics'),
('Logo Design Service', 'Custom logo design for your brand. Professional designer, unlimited revisions, all file formats.', 99.99, '🎯', 'services'),
('SEO Optimization Guide', 'Complete SEO guide with strategies, tools, and templates. Boost your website visibility.', 39.99, '📈', 'guides'),
('Video Editing Template', 'Professional video editing templates for content creators. After Effects and Premiere Pro.', 24.99, '🎬', 'templates');
```

### Customers Table (Optional)
```sql
-- Create customers table for user management
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  discord_username VARCHAR(255),
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_customers_email ON customers(email);
```

## 🔐 Step 3: Configure Row Level Security (RLS)

```sql
-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for orders (adjust based on your needs)
CREATE POLICY "Allow public insert on orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy for products (public read access)
CREATE POLICY "Allow public read on products" ON products
  FOR SELECT USING (active = true);

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy for customers
CREATE POLICY "Allow public insert on customers" ON customers
  FOR INSERT WITH CHECK (true);
```

## 🔑 Step 4: Get API Keys

1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon Key** (public key for client-side)
   - **Service Role Key** (secret key for server-side)

## 🔧 Step 5: Update Backend Configuration

Add these environment variables to your Render deployment:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📡 Step 6: Update Backend Code

Add this to your `backend/server.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Update checkout endpoint to save orders
app.post('/api/webhook/checkout', async (req, res) => {
  try {
    const { transactionId, customerName, customerEmail, customerDiscord, items, total, paymentMethod } = req.body;
    
    // Save order to database
    const { data: order, error } = await supabase
      .from('orders')
      .insert([
        {
          transaction_id: transactionId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_discord: customerDiscord,
          total_amount: parseFloat(total),
          payment_method: paymentMethod,
          items: items,
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      console.error('Database error:', error);
      // Continue with webhook even if DB fails
    }

    // Send Discord notification
    const embed = {
      title: "🛒 New Checkout Started",
      color: 0x00ff00,
      fields: [
        {
          name: "Transaction Details",
          value: `**ID:** ${transactionId}\n**Name:** ${customerName}\n**Email:** ${customerEmail}\n**Discord:** ${customerDiscord || 'Not provided'}`,
          inline: false
        },
        {
          name: "Order Total",
          value: `$${total}`,
          inline: true
        },
        {
          name: "Payment Method",
          value: paymentMethod,
          inline: true
        }
      ],
      footer: { text: "SplintaxStore - Checkout System" },
      timestamp: new Date().toISOString()
    };

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    res.json({ 
      success: true, 
      message: 'Checkout notification sent',
      orderId: order?.[0]?.id 
    });
  } catch (error) {
    console.error('Checkout webhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to send checkout notification' });
  }
});

// Add endpoint to get products from database
app.get('/api/products', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ success: true, products });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});
```

## 📦 Step 7: Install Supabase Client

Add to your `backend/package.json` dependencies:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    // ... other dependencies
  }
}
```

Then run:
```bash
npm install
```

## 🧪 Step 8: Test Database Connection

Create a test endpoint:

```javascript
// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    res.json({ 
      success: true, 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed',
      details: error.message 
    });
  }
});
```

## 🔍 Step 9: Monitor and Maintain

### Database Monitoring
- Use Supabase dashboard to monitor queries
- Set up alerts for high error rates
- Monitor database size and performance

### Backup Strategy
- Supabase automatically backs up your database
- Consider exporting data periodically for additional safety

### Scaling
- Free tier: 500MB database, 2GB bandwidth
- Pro tier: 8GB database, 250GB bandwidth
- Scale up as your store grows

## 🆘 Troubleshooting

### Common Issues

**1. "Invalid API key"**
- Verify your Supabase URL and keys
- Check environment variables in Render

**2. "Row Level Security policy violation"**
- Review your RLS policies
- Test with service role key for admin operations

**3. "Connection timeout"**
- Check Supabase service status
- Verify network connectivity

### Useful Queries

```sql
-- View all orders
SELECT * FROM orders ORDER BY created_at DESC;

-- View order statistics
SELECT 
  DATE(created_at) as date,
  COUNT(*) as orders,
  SUM(total_amount) as revenue
FROM orders 
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View customer statistics
SELECT 
  customer_email,
  COUNT(*) as order_count,
  SUM(total_amount) as total_spent
FROM orders 
GROUP BY customer_email
ORDER BY total_spent DESC;
```

---

**🎉 Your Supabase database is now ready to store SplintaxStore data!**
