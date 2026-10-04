---
name: Maktab Print access model
description: Product access requirements for teachers and printer staff.
---

Teachers must submit print requests without creating an account. Only printer staff can sign in, and each staff account is limited to its assigned branch's queue and files. Printer passwords belong in Replit Secrets, never in source code.

**Why:** This access model is a core product requirement and determines which request flows must stay public and which data must stay branch-scoped.

**How to apply:** Preserve anonymous request submission, require printer authentication for staff views and downloads, and check branch ownership on every staff-side read or update.