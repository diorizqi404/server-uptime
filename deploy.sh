#!/bin/bash

# Set HOME explicitly since CodeDeploy might not set it correctly
export HOME=/home/ec2-user

# Source the user's bash profile to load any existing environment settings
source $HOME/.bash_profile

# Ensure NVM directory is set and loaded
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Verify NVM is loaded
if ! command -v nvm &> /dev/null; then
    echo "NVM is not loaded properly. Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    # Reload NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    # Source bash_profile again
    source $HOME/.bash_profile
fi

# Print debugging information
echo "NVM version: $(nvm --version)"
echo "Current directory: $(pwd)"

# Install and use Node.js 22
nvm install 22
nvm use 22

# Print Node.js version for verification
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Navigate to app directory
cd /home/ec2-user/app

# Install dependencies
npm install

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Stop any existing PM2 process running the app
if pm2 list | grep -q "app"; then
    pm2 stop app
    pm2 delete app
fi

# Start the app with PM2 and set it to restart on server reboot
pm2 start /home/ec2-user/app/index.js --name "app"
pm2 startup
pm2 save

# Print PM2 status
pm2 status