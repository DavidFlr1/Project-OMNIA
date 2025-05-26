#!/bin/bash
# Compress world folder and ship to GCS (hourly CronJob will run this)
set -e
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
tar -czf /tmp/world-$TIMESTAMP.tar.gz -C /data/world .
gsutil cp /tmp/world-$TIMESTAMP.tar.gz gs://$GCS_BUCKET/mc-backups/
rm /tmp/world-$TIMESTAMP.tar.gz
