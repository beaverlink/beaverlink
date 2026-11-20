from datetime import date

import pytest

STUDENT = {
    "profile_type": "student",
    "student_year": "Third year",
    "major": "Computer Science",
    "goals": ["Find a mentor"],
}

ALUMNUS = {
    "profile_type": "alumnus",
    "graduation_year": 2015,
    "industry": "Healthcare",
    "goals": ["Mentor a student"],
}


@pytest.mark.parametrize("method", ["get", "put"])
def test_rejects_requests_without_a_login(client, method):
    res = client.request(method, "/profiles/me", json=STUDENT)
    assert res.status_code == 401


@pytest.mark.usefixtures("clean_db")
class TestProfiles:
    def test_returns_404_before_a_profile_exists(self, client, sign_in):
        sign_in("user-1")
        assert client.get("/profiles/me").status_code == 404

    def test_saves_and_loads_a_student_profile(self, client, sign_in):
        sign_in("user-1")
        saved = client.put("/profiles/me", json=STUDENT)
        assert saved.status_code == 200

        loaded = client.get("/profiles/me").json()
        assert loaded == saved.json()
        assert loaded["major"] == "Computer Science"
        assert loaded["graduation_year"] is None

    def test_saves_an_alumnus_without_optional_fields(self, client, sign_in):
        sign_in("user-1")
        res = client.put("/profiles/me", json=ALUMNUS)
        assert res.status_code == 200
        assert res.json()["job_title"] == ""
        assert res.json()["goal_details"] == ""

    def test_updates_an_existing_profile(self, client, sign_in):
        sign_in("user-1")
        client.put("/profiles/me", json=STUDENT)
        client.put("/profiles/me", json={**STUDENT, "major": "Data Science"})
        assert client.get("/profiles/me").json()["major"] == "Data Science"

    def test_users_only_see_their_own_profile(self, client, sign_in):
        sign_in("user-1")
        client.put("/profiles/me", json=STUDENT)

        sign_in("user-2")
        assert client.get("/profiles/me").status_code == 404

    def test_clears_fields_for_the_other_profile_type(self, client, sign_in):
        sign_in("user-1")
        res = client.put(
            "/profiles/me",
            json={**STUDENT, "graduation_year": 2015, "industry": "Healthcare"},
        )
        assert res.json()["graduation_year"] is None
        assert res.json()["industry"] == ""

    def test_trims_spaces(self, client, sign_in):
        sign_in("user-1")
        res = client.put(
            "/profiles/me", json={**STUDENT, "major": "  Computer Science  "}
        )
        assert res.json()["major"] == "Computer Science"

    @pytest.mark.parametrize(
        "profile",
        [
            {**STUDENT, "student_year": None},
            {**STUDENT, "major": "   "},
            {**ALUMNUS, "graduation_year": None},
            {**ALUMNUS, "industry": ""},
            {**STUDENT, "goals": []},
            {**STUDENT, "goals": ["  "]},
            {**STUDENT, "profile_type": "both"},
            {**STUDENT, "student_year": "Senior"},
            {**ALUMNUS, "graduation_year": 1899},
            {**ALUMNUS, "graduation_year": date.today().year + 1},
            {**STUDENT, "goal_details": "x" * 1001},
        ],
    )
    def test_rejects_invalid_profiles(self, client, sign_in, profile):
        sign_in("user-1")
        assert client.put("/profiles/me", json=profile).status_code == 422
        assert client.get("/profiles/me").status_code == 404
