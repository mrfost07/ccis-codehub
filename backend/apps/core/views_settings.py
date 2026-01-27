# Backend: Settings API View
# apps/core/views.py (add to existing file)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models_settings import AppSettings


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_app_settings(request):
    """
    Return runtime app settings based on user role
    
    Response:
    {
        "features": {
            "ai_mentor": true,
            "code_editor": true,
            ...
        }
    }
    """
    features = AppSettings.get_features_dict(user=request.user)
    
    return Response({
        'success': True,
        'features': features
    })
