#!/bin/bash
# Security Hotfix Deployment Script
# Run this AFTER deploying the updated code to production

echo "🚨 CCIS-CodeHub Security Hotfix Deployment"
echo "============================================"

# Step 1: Generate new secret key
echo ""
echo "Step 1: Generate new Django SECRET_KEY"
NEW_SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(50))")
echo "New SECRET_KEY: $NEW_SECRET"
echo ""
echo "⚠️  UPDATE your production .env with this new DJANGO_SECRET_KEY"
echo ""

# Step 2: Run token blacklist migrations
echo "Step 2: Running token blacklist migrations..."
python manage.py migrate token_blacklist

# Step 3: Identify compromised admin
echo ""
echo "Step 3: Identifying compromised admin..."
python manage.py shell <<EOF
from apps.accounts.models import User
try:
    admin = User.objects.get(id='2b4657a3-4a07-420c-8403-d621ab5fe0a2')
    print(f"⚠️  Compromised Admin Found:")
    print(f"   Username: {admin.username}")
    print(f"   Email: {admin.email}")
    print(f"   Role: {admin.role}")
    print(f"   Last Login: {admin.last_login}")
except User.DoesNotExist:
    print("✅ Admin user not found in this database (may be on different environment)")
EOF

echo ""
echo "Step 4: MANUAL ACTIONS REQUIRED:"
echo "  1. Update DJANGO_SECRET_KEY in production environment/secrets manager"
echo "  2. Reset password for the compromised admin account"
echo "  3. Restart the application to apply new secret key"
echo "  4. Verify old tokens no longer work"
echo ""
echo "============================================"
echo "🎯 Deployment script complete!"
