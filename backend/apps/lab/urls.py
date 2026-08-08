from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'labs', views.CodingLabViewSet, basename='lab')
router.register(r'problems', views.LabProblemViewSet, basename='lab-problem')

urlpatterns = [path('', include(router.urls))]
