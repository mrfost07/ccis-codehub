# Backend: Core App Admin
# apps/core/admin.py

from django.contrib import admin
from .models import AppSettings
from .admin_settings import AppSettingsAdmin

# AppSettings is registered in admin_settings.py
# This file just imports it to make it available
