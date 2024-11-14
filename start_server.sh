#!/bin/bash
cd /home/ec2-user/app
pm2 stop all
pm2 start server.js