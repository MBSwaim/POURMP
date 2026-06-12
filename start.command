#!/bin/bash
cd /Users/the4leafclovr-pc/Desktop/Manhattan_Project/POURMP
echo "Starting POURMP..."
/usr/local/bin/node node_modules/next/dist/bin/next dev &
sleep 5
open http://localhost:3000
wait
