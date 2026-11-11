import json

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.test import Client, TestCase
from django.urls import reverse

from .forms import RegisterForm
from .models import EggProduction, Farm, FeedItem, FeedMovement, Flock


class FlockModelTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            username="flockowner",
            password="Strong-test-password-593!",
        )
        self.farm = Farm.objects.create(owner=self.owner, name="Main farm")

    def test_flock_stores_registration_details_and_defaults_to_active(self):
        flock = Flock.objects.create(
            farm=self.farm,
            name="Layer house 1",
            poultry_type=Flock.PoultryType.LAYER,
            breed="Kuroiler",
            initial_quantity=120,
            acquisition_date="2026-10-01",
            supplier="Local hatchery",
            housing_unit="House 1",
            purpose=Flock.Purpose.EGGS,
            notes="First flock",
        )

        self.assertEqual(flock.status, Flock.Status.ACTIVE)
        self.assertEqual(self.farm.flocks.get(), flock)
        self.assertEqual(str(flock), "Layer house 1")

    def test_flock_requires_positive_initial_quantity(self):
        flock = Flock(
            farm=self.farm,
            name="Empty flock",
            poultry_type=Flock.PoultryType.BROILER,
            breed="Cobb 500",
            initial_quantity=0,
            acquisition_date="2026-10-01",
            purpose=Flock.Purpose.MEAT,
        )

        with self.assertRaises(ValidationError):
            flock.full_clean()


class EggProductionModelTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            username="eggowner",
            email="eggowner@example.com",
            password="Strong-test-password-593!",
        )
        self.farm = Farm.objects.create(owner=self.owner, name="Layer house")
        self.flock = Flock.objects.create(
            farm=self.farm,
            name="Layer flock A",
            poultry_type=Flock.PoultryType.LAYER,
            breed="Kuroiler",
            initial_quantity=250,
            acquisition_date="2026-10-01",
            supplier="Local hatchery",
            housing_unit="House 1",
            purpose=Flock.Purpose.EGGS,
        )

    def test_egg_records_capture_collection_details(self):
        record = EggProduction.objects.create(
            flock=self.flock,
            collection_date="2026-11-01",
            eggs_collected=160,
            broken_eggs=12,
            quality_grade=EggProduction.QualityGrade.GRADE_A,
            notes="Strong yield this morning.",
        )

        self.assertEqual(record.flock, self.flock)
        self.assertEqual(record.quality_grade, EggProduction.QualityGrade.GRADE_A)
        self.assertEqual(str(record), f"{self.flock.name} · 2026-11-01")

    def test_egg_records_reject_broken_eggs_over_total(self):
        record = EggProduction(
            flock=self.flock,
            collection_date="2026-11-02",
            eggs_collected=80,
            broken_eggs=90,
            quality_grade=EggProduction.QualityGrade.GRADE_B,
        )

        with self.assertRaises(ValidationError):
            record.full_clean()


class FeedInventoryModelTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            username="feedmanager",
            email="feedmanager@example.com",
            password="Strong-test-password-593!",
        )
        self.farm = Farm.objects.create(owner=self.owner, name="Broiler farm")
        self.flock = Flock.objects.create(
            farm=self.farm,
            name="Broiler flock 1",
            poultry_type=Flock.PoultryType.BROILER,
            breed="Cobb 500",
            initial_quantity=200,
            acquisition_date="2026-10-05",
            purpose=Flock.Purpose.MEAT,
        )

    def test_feed_item_tracks_inventory_and_low_stock_logic(self):
        feed = FeedItem.objects.create(
            owner=self.owner,
            name="Broiler Starter",
            category=FeedItem.Category.BROILER_STARTER,
            unit="kg",
            unit_cost="120.00",
            minimum_stock="250",
            current_stock="180",
            supplier="Apex Feeds",
        )

        movement = FeedMovement.objects.create(
            feed_item=feed,
            flock=self.flock,
            movement_type=FeedMovement.MovementType.STOCK_OUT,
            quantity="50",
            unit_cost="120.00",
            movement_date="2026-11-03",
            reference="Batch A",
        )

        self.assertEqual(feed.name, "Broiler Starter")
        self.assertEqual(movement.quantity, 50)
        self.assertTrue(feed.current_stock >= 0)


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

    def test_api_authentication_login_session_and_logout(self):
        client = Client(enforce_csrf_checks=True)
        csrf_response = client.get(
            reverse("api_csrf"),
            HTTP_HOST="localhost",
        )
        csrf_token = csrf_response.json()["csrfToken"]

        login_response = client.post(
            reverse("api_login"),
            json.dumps(
                {
                    "username": "farmer@example.com",
                    "password": self.password,
                    "role": "farmer",
                }
            ),
            content_type="application/json",
            HTTP_HOST="localhost",
            HTTP_ORIGIN="http://localhost",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.json()["user"]["role"], "farmer")

        session_response = client.get(
            reverse("api_session"),
            HTTP_HOST="localhost",
        )
        self.assertTrue(session_response.json()["authenticated"])
        refreshed_csrf_response = client.get(
            reverse("api_csrf"),
            HTTP_HOST="localhost",
        )

        logout_response = client.post(
            reverse("api_logout"),
            data="{}",
            content_type="application/json",
            HTTP_HOST="localhost",
            HTTP_ORIGIN="http://localhost",
            HTTP_X_CSRFTOKEN=refreshed_csrf_response.json()["csrfToken"],
        )
        self.assertEqual(logout_response.status_code, 200)
        self.assertFalse(logout_response.json()["authenticated"])

    def test_api_signup_assigns_role_and_authenticates_user(self):
        client = Client(enforce_csrf_checks=True)
        csrf_response = client.get(
            reverse("api_csrf"),
            HTTP_HOST="localhost",
        )

        response = client.post(
            reverse("api_signup"),
            json.dumps(
                {
                    "username": "newbuyer",
                    "email": "newbuyer@example.com",
                    "password1": "Strong-buyer-password-593!",
                    "password2": "Strong-buyer-password-593!",
                    "role": "buyer",
                }
            ),
            content_type="application/json",
            HTTP_HOST="localhost",
            HTTP_ORIGIN="http://localhost",
            HTTP_X_CSRFTOKEN=csrf_response.json()["csrfToken"],
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"]["role"], "buyer")
        self.assertTrue(
            client.get(reverse("api_session"), HTTP_HOST="localhost").json()[
                "authenticated"
            ]
        )

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
