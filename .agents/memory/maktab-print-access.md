---
name: Maktab Print access model
description: Product access requirements for teachers and printer staff.
---

Teachers must submit print requests without creating an account. Only printer staff can sign in, and each staff account is limited to its assigned branch's queue and files. Store printer usernames and salted scrypt password hashes in the Neon database; never store plaintext passwords.

**Why:** The user asked for printer login credentials to be stored in the database, while the branch-scoped access model remains a core product requirement.

**How to apply:** Preserve anonymous request submission, authenticate printer staff against database hashes, and check branch ownership on every staff-side read or update.