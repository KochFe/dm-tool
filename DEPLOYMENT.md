# Deployment Guide: DM Co-Pilot to Hetzner VPS

This guide walks you through deploying the DM Co-Pilot to a Hetzner VPS under a custom domain with HTTPS. It's structured to explain not just *how* to deploy, but *why* each step matters. If you're new to web hosting, start with **Part 1** to build intuition. If you're ready to roll up your sleeves, jump to **Part 2**.

---

## Part 1: Concepts — How Web Hosting Works

Before diving into commands, let's understand what happens when a user visits your app.

### The Journey of a Browser Request

When someone types `https://dmtool.example.com` into their browser:

1. **DNS Lookup:** Browser asks a DNS server, "What IP address does `dmtool.example.com` point to?"
2. **IP Resolution:** DNS returns an IP address (e.g., `123.45.67.89`) — your VPS's public IP.
3. **TCP Connection:** Browser connects to `123.45.67.89:443` (port 443 is HTTPS).
4. **TLS Handshake:** Browser and server agree on an encrypted connection and verify the server's certificate.
5. **HTTP Request:** Browser sends the request over the encrypted connection.
6. **Server Response:** Your VPS sends back HTML, JSON, or other data.

Each step is critical. If DNS doesn't point to your VPS, the browser can't find you. If TLS is misconfigured, users see a "not secure" warning. We'll handle each.

### DNS: Mapping Domain to IP

**DNS (Domain Name System)** is the phonebook of the internet. Your domain registrar (GoDaddy, Namecheap, etc.) stores records that tell the world how to find your VPS.

