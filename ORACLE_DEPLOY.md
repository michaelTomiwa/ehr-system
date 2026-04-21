# Deploying This EHR System to Oracle Cloud

This project is easiest to run on Oracle Cloud as a single Linux VM.
The backend serves the frontend, so you only need one public server.

## Recommended Oracle Setup

- Platform: Oracle Cloud Infrastructure (OCI)
- Tier: Always Free if capacity is available
- Instance type: 1 small VM
- OS: Ubuntu or Oracle Linux
- Runtime: Node.js 18
- Process manager: PM2
- Reverse proxy: Nginx

## Before You Start

This app uses SQLite as a file database.
That means:

- you should keep the app on one VM
- the database file should live in a stable folder on that VM
- you should not use multiple replicas behind a load balancer

The repo already supports a configurable DB path with `DATABASE_PATH`.

## 1. Create the Oracle VM

In the Oracle Cloud Console:

1. Create or choose a compartment.
2. Use the VCN wizard to create a VCN with internet connectivity.
3. Create a compute instance.
4. Choose an Always Free eligible shape if available.
5. Use Ubuntu if you want the exact commands below with `apt`.
6. Assign a public IP.
7. Save your SSH private key.

## 2. Open the Required Ports

In the subnet security list or network security group, allow inbound:

- TCP `22` for SSH
- TCP `80` for HTTP
- TCP `443` for HTTPS

You do not need to open port `5000` publicly if you put Nginx in front of the app.

## 3. SSH Into the Server

If you used Ubuntu:

```bash
ssh -i /path/to/your-key ubuntu@YOUR_PUBLIC_IP
```

If you used Oracle Linux:

```bash
ssh -i /path/to/your-key opc@YOUR_PUBLIC_IP
```

## 4. Install System Packages

For Ubuntu:

```bash
sudo apt update
sudo apt install -y git nginx
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 5. Upload or Clone the Project

Using git:

```bash
git clone YOUR_REPOSITORY_URL ehr-system
cd ehr-system/backend
```

## 6. Install Backend Dependencies

```bash
npm ci
```

## 7. Set Production Environment Variables

Create the environment file:

```bash
cat > .env <<'EOF'
PORT=5000
JWT_SECRET=replace_this_with_a_long_random_secret
DATABASE_PATH=/home/ubuntu/ehr-data/ehr.db
EOF
```

If you are using Oracle Linux, change the path to something like:

```bash
/home/opc/ehr-data/ehr.db
```

Create the database folder:

```bash
mkdir -p /home/ubuntu/ehr-data
```

Or for Oracle Linux:

```bash
mkdir -p /home/opc/ehr-data
```

## 8. Start the App

The app includes a bootstrap command that:

- creates tables if needed
- seeds demo data only if the database is empty
- starts the server

Run:

```bash
pm2 start npm --name ehr-system -- run oracle:start
pm2 save
pm2 startup
```

Follow the extra command that PM2 prints after `pm2 startup`.

## 9. Configure Nginx

Create an Nginx site config:

```bash
sudo tee /etc/nginx/sites-available/ehr-system >/dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/ehr-system /etc/nginx/sites-enabled/ehr-system
sudo nginx -t
sudo systemctl restart nginx
```

Optional cleanup:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl reload nginx
```

## 10. Test the Deployment

Open these URLs in the browser:

- `http://YOUR_PUBLIC_IP/`
- `http://YOUR_PUBLIC_IP/api/health`

The health endpoint should return JSON.

## 11. Optional: Add HTTPS

If you later connect a domain name to the VM, you can install Certbot and enable HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Useful PM2 Commands

```bash
pm2 status
pm2 logs ehr-system
pm2 restart ehr-system
pm2 stop ehr-system
```

## Notes

- Always Free VM capacity is not guaranteed in every region.
- Oracle may reclaim idle Always Free compute instances.
- For a dissertation demo, this approach is usually good enough.
- For a stronger production setup later, move the database to PostgreSQL.
