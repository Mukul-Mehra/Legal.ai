"""
Checks every auth endpoint end to end. Safe to run repeatedly - it reuses one
test account instead of creating a new one each time.

    python test_auth.py
"""

import httpx

BASE = "http://127.0.0.1:8000/api"
EMAIL = "authtest@example.com"
PASSWORD = "testpass123"

passed = 0
failed = 0


def check(label, got, expected):
    global passed, failed
    if got == expected:
        passed += 1
        print(f"  PASS   {label}")
    else:
        failed += 1
        print(f"  FAIL   {label}  ->  expected {expected}, got {got}")


try:
    with httpx.Client(base_url=BASE, timeout=20) as c:

        print("\n1. Create the account")
        r = c.post(
            "/auth/signup",
            json={"name": "Auth Test", "email": EMAIL, "password": PASSWORD},
        )
        # 201 the first time you run this, 409 every run after. Both are fine.
        check(
            f"signup returned {r.status_code} (201 = new, 409 = already there)",
            r.status_code in (201, 409),
            True,
        )

        print("\n2. The same email cannot register twice")
        r = c.post(
            "/auth/signup",
            json={"name": "Auth Test", "email": EMAIL, "password": PASSWORD},
        )
        check("duplicate email is refused", r.status_code, 409)

        print("\n3. Log in with the correct password")
        r = c.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
        check("login succeeds", r.status_code, 200)
        if r.status_code != 200:
            print("\n  Cannot test anything else without a token. Stopping.")
            print("  Response was:", r.text)
            raise SystemExit(1)

        token = r.json()["access_token"]
        auth = {"Authorization": f"Bearer {token}"}
        print(f"         token looks like: {token[:25]}...")

        print("\n4. Log in with the wrong password")
        r = c.post("/auth/login", json={"email": EMAIL, "password": "definitelywrong"})
        check("wrong password is refused", r.status_code, 401)

        print("\n5. Read the profile using the token")
        r = c.get("/auth/me", headers=auth)
        check("token is accepted", r.status_code, 200)
        body = r.json() if r.status_code == 200 else {}
        check("password hash never leaves the server", "password_hash" in body, False)
        print(f"         name={body.get('name')!r}  email={body.get('email')!r}")

        print("\n6. Read the profile with no token at all")
        r = c.get("/auth/me")
        check("missing token is refused", r.status_code, 401)

        print("\n7. Read the profile with a made-up token")
        r = c.get("/auth/me", headers={"Authorization": "Bearer not.a.real.token"})
        check("forged token is refused", r.status_code, 401)

        print("\n8. Save a default state on the profile")
        r = c.patch("/auth/me", json={"default_state": "Maharashtra"}, headers=auth)
        check("update succeeds", r.status_code, 200)
        saved = r.json() if r.status_code == 200 else {}
        check("the new value was stored", saved.get("default_state"), "Maharashtra")
        check("the name was not wiped", saved.get("name"), "Auth Test")

        print("\n9. Change the password using a wrong current password")
        r = c.post(
            "/auth/change-password",
            json={"current_password": "wrongone", "new_password": "brandnewpass1"},
            headers=auth,
        )
        check("cannot change password without the old one", r.status_code, 400)

        print("\n10. Sign up with a password under 8 characters")
        r = c.post(
            "/auth/signup",
            json={"name": "Shorty", "email": "shorty@example.com", "password": "abc"},
        )
        check("weak password is rejected", r.status_code, 422)

except httpx.ConnectError:
    print("\nCould not reach the server on port 8000.")
    print("Start it in another terminal first:")
    print("    uvicorn app.main:app --reload --port 8000")
    raise SystemExit(1)

print("\n" + "-" * 52)
print(f"{passed} passed, {failed} failed")
if failed == 0:
    print("Backend auth is working. Part 1 is done.")
else:
    print("Send me the FAIL lines and I will fix it.")