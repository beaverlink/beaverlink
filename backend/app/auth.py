from fastapi import HTTPException, status


def get_current_user_id() -> str:
    """Returns the signed-in user's Better Auth ID.

    Token checking isn't built yet, so every request is rejected for now.
    """
    # TODO: verify the Better Auth token in the Authorization header.
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
