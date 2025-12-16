import copy
import pytest
from fastapi.testclient import TestClient

from src import app as app_module
from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    # Keep a fresh copy of the initial activities and restore after each test
    original = copy.deepcopy(activities)
    yield
    app_module.activities = copy.deepcopy(original)


@pytest.fixture
def client():
    return TestClient(app)


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_unregister_flow(client):
    activity = "Basketball Team"
    email = "testuser@example.com"

    # Signup should succeed the first time
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert email in client.get("/activities").json()[activity]["participants"]

    # Signing up the same email again should fail
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400

    # Unregister should succeed
    r3 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r3.status_code == 200
    assert email not in client.get("/activities").json()[activity]["participants"]


def test_unregister_not_registered(client):
    activity = "Tennis Club"
    email = "nonexistent@example.com"
    r = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r.status_code == 404


def test_nonexistent_activity_endpoints(client):
    # Signup for unknown activity
    r = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert r.status_code == 404

    # Unregister for unknown activity
    r2 = client.delete("/activities/NoSuchActivity/participants?email=a@b.com")
    assert r2.status_code == 404
