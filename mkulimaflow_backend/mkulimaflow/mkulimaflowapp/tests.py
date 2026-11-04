from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse

from .forms import RegisterForm


class AuthenticationTests(TestCase):
    password = "Strong-test-password-593!"

    def setUp(self):
        self.farmer_group, _ = Group.objects.get_or_create(name="farmer")
        self.buyer_group, _ = Group.objects.get_or_create(name="buyer")
        self.user = get_user_model().objects.create_user(
            username="farmer1",
            email="farmer@example.com",
            password=self.password,
        )
        self.user.groups.add(self.farmer_group)

    def test_login_accepts_username_or_email_for_selected_role(self):
        for identifier in ("farmer1", "farmer@example.com"):
            response = self.client.post(
                reverse("login"),
                {
                    "username": identifier,
                    "password": self.password,
                    "role": "farmer",
                },
                HTTP_HOST="localhost",
            )
            self.assertEqual(response.status_code, 302)
            self.assertEqual(response["Location"], "/home")
            self.client.logout()

    def test_login_rejects_an_incorrect_role(self):
        response = self.client.post(
            reverse("login"),
            {
                "username": "farmer1",
                "password": self.password,
                "role": "buyer",
            },
            HTTP_HOST="localhost",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["form"].non_field_errors())

    def test_login_rejects_ambiguous_username_and_email(self):
        get_user_model().objects.create_user(
            username="buyer1",
            email="farmer1",
            password=self.password,
        )

        self.assertIsNone(
            authenticate(
                username="farmer1",
                password=self.password,
                role="farmer",
            )
        )

    def test_registration_assigns_selected_role(self):
        form = RegisterForm(
            data={
                "username": "buyer1",
                "email": "buyer@example.com",
                "password1": "Strong-buyer-password-593!",
                "password2": "Strong-buyer-password-593!",
                "role": "buyer",
            }
        )

        self.assertTrue(form.is_valid(), form.errors)
        user = form.save()
        self.assertTrue(user.groups.filter(name="buyer").exists())

    def test_home_requires_login_and_login_page_is_available(self):
        home_response = self.client.get("/home", HTTP_HOST="localhost")
        login_response = self.client.get(
            reverse("login"),
            HTTP_HOST="localhost",
        )
        signup_response = self.client.get(
            reverse("sign_up"),
            HTTP_HOST="localhost",
        )

        self.assertEqual(home_response.status_code, 302)
        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(signup_response.status_code, 200)
        self.assertContains(login_response, "Farmer")
        self.assertContains(login_response, "Buyer")
        self.assertContains(login_response, reverse("sign_up"))
        self.assertContains(signup_response, reverse("login"))

    def test_authenticated_navigation_uses_post_for_logout(self):
        self.client.force_login(self.user)
        response = self.client.get("/home", HTTP_HOST="localhost")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, f'action="{reverse("logout")}"')
        self.assertContains(response, 'method="post"')

    def test_admin_can_manage_users(self):
        admin = get_user_model().objects.create_superuser(
            username="siteadmin",
            email="admin@example.com",
            password=self.password,
        )
        self.client.force_login(admin)

        response = self.client.get(
            reverse("admin:auth_user_change", args=[self.user.pk]),
            HTTP_HOST="localhost",
        )

        self.assertEqual(response.status_code, 200)
