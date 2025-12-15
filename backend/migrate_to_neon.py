"""
SQLite to Neon PostgreSQL Migration Script
===========================================
This script migrates your local SQLite database to Neon PostgreSQL.

Usage:
1. Set your DATABASE_URL in .env 
2. Run: python migrate_to_neon.py
"""

import os
import sys

# Add Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║     SQLite to Neon PostgreSQL Migration                      ║
║     CCIS CodeHub Database Transfer                           ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Check if db.sqlite3 exists
    if not os.path.exists('db.sqlite3'):
        print("❌ Error: db.sqlite3 not found!")
        return False
    
    print(f"✅ Found db.sqlite3 ({os.path.getsize('db.sqlite3') / 1024 / 1024:.2f} MB)")
    
    # =========================================
    # STEP 1: Export data from SQLite
    # =========================================
    print("\n" + "="*60)
    print("STEP 1: Exporting data from SQLite...")
    print("="*60)
    
    print("📌 Configuring Django to use SQLite for export...")
    
    # Temporarily remove DATABASE_URL to force SQLite
    saved_db_url = os.environ.pop('DATABASE_URL', None)
    saved_db_name = os.environ.pop('DB_NAME', None)
    
    import django
    from django.conf import settings
    
    # Force SQLite configuration
    settings.DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db.sqlite3'),
        }
    }
    
    django.setup()
    
    from django.core.management import call_command
    from django.db import connections
    
    # Close any existing connections
    connections.close_all()
    
    print("📌 Exporting all data to data_backup.json...")
    
    try:
        import io
        with io.open('data_backup.json', 'w', encoding='utf-8') as f:
            call_command(
                'dumpdata',
                '--natural-foreign',
                '--natural-primary',
                '--exclude=contenttypes',
                '--exclude=auth.permission', 
                '--exclude=admin.logentry',
                '--exclude=sessions.session',
                '--indent=2',
                stdout=f
            )
        
        backup_size = os.path.getsize('data_backup.json') / 1024
        print(f"✅ Data exported to data_backup.json ({backup_size:.1f} KB)")
    except Exception as e:
        print(f"❌ Export error: {e}")
        return False
    
    # =========================================
    # STEP 2: Check Neon connection
    # =========================================
    print("\n" + "="*60)
    print("STEP 2: Checking Neon database connection...")
    print("="*60)
    
    # Restore DATABASE_URL
    if saved_db_url:
        os.environ['DATABASE_URL'] = saved_db_url
    if saved_db_name:
        os.environ['DB_NAME'] = saved_db_name
    
    # Read from .env if not in environment
    if not os.environ.get('DATABASE_URL'):
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        url = line.strip().split('=', 1)[1]
                        # Remove quotes if present
                        url = url.strip('"\'')
                        os.environ['DATABASE_URL'] = url
                        break
        except:
            pass
    
    neon_url = os.environ.get('DATABASE_URL')
    
    if not neon_url:
        print("""
❌ DATABASE_URL not set!

Please add to your .env file:
    DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

Then run this script again.
        """)
        return False
    
    # Parse host from URL
    try:
        host = neon_url.split('@')[1].split('/')[0]
        print(f"✅ DATABASE_URL is set")
        print(f"   Host: {host}")
    except:
        print(f"✅ DATABASE_URL is set")
    
    # =========================================
    # STEP 3: Run migrations on Neon
    # =========================================
    print("\n" + "="*60)
    print("STEP 3: Running migrations on Neon database...")
    print("="*60)
    
    # Reconfigure Django for Neon
    import dj_database_url
    settings.DATABASES = {
        'default': dj_database_url.config(
            default=neon_url,
            conn_max_age=600,
            ssl_require=True,
        )
    }
    
    # Close old connections
    connections.close_all()
    
    print("📌 Creating tables in Neon PostgreSQL...")
    try:
        call_command('migrate', '--run-syncdb', verbosity=1)
        print("✅ Database tables created in Neon")
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return False
    
    # =========================================
    # STEP 4: Load data into Neon
    # =========================================
    print("\n" + "="*60)
    print("STEP 4: Loading data into Neon database...")
    print("="*60)
    
    print("📌 Importing data to Neon PostgreSQL...")
    try:
        call_command('loaddata', 'data_backup.json', verbosity=1)
        print("✅ Data loaded successfully!")
    except Exception as e:
        print(f"⚠️ Load warning: {e}")
        print("   Some data may not have loaded due to constraints.")
    
    # =========================================
    # STEP 5: Verify
    # =========================================
    print("\n" + "="*60)
    print("STEP 5: Verifying migration...")
    print("="*60)
    
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user_count = User.objects.count()
        admin_count = User.objects.filter(is_superuser=True).count()
        print(f"✅ Users in Neon: {user_count}")
        print(f"✅ Admin users: {admin_count}")
    except Exception as e:
        print(f"⚠️ Verification error: {e}")
    
    print("""
╔══════════════════════════════════════════════════════════════╗
║     ✅ MIGRATION COMPLETE!                                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Your data has been transferred to Neon PostgreSQL.         ║
║                                                              ║
║  Next steps:                                                 ║
║  1. Test your application with Neon                         ║
║  2. Keep db.sqlite3 as backup                               ║
║  3. Deploy to Railway with DATABASE_URL set                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
