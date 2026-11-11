from django.urls import path

from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('home', views.home, name='home'),
    path('sign-up', views.sign_up, name='sign_up'),
    path('api/auth/csrf/', views.api_csrf, name='api_csrf'),
    path('api/auth/session/', views.api_session, name='api_session'),
    path('api/auth/login/', views.api_login, name='api_login'),
    path('api/auth/signup/', views.api_signup, name='api_signup'),
    path('api/auth/logout/', views.api_logout, name='api_logout'),
    path('api/farms/', views.api_farms, name='api_farms'),
    path('api/flocks/', views.api_flocks, name='api_flocks'),
    path('api/flocks/<int:flock_id>/', views.api_flock_detail, name='api_flock_detail'),
]
