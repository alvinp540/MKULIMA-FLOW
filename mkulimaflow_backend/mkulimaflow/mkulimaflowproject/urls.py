from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path

from mkulimaflowapp.forms import RoleAuthenticationForm

urlpatterns = [
    path('admin/', admin.site.urls),
    path(
        'login/',
        auth_views.LoginView.as_view(
            authentication_form=RoleAuthenticationForm,
        ),
        name='login',
    ),
    path('', include('mkulimaflowapp.urls')),
    path('', include('django.contrib.auth.urls')),
]
