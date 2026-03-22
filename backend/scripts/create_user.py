#!/usr/bin/env python3
"""CLI script to create user accounts. Run from the backend directory:

    python scripts/create_user.py <email> <display_name> [--role dm|player]

Password is prompted interactively (not passed as CLI arg for security).
"""
import argparse
import asyncio
import getpass
import sys
from pathlib import Path

# Add backend to path so app imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import async_session
from app.services.auth_service import create_user, get_user_by_email


async def main():
    parser = argparse.ArgumentParser(description="Create a DM Co-Pilot user")
    parser.add_argument("email", help="User email address")
    parser.add_argument("display_name", help="Display name")
    parser.add_argument(
        "--role",
        choices=["dm", "player"],
        default="dm",
        help="User role (default: dm)",
    )
    args = parser.parse_args()

    password = getpass.getpass("Password: ")
    if not password:
        print("Error: password cannot be empty")
        sys.exit(1)
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Error: passwords do not match")
        sys.exit(1)

    async with async_session() as db:
        existing = await get_user_by_email(db, args.email)
        if existing:
            print(f"Error: user with email '{args.email}' already exists")
            sys.exit(1)

        user = await create_user(
            db,
            email=args.email,
            password=password,
            display_name=args.display_name,
            role=args.role,
        )
        print(f"Created user: {user.display_name} ({user.email}) [role={user.role}]")


if __name__ == "__main__":
    asyncio.run(main())
