from django.urls import path

from . import views

urlpatterns = [
    path("health", views.health),
    path("conversations", views.conversations),
    path("conversations/<str:conv_id>", views.conversation_detail),
    path("conversations/<str:conv_id>/messages", views.conversation_messages),
    path("chat", views.chat),
]
