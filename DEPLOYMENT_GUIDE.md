# specific instructions on how to handle the deployment

## 1. Prepare Your VPS (Hostinger)

You need to install Docker and Git on your VPS. I noticed you are using Ubuntu 24.04.

1.  **Connect to your VPS** via SSH (use Putty or Terminal):
    ```bash
    ssh root@72.62.62.252
    # Password: (Enter the password you provided)
    ```

2.  **Run the Setup Script** (or install manually):
    You can copy the contents of `scripts/setup_vps.sh` to your server and run it, or just run these commands on the server:
    ```bash
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    apt-get install -y git
    ```

## 2. Set Up the Repository on VPS

For the auto-deploy to work, the code must exist on the server first.

1.  **Generate an SSH Key on VPS** (needed to pull from GitHub):
    On your VPS, run:
    ```bash
    ssh-keygen -t ed25519 -C "vps-deploy-key"
    cat /root/.ssh/id_ed25519.pub
    ```
    Copy the output (the public key).

2.  **Add Key to GitHub**:
    -   Go to your GitHub Repo -> **Settings** -> **Deploy key**.
    -   Add a new key, paste the public key, and give it a name (e.g., "VPS Key").

3.  **Clone the Repository**:
    We will use the CloudPanel directory structure you provided:
    ```bash
    mkdir -p /home/myaccount/htdocs/myaccount.asia
    cd /home/myaccount/htdocs/myaccount.asia
    # Ensure the directory is empty or just clone into it if it doesn't exist
    git clone git@github.com:chinmay1182/attendance-web.git .
    ```
    *(If using a different username, replace `chinmay1182`)*

4.  **Create the Environment File**:
    The server needs your database credentials and API keys.
    ```bash
    nano .env
    ```
    -   Paste the content of your local `.env.local` here.
    -   Press `Ctrl+X`, then `Y`, then `Enter` to save.

## 3. Set Up GitHub Actions

Now config the "auto-deploy" part on GitHub.

1.  Go to your GitHub Repo -> **Settings** -> **Secrets and variables** -> **Actions**.
2.  Add the following **New Repository Secrets**:
    -   `VPS_HOST`: `72.62.62.252`
    -   `VPS_USERNAME`: `root`
    -   `VPS_PASSWORD`: `(Your VPS Password)`
    
    *Note: The deployment uses Port 3001 as specified.*

## 4. Push Changes

 Now push the files I created for you:
 ```bash
 git add .
 git commit -m "Add Docker deployment config"
 git push origin main
 ```

Once pushed, go to the **Actions** tab in GitHub to watch the deployment happen!
