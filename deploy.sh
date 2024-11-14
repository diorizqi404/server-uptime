#!/bin/bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use LTS version
nvm use --lts

# Masuk ke direktori aplikasi
cd /home/ec2-user/app

# Install dependencies
npm install

# Restart aplikasi dengan PM2
pm2 stop all || true
pm2 start index.js --name "nodejs-app"