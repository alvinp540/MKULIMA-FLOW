from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from .roles import ROLE_CHOICES


class RoleAuthenticationForm(forms.Form):
    username = forms.CharField(label="Username or email")
    password = forms.CharField(
        label="Password",
        strip=False,
        widget=forms.PasswordInput,
    )
    role = forms.ChoiceField(choices=ROLE_CHOICES)

    error_messages = {
        "invalid_login": "Please enter a correct username/email and password for the selected account type.",
    }

    def __init__(self, request=None, *args, **kwargs):
        self.request = request
        self.user_cache = None
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get("username")
        password = cleaned_data.get("password")
        role = cleaned_data.get("role")

        if username and password and role:
            self.user_cache = authenticate(
                self.request,
                username=username,
                password=password,
                role=role,
            )
            if self.user_cache is None:
                raise ValidationError(
                    self.error_messages["invalid_login"],
                    code="invalid_login",
                )

        return cleaned_data

    def get_user(self):
        return self.user_cache


class RegisterForm(UserCreationForm):
    email = forms.EmailField(required=True)
    role = forms.ChoiceField(choices=ROLE_CHOICES)

    class Meta:
        model = User
        fields = ["username", "email", "password1", "password2"]

    def clean_email(self):
        email = self.cleaned_data["email"]
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError("An account with this email already exists.")
        return email

    def clean_username(self):
        username = self.cleaned_data["username"]
        if User.objects.filter(email__iexact=username).exists():
            raise ValidationError("This username is already used as an email address.")
        return username

    def save(self, commit=True):
        user = super().save(commit=commit)
        if commit:
            self._assign_role(user)
        else:
            save_m2m = self.save_m2m

            def save_m2m_with_role():
                save_m2m()
                self._assign_role(user)

            self.save_m2m = save_m2m_with_role
        return user

    def _assign_role(self, user):
        from django.contrib.auth.models import Group

        group, _ = Group.objects.get_or_create(name=self.cleaned_data["role"])
        user.groups.add(group)
