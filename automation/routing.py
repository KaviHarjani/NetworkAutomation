from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/execution/(?P<execution_id>\w+)/$', consumers.ExecutionConsumer.as_asgi()),
]