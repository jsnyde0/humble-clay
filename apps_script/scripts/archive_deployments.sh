#!/bin/bash
# =============================================================================
# archive_deployments.sh
# =============================================================================
# Purpose: This script archives (undeploys) old Google Apps Script deployments 
# while preserving the specified HEAD and LATEST deployments.
#
# Why use this script?
# 1. Google Apps Script retains all deployment versions, which can accumulate over time
# 2. Too many deployments can make the list cluttered and harder to manage
# 3. This script provides a simple way to clean up old, unused deployments
#
# Usage:
#   ./archive_deployments.sh
#
# Requirements:
#   - Google clasp CLI tool installed (npm install -g @google/clasp)
#   - Authenticated with clasp (clasp login)
#   - Run from the directory containing your Apps Script project
#
# Configuration:
#   - Modify HEAD_DEPLOYMENT and LATEST_DEPLOYMENT variables below to specify 
#     which deployments to preserve
#   - You can find deployment IDs by running: clasp deployments
#
# Note: This script will not delete the actual versions from Google Apps Script,
# it will only "undeploy" them (archive them). The code versions remain intact.
# =============================================================================

# Deployments to keep
HEAD_DEPLOYMENT="AKfycbxDV6ooGBi1SbwFr4E-r-_Stl9Szd2osyz_laL7OAc"
LATEST_DEPLOYMENT="AKfycbxTfcGIU0T38a5XEjh5nssCvwG_7Lt2bFRbXegtt2l7xynrBba5cEwPoevKEB6Z9Qix"

# Get all deployments
deployments=$(npx clasp deployments)

# Parse and process each deployment
echo "$deployments" | grep "AKfycb" | while read -r line; do
  # Extract deployment ID
  deployment_id=$(echo "$line" | awk '{print $2}')
  
  # Skip the deployments we want to keep
  if [[ "$deployment_id" == "$HEAD_DEPLOYMENT" || "$deployment_id" == "$LATEST_DEPLOYMENT" ]]; then
    echo "Keeping deployment: $deployment_id"
    continue
  fi
  
  # Undeploy this deployment
  echo "Archiving deployment: $deployment_id"
  npx clasp undeploy "$deployment_id"
done

echo "Completed archiving old deployments"
