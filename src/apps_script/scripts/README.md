# Maintenance Scripts

This directory contains utility scripts for maintaining and managing the Google Apps Script project.

## Available Scripts

### Archive Deployments (`archive_deployments.sh`)

**Purpose:** This script helps manage Google Apps Script deployments by archiving (undeploying) old versions while preserving the most recent or important ones.

**Usage:**

```bash
./archive_deployments.sh
```

**How it works:**
1. The script reads all existing deployments using `clasp deployments`
2. It preserves the HEAD deployment and the latest numbered deployment (configurable in the script)
3. All other deployments are archived using `clasp undeploy`

**When to use:**
- When you have accumulated many deployment versions
- Before creating new deployments to clean up the list
- As part of regular maintenance to keep the deployment list manageable

**Configuration:**
Edit the script to modify which deployments should be preserved:
- `HEAD_DEPLOYMENT`: The ID of the HEAD deployment (usually the most recent)
- `LATEST_DEPLOYMENT`: The ID of another important deployment to preserve (e.g., the production version)

## Best Practices

1. **Regular Cleanup**: Run the archive script periodically to prevent deployment list clutter
2. **Version Control**: Always ensure your code is committed to version control before archiving deployments
3. **Backup**: Consider making a backup of important deployments by using `clasp version` to view and create versions 