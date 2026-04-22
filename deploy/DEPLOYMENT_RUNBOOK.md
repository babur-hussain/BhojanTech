# AWS Production Deployment Runbook
This runbook details the end-to-end process for deploying the Indian Restaurant Management System on AWS.

## Architecture 
- **EC2:** t3.medium running Nginx and Node.js (PM2 Cluster Mode, 4 workers)
- **Database:** MongoDB Atlas M10 (ap-south-1 Mumbai)
- **Cache:** Amazon ElastiCache Redis (t3.micro, Redis 7.x)
- **Storage:** Amazon S3 (bucket: my-restaurant-assets)
- **CDN:** Amazon CloudFront (fronting S3 & Web App)

---

## 1. AWS Foundation Setup

### 1.1 Storage (S3 & CloudFront)
1. Create an S3 Bucket `my-restaurant-assets` in `ap-south-1`.
2. Apply CORS policy to allow presigned uploads:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["https://myrestaurantapp.com"],
    "ExposeHeaders": []
  }
]
```
3. Set a Lifecycle Rule: "Move to Glacier storage class for objects older than 365 days (Prefix: `invoices/`)".
4. Create a CloudFront Distribution targeting this S3 bucket (use OAC - Origin Access Control to restrict S3 to CF only).

### 1.2 Redis (ElastiCache)
1. Create a Subnet Group in your VPC.
2. Create an ElastiCache Redis cluster `restaurant-cache` (t3.micro).
3. Ensure Security Group allows port 6379 from the EC2 Security Group.

### 1.3 Secret Management (SSM Parameter Store)
1. Go to AWS Systems Manager > Parameter Store.
2. Create a SecureString ` /restaurant/prod/env ` containing the `.env` contents:
```env
PORT=8080
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
ANTHROPIC_API_KEY=...
JWT_SECRET=...
```

---

## 2. Server Provisioning

### 2.1 Launch EC2 (t3.medium)
1. Launch an Ubuntu 22.04 LTS instance in `ap-south-1`.
2. Open Security Group: Port 80, 443 (from CloudFront/Anywhere), Port 22 (Only from your Office IP).
3. Create an IAM Role with `AmazonSSMReadOnlyAccess` and attach it to the EC2 instance so it can fetch `.env`.
4. Allocate an Elastic IP and attach it to the EC2.

### 2.2 Server Setup via SSH
SSH into the server and run these commands:
```bash
# Update and install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install nginx git curl awscli certbot python3-certbot-nginx -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
pm2 startup ubuntu
```

---

## 3. Application Deployment

1. Clone Repository:
```bash
sudo mkdir -p /var/www/RestaurantSystem
sudo chown -R $USER:$USER /var/www/RestaurantSystem
git clone https://github.com/my-org/RestaurantSystem.git /var/www/RestaurantSystem
cd /var/www/RestaurantSystem
```

2. Setup Nginx:
```bash
sudo cp deploy/nginx/nginx.conf /etc/nginx/sites-available/restaurant
sudo ln -s /etc/nginx/sites-available/restaurant /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

3. Enable SSL (Certbot):
```bash
sudo certbot --nginx -d myrestaurantapp.com -d www.myrestaurantapp.com
```

4. CI/CD: 
- Create GitHub Actions Secrets: `EC2_HOST` (Elastic IP), `EC2_USERNAME` (ubuntu), `EC2_SSH_KEY`.
- Push to `main` branch to trigger the `.github/workflows/deploy.yml`.

---

## 4. Monitoring & Security
1. **CloudWatch Logs:**
   Install the unified CloudWatch agent on EC2 and configure it to stream `/var/log/pm2/*.log` and `/var/log/nginx/*.log`.
2. **CloudWatch Dashboard:**
   Create a dashboard for CPU Utilization (EC2), Memory Utilization (Custom script/CloudWatch Agent), and Redis connection count. Set Alarms for CPU > 80% and Memory > 85%.
3. **MongoDB Atlas Whitelisting:**
   Whitelist the EC2 Elastic IP in Atlas UI for secure database access. Create daily backups in the Atlas console.
4. **WAF:**
   Attach a basic AWS WAF to the CloudFront distribution to block common SQLi, XSS, and rate limit aggressive IPs.

---

## 5. Cost Optimization (Estimate)
For a restaurant processing 200 orders/day:
- **EC2 t3.medium:** ~$30/mo
- **MongoDB Atlas M10:** ~$60/mo
- **ElastiCache t3.micro:** ~$12/mo
- **S3 & CloudFront:** ~$5-10/mo
- **Total Estimated:** ~$110/mo

**RI Recommendation:** After running steadily for 1-2 months, purchase a 1-year Standard Reserved Instance (No Upfront) for the EC2 to reduce its cost by around 30-40%. Do the same for ElastiCache.
