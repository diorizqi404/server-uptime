#!/bin/bash
cd /home/ec2-user/api
PUBLIC_IP=$(curl -s https://checkip.amazonaws.com/)
echo "PUBLIC_IP=${PUBLIC_IP}" > public_ip.config
sudo npm install