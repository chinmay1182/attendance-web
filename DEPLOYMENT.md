# Deployment Details

## Hostinger VPS Info
- **Project Name**: Attendance Web
- **Directory**: `/home/myaccount/htdocs/myaccount.asia` (Check deploy.yml for exact path)

## Docker Containers
This project runs two containers:

| Service | Container Name | Internal Port | Host Port (VPS) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js App** | `attendance-web` | 3000 | **3001** | The main website. Access via `http://VPS_IP:3001` |
| **Redis** | `attendance-redis` | 6379 | **-** | Internal Cache. Not exposed to outside world. |

## Useful Commands

**Check what is running:**
```bash
docker ps
```
*This lists all active containers, their names, and ports.*

**View Logs:**
```bash
docker logs attendance-web
docker logs attendance-redis
```

**Restart Everything:**
```bash
cd /path/to/project
docker compose restart
```

## How to add more projects?
If you add a new project later, just make sure to pick a **different Host Port** (e.g., 3002, 3003) in its `docker-compose.yml`.