The most common record type is an **A record**:
- **Name:** `dmtool.example.com`
- **Type:** A (address)
- **Value:** `123.45.67.89` (your VPS's public IP)

When someone looks up `dmtool.example.com`, DNS responds with `123.45.67.89`. The browser then knows where to connect.

**Propagation time:** DNS changes don't happen instantly. It typically takes 5 minutes to 48 hours for DNS to propagate globally. You can check propagation with `nslookup dmtool.example.com` or online tools like [dnschecker.org](https://dnschecker.org).

### TLS/HTTPS: Secure Communication with Certificates

**TLS (Transport Layer Security)** encrypts traffic between the browser and server. When you visit an HTTPS site:

1. Server presents a **certificate** — a cryptographic credential proving it's the legitimate owner of the domain.
2. Browser verifies the certificate was issued by a trusted **Certificate Authority (CA)**.
3. They agree on encryption keys and exchange data securely.

**Let's Encrypt** is a free CA that automates certificate provisioning. Caddy (our reverse proxy, see below) automatically:
- Requests a certificate from Let's Encrypt when your site first starts
- Renews it before expiry (Let's Encrypt certs are valid for 90 days)
- Handles all the complexity — you don't touch certificates manually

This is why we use Caddy: it eliminates the need to manage certificates yourself.

### Reverse Proxy: Caddy as the Front Door

A **reverse proxy** is software that sits between the internet and your app. Instead of clients connecting directly to your app, they connect to the reverse proxy, which forwards their request to the app.

**Why use a reverse proxy?**

1. **Single Entry Point:** All HTTPS traffic (port 443) comes through Caddy. Your app doesn't need to handle TLS.
2. **Request Routing:** Caddy can route requests intelligently:
   - `/api/*` → FastAPI backend (port 8000)
   - Everything else → Next.js frontend (port 3000)
3. **Authentication:** Caddy enforces basic auth before requests reach your app.
4. **TLS Termination:** Caddy handles the expensive encryption/decryption work.

**Network diagram:**

```
[Browser] -- HTTPS --> [Caddy :443] -- basic auth --> {
                                         /api/* → [Backend :8000]
                                         /health* → [Backend :8000]
                                         /* → [Frontend :3000]
                                       }
```

All internal communication (Caddy to Backend, Backend to Database) uses plain HTTP over Docker's internal network — no encryption needed.

### Docker in Production: Consistency and Simplicity

**Docker containers** package your app and all its dependencies into a single image. When you run that image, you get an identical environment every time.

**Why Docker in production?**

1. **"It works on my machine":** Your local laptop, CI/CD pipeline, and production VPS all run the same code and dependencies.
2. **Easy Updates:** To deploy a new version, you rebuild the image and restart the container. The old image is still available if you need to roll back.
3. **Resource Isolation:** Each container has its own filesystem and environment. If the backend crashes, the database stays running.
4. **Scaling:** If you need multiple backend instances later, it's just `docker compose up --scale backend=3`.

For a single-user app on a Hetzner VPS, Docker Compose orchestrates multiple containers (frontend, backend, database, reverse proxy) with a single command.

---

## Part 2: Initial Setup

This section guides you step by step from zero to a running app.

### Step 1: Prepare Your VPS

Log into your Hetzner VPS console and open a terminal.

#### Install Docker and Docker Compose

Docker is not pre-installed on most Linux distributions. Install both:

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install Docker (official guide: https://docs.docker.com/engine/install/ubuntu/)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group (so you can run docker without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group membership to take effect
exit
# SSH back in
```

#### Verify Installation

```bash
docker --version
docker compose --version
```

Both commands should print version numbers.

### Step 2: Clone the Repository

Choose a location to deploy your app. We recommend `/opt/dm-tool`:

```bash
sudo mkdir -p /opt/dm-tool
cd /opt/dm-tool

# Clone the repository
git clone https://github.com/YOUR_ORG/dm-tool .

# Verify Dockerfile and compose files exist
ls -la docker-compose.prod.yml Caddyfile
```

If the clone succeeds, you'll have all the code and configuration files needed.

### Step 3: Configure Environment Variables

Copy the example environment file and fill in real values:

```bash
cp .env.production.example .env.production
nano .env.production  # or use your favorite editor
```

You'll see something like:

```env
# === Domain & Auth ===
DOMAIN=yourdomain.com
BASIC_AUTH_USER=dm
BASIC_AUTH_PASSWORD_HASH=

# === PostgreSQL ===
POSTGRES_USER=dmtool
POSTGRES_PASSWORD=
POSTGRES_DB=dmtool

# === Backend ===
DATABASE_URL=postgresql+asyncpg://dmtool:YOUR_PASSWORD_HERE@db:5432/dmtool
DATABASE_URL_SYNC=postgresql://dmtool:YOUR_PASSWORD_HERE@db:5432/dmtool
BACKEND_CORS_ORIGINS=https://yourdomain.com

# === AI / Groq ===
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

# === Frontend ===
NEXT_PUBLIC_API_URL=
```

**Fill in each field:**

| Field | How to Obtain | Example |
|-------|---------------|---------|
| `DOMAIN` | Your domain name | `dmtool.example.com` |
| `POSTGRES_PASSWORD` | Generate a strong password (20+ chars, mix of letters/numbers/symbols) | `aB3xYz9#mK$qW2pL7&vN` |
| `DATABASE_URL` | Use the password above | `postgresql+asyncpg://dmtool:aB3xYz9#mK$qW2pL7&vN@db:5432/dmtool` |
| `DATABASE_URL_SYNC` | Same password, same host | `postgresql://dmtool:aB3xYz9#mK$qW2pL7&vN@db:5432/dmtool` |
| `BACKEND_CORS_ORIGINS` | Your domain with HTTPS | `https://dmtool.example.com` |
| `GROQ_API_KEY` | Get from [console.groq.com](https://console.groq.com) | `gsk_...` (long alphanumeric string) |
| `BASIC_AUTH_PASSWORD_HASH` | Generate in step 4 | (see below) |
| `NEXT_PUBLIC_API_URL` | Leave empty | (leave blank — Caddy proxies on same origin) |

**Important:** Make sure `POSTGRES_PASSWORD` and `DATABASE_URL` match exactly. If they don't, the backend won't connect to the database.

### Step 4: Generate Basic Auth Credentials

Basic auth protects your app from casual access. You need a username and a hashed password.

**Username:** We use `dm` (already in `.env.production`). Feel free to change it.

**Password hash:** Generate with Caddy:

```bash
# This will prompt you for a password, then print the hash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'your_secure_password_here'
```

Copy the output (it looks like `$2a$14$...`) and paste it into `.env.production` next to `BASIC_AUTH_PASSWORD_HASH`.

**Example:**

```bash
$ docker run --rm caddy:2-alpine caddy hash-password --plaintext 'MyS3cur3Pwd'
$2a$14$abcdefghijklmnopqrst.uvwxyz1234567890abcdefghijklmn

# Copy the hash into .env.production:
BASIC_AUTH_PASSWORD_HASH=$2a$14$abcdefghijklmnopqrst.uvwxyz1234567890abcdefghijklmn
```

### Step 5: Configure DNS

Log into your domain registrar's control panel (GoDaddy, Namecheap, etc.) and find the DNS settings.

Add or update an **A record:**

| Field | Value |
|-------|-------|
| Name | `dmtool` (or the subdomain you want) |
| Type | A |
| Value | Your VPS's public IP address |
| TTL | 3600 (or default) |

If your VPS IP is `123.45.67.89` and your domain is `example.com`, the final domain will be `dmtool.example.com`.

**Verify DNS propagation:**

```bash
# Wait 5-10 minutes, then:
nslookup dmtool.example.com

# Output should show your VPS's IP
```

Don't proceed until DNS is propagated. Caddy will fail to provision a Let's Encrypt certificate if it can't verify you own the domain.

### Step 6: Start the Services

Now all configuration is in place. Start the containers:

```bash
cd /opt/dm-tool

# Start all services in the background
docker compose -f docker-compose.prod.yml up -d

# Watch the startup process (Ctrl+C to exit)
docker compose -f docker-compose.prod.yml logs -f
```

**What's happening:**

1. Docker downloads the images (PostgreSQL, Node.js, Python, Caddy)
2. Containers start in dependency order: DB → Backend → Frontend → Caddy
3. Backend runs database migrations (Alembic)
4. Caddy requests a Let's Encrypt certificate (this takes ~30 seconds)
5. Once all containers are healthy, they're running

**Wait about 2-3 minutes for full startup.** You can check status with:

```bash
docker compose -f docker-compose.prod.yml ps
```

All services should show `Up` and `(healthy)`.

### Step 7: Verify the Deployment

Open a browser and visit `https://dmtool.example.com` (replace with your actual domain).

**You should see:**

1. A login prompt (basic auth) asking for username and password
2. Enter `dm` and your password from step 4
3. The DM Co-Pilot UI loads

**If you see an HTTPS certificate warning:** It usually means DNS isn't propagated yet or Caddy didn't provision the cert. Check logs:

```bash
docker compose -f docker-compose.prod.yml logs caddy
```

Common issues and solutions are in Part 4 (Troubleshooting).

### Step 8: Set Up GitHub Actions for Automatic Deployment (Optional)

Once your app is running, you can set up automatic deployment so that merging to `main` deploys to your VPS.

#### Generate a Deploy Key

On your VPS, create an SSH key pair:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""

# View the public key (you'll paste this into GitHub)
cat ~/.ssh/deploy_key.pub
```

Add the public key to your VPS's authorized keys:

```bash
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

#### Add GitHub Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Create three new secrets:

| Secret Name | Value |
|-------------|-------|
| `DEPLOY_SSH_KEY` | Contents of `~/.ssh/deploy_key` (the **private** key, starts with `-----BEGIN`) |
| `DEPLOY_HOST` | Your VPS's IP address or `dmtool.example.com` |
| `DEPLOY_USER` | Your VPS username (usually `root`) |

#### Verify Deployment Works

When you push to `main`, GitHub Actions should:

1. Run backend tests (pytest)
2. Run frontend build (npm run build)
3. If both pass, SSH into your VPS and run:
   ```bash
   cd /opt/dm-tool
   git pull origin main
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d
   ```
4. Verify the backend is healthy with a health check

If any step fails, the deployment stops and your currently running version stays up.

---

## Part 3: Day-to-Day Operations

Once deployed, these commands help you manage your app.

### Viewing Logs

Check what's happening in any service:

```bash
# View logs for all services (live stream, Ctrl+C to exit)
docker compose -f docker-compose.prod.yml logs -f

# View logs for a specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f db

# View last 50 lines (without live stream)
docker compose -f docker-compose.prod.yml logs --tail=50 backend
```

**Use this to diagnose issues:** If users report problems, check logs to see error messages.

### Restarting Services

If you need to restart the app:

```bash
# Restart all services (brief downtime)
docker compose -f docker-compose.prod.yml restart

# Restart a single service
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart frontend

# Stop and start (ensures clean state)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

**When to restart:**
- After manual config changes to `.env.production`
- If a service seems stuck or unresponsive
- As part of routine maintenance

### Updating to a New Version

When you have new code to deploy:

```bash
cd /opt/dm-tool

# Pull latest code from main branch
git pull origin main

# Rebuild Docker images with new code
docker compose -f docker-compose.prod.yml build

# Start the new images
docker compose -f docker-compose.prod.yml up -d

# Verify health
docker compose -f docker-compose.prod.yml ps
```

Docker Compose will:
1. Stop the old containers gracefully
2. Start new ones with the new code
3. Keep the database running throughout

**Downtime:** Usually 10-30 seconds while containers restart.

### Database Backup

**Important:** Back up your database regularly. This saves your campaigns, characters, NPCs, and quests.

```bash
# Create a backup file
docker compose -f docker-compose.prod.yml exec db pg_dump -U dmtool dmtool > backup_$(date +%Y%m%d_%H%M%S).sql

# The file is created in the current directory, e.g., backup_20260316_143022.sql
# You should copy this somewhere safe (cloud storage, local machine, etc.)
```

**Backup often** — at least weekly, or after important changes.

### Database Restore

If something goes wrong or you need to restore from a backup:

```bash
# Replace backup.sql with your actual backup filename
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U dmtool dmtool
```

This is a destructive operation — it **replaces** the current database with the backed-up version. Make sure you're restoring the right backup.

### Checking Disk Usage

Docker images and volumes can consume disk space. Monitor usage:

```bash
# Overall Docker disk usage
docker system df

# Disk usage per container
docker compose -f docker-compose.prod.yml exec db du -sh /var/lib/postgresql/data
```

If you're running low on space:

```bash
# Remove old, unused images (safe)
docker image prune

# Remove everything not currently in use (more aggressive, but safe if no other Docker apps)
docker system prune
```

### Automatic Certificate Renewal

**You don't need to do anything.** Caddy automatically:

1. Checks if your Let's Encrypt certificate is expiring
2. Requests a renewal 30 days before expiry
3. Restarts itself with the new certificate

Certs are valid for 90 days, so renewal happens roughly every 60 days in the background.

To verify cert is working:

```bash
# View certificate details
curl -k -I https://dmtool.example.com

# The response headers should include certificate info
# Or visit the site in a browser and click the lock icon
```

---

## Part 4: Troubleshooting

This section covers common problems and how to diagnose them.

### Problem: "Connection Refused" When Visiting the Site

**Symptom:** Browser shows "This site can't be reached" or "Connection refused."

**Diagnosis:**

1. Check if services are running:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   All services should show `Up (healthy)`. If not, restart:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

2. Check if ports are actually listening:
   ```bash
   curl -I http://localhost:80
   curl -I http://localhost:443
   ```
   Both should respond (even if redirecting).

3. Verify DNS is pointing to your VPS:
   ```bash
   nslookup dmtool.example.com
   # Should show your VPS's IP address
   ```

4. Check if a firewall is blocking ports 80/443:
   ```bash
   # On the VPS
   sudo ufw status

   # If firewall is active, allow HTTP and HTTPS
   sudo ufw allow 80
   sudo ufw allow 443
   ```

### Problem: HTTPS Certificate Error ("Not Secure")

**Symptom:** Browser shows "Certificate not valid" or "Certificate not trusted."

**Diagnosis:**

1. Check Caddy logs for certificate provisioning errors:
   ```bash
   docker compose -f docker-compose.prod.yml logs caddy | grep -i tls
   ```

2. Common causes:
   - **DNS not propagated yet:** Wait 5-10 minutes and try again.
   - **Port 80 blocked:** Let's Encrypt uses port 80 to verify you own the domain. Ensure it's open.
   - **Domain mismatch:** Make sure `DOMAIN` in `.env.production` matches the actual domain you're visiting.

3. Force certificate renewal:
   ```bash
   # Remove old cert data
   docker compose -f docker-compose.prod.yml down
   docker volume rm dm-tool_caddy_data  # Replace with your project name if different
   docker compose -f docker-compose.prod.yml up -d

   # Caddy will request a fresh certificate
   ```

### Problem: Database Connection Error

**Symptom:** Backend logs show "could not connect to database" or similar.

**Diagnosis:**

1. Check database is running and healthy:
   ```bash
   docker compose -f docker-compose.prod.yml ps db
   ```
   Should show `(healthy)`.

2. Verify `.env.production` has correct database credentials:
   ```bash
   grep DATABASE_URL .env.production
   grep POSTGRES_PASSWORD .env.production
   ```
   Both must match (same password).

3. Check database logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs db
   ```

4. Try connecting directly:
   ```bash
   docker compose -f docker-compose.prod.yml exec db psql -U dmtool -d dmtool -c "SELECT 1;"
   ```
   If this succeeds, the database is fine. Problem is elsewhere (maybe env vars not loaded).

5. Restart the backend:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

### Problem: "Groq API Error" or AI Features Don't Work

**Symptom:** Chat, generators return errors about AI provider.

**Diagnosis:**

1. Check backend logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend | grep -i groq
   ```

2. Verify API key is set:
   ```bash
   grep GROQ_API_KEY .env.production
   ```
   Should be non-empty.

3. Verify API key is valid by testing it locally:
   ```bash
   # This requires curl and jq installed
   curl -s -H "Authorization: Bearer YOUR_GROQ_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"hi"}]}' \
     https://api.groq.com/openai/v1/chat/completions | jq .
   ```
   If the request succeeds, the API key is valid.

4. Restart backend:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

### Problem: Container Keeps Restarting

**Symptom:** `docker compose ps` shows a service restarting (state changes to `Restarting`).

**Diagnosis:**

1. Check logs immediately:
   ```bash
   docker compose -f docker-compose.prod.yml logs [service_name]
   ```
   The last few lines show the error that caused the crash.

2. Common causes:
   - **Missing env var:** Backend won't start without `GROQ_API_KEY`.
   - **Database not ready:** Backend tries to connect before DB is up. Usually self-heals after a few retries.
   - **Port already in use:** If port 8000 is in use, backend can't start. Check with `netstat -tlnp | grep 8000`.

3. Wait a few seconds and check status again:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   If it keeps restarting, fix the issue and restart manually:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

### Problem: "502 Bad Gateway" from Caddy

**Symptom:** Browser shows "502 Bad Gateway" or Caddy logs mention "unhealthy backend."

**Diagnosis:**

1. Check backend is healthy:
   ```bash
   docker compose -f docker-compose.prod.yml ps backend
   ```
   Should show `(healthy)`.

2. Verify backend is listening:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend curl http://localhost:8000/health
   ```
   Should return a JSON response.

3. Check Caddy config syntax:
   ```bash
   docker compose -f docker-compose.prod.yml exec caddy caddy validate --config /etc/caddy/Caddyfile
   ```

4. Restart Caddy:
   ```bash
   docker compose -f docker-compose.prod.yml restart caddy
   ```

### Problem: High Disk Usage

**Symptom:** VPS storage is nearly full.

**Diagnosis:**

1. Check Docker disk usage:
   ```bash
   docker system df
   ```

2. Check database size:
   ```bash
   docker compose -f docker-compose.prod.yml exec db du -sh /var/lib/postgresql/data
   ```

3. If old Docker images are taking space, clean up:
   ```bash
   docker image prune -a  # Remove all unused images
   ```

4. If the database is very large, consider archiving old campaign data.

### Rolling Back to a Previous Version

If a deployment breaks things and you need to revert:

```bash
# See recent commits
git log --oneline | head -10

# Go back to a known-good commit
git checkout abc1234  # Replace with the commit hash

# Rebuild and restart with the old code
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
```

The database is unchanged — you're just reverting the code. This is why we back up the database separately.

### Checking Overall Health

A handy health check command:

```bash
echo "=== Services ===" && docker compose -f docker-compose.prod.yml ps && \
echo -e "\n=== Backend Health ===" && curl -s http://localhost:8000/health && \
echo -e "\n=== Database ===" && docker compose -f docker-compose.prod.yml exec db psql -U dmtool -d dmtool -c "SELECT now();" && \
echo -e "\n=== Disk ===" && docker system df
```

This shows service status, backend health, database connectivity, and disk usage all at once.

---

## Summary

Congratulations! Your DM Co-Pilot is now deployed and running in production. Here's a quick reference:

| Task | Command |
|------|---------|
| View logs | `docker compose -f docker-compose.prod.yml logs -f` |
| Restart all | `docker compose -f docker-compose.prod.yml restart` |
| Update code | `git pull && docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d` |
| Backup database | `docker compose -f docker-compose.prod.yml exec db pg_dump -U dmtool dmtool > backup.sql` |
| Check health | `docker compose -f docker-compose.prod.yml ps` |

For deeper dives into Docker, PostgreSQL, or Caddy, refer to their official documentation:
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

Good luck with your deployment!
