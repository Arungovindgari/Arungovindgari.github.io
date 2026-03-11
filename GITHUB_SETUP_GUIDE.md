# 🚀 Complete GitHub Setup & Live Deployment Guide
## For: Arun Govindgari | Portfolio

---

## PART 1 — Install Git (One-Time Setup)

### Step 1: Install Git on Windows
1. Go to: https://git-scm.com/download/win
2. Download and install (keep all default settings)
3. Restart VS Code after installing

### Step 2: Configure Git (run in VS Code terminal)
```bash
git config user.name "your name"
git config user.email "mail"
```

---

## PART 2 — Create GitHub Repository

### Step 3: Create the special GitHub Pages repo
1. Go to: https://github.com/new
2. Repository name - This EXACT name makes GitHub auto-host your site
3. Set to: **Public**
4. Click **"Create repository"**

---

## PART 3 — Push Your Code (VS Code Terminal)

### Step 4: Open VS Code Terminal


### Step 5: Initialize and push
```powershell
# Initialize git repository
git init

# Add all files
git add .

# First commit
git commit -m "Initial portfolio deployment"

# Rename branch to main
git branch -M main

# Connect to your GitHub repo (copy this line exactly)
git remote add origin "url"

# Push code to GitHub
git push -u origin main
```

