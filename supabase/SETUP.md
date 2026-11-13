# Setting up Supabase for Nestly

Do these steps once, in order. You only need the Supabase dashboard and a browser.

## 1. Create the database

In Supabase, open **SQL Editor > New query**. Then, one file at a time:

1. Open the file from `supabase/migrations/` and copy all of it.
2. Paste it into the query box and click **Run**. You should see "Success. No rows returned".

Run the files in this order:

1. `0001_tables.sql`: the tables
2. `0002_security.sql`: who can see and change what
3. `0003_storage.sql`: buckets for hostel photos and owner documents
4. `0004_starting_data.sql`: the four universities and the subscription price

If one fails, stop and send the error message. Don't run the next file.

## 2. Tell Supabase where the app lives

Open **Authentication > URL Configuration**:

- **Site URL:** `http://localhost:5173` for now. When the app is on Vercel, change it to the Vercel address, for example `https://nestly.vercel.app`.
- **Redirect URLs:** add all three:
  - `http://localhost:5173/**`
  - `http://127.0.0.1:5173/**`
  - `https://YOUR-VERCEL-ADDRESS/**`

Email links (confirm your email, reset your password) only bring people back to addresses on this list.

## 3. Email sign-up settings

Open **Authentication > Sign In / Providers > Email** and check that:

- **Enable Email provider** is on.
- **Confirm email** is on. This is how students prove they study at the university.
- **Minimum password length** is `8`.

## 4. Send emails to real people (custom SMTP)

Supabase's built-in email only sends to your own team's addresses, about 2 an hour, so students would never get their confirmation link. Free-tier projects also can't change the email wording without their own SMTP. The simplest free fix is a Gmail account.

1. On the Gmail account you want emails sent from, turn on **2-Step Verification** (Google Account > Security).
2. Make an **App password** (Google Account > Security > App passwords). Name it "Nestly" and copy the 16-letter password.
3. In Supabase, open **Authentication > Emails > SMTP Settings**, turn on **Enable custom SMTP**, and fill in:

   | Setting | Value |
   |---|---|
   | Sender email | your Gmail address |
   | Sender name | `Nestly` |
   | Host | `smtp.gmail.com` |
   | Port | `465` |
   | Username | your Gmail address |
   | Password | the 16-letter app password |

4. Open **Authentication > Rate Limits** and raise "emails per hour" to `100`.

Gmail allows about 500 emails a day, which is plenty for a class project. If you get your own domain later, Brevo or Resend are better for a real launch.

## 5. Add the custodian invite function

Custodians join with an invite code and may have no email inbox. A small server function creates their account.

1. Open **Edge Functions > Deploy a new function > Via Editor**.
2. Name it exactly `accept-invite`.
3. Delete the sample code, then paste in everything from `supabase/functions/accept-invite/index.ts`.
4. Click **Deploy**.

You don't need to add any settings. Supabase gives the function the keys it needs.

## 6. Make yourself the admin

1. Run the app (see "Run the app" below) and sign up through **I own a hostel** with your own email. Confirm the email.
2. In **SQL Editor**, run this, using your email:

   ```sql
   update public.profiles set role = 'admin', owner_status = null where email = 'you@example.com';
   ```

3. Log out of the app and log in again. You land on the admin Overview.

## 7. Run the app

The file `.env` in the project holds your Supabase address and public key. It's in `.gitignore`, so it never goes to GitHub.

```bash
npm install
npm run dev
```

To run on the demo data instead, start it with `VITE_DATA=demo npm run dev`, or remove `.env`.

**On Vercel:** go to Project > Settings > Environment Variables and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same values as `.env`. Then redeploy.

## Keys: what is safe where

| Key | Where it's used | Safe to share? |
|---|---|---|
| Project URL | `.env`, Vercel | Yes |
| anon / publishable key | `.env`, Vercel | Yes. It's built for browsers, and the security rules do the protecting. |
| service_role / secret key | only inside Supabase functions | **Never.** Don't put it in `.env`, GitHub or chat. |
| database password | nowhere in the app | **Never.** |
