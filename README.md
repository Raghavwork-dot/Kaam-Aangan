# KAAM AANGAN

Files: index.html, style.css, app.js, config.js (your keys), supabase-setup.sql (database), supabase/functions (payment code).

Setup order:
1. Create a Supabase project. Run supabase-setup.sql in the SQL Editor.
2. Put the Project URL and anon key in config.js.
3. Supabase > Authentication > Providers > Email: turn off "Confirm email" while testing.
4. Create a Razorpay account (test mode first). Deploy the two functions in supabase/functions and add secrets RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
5. Upload all files to a GitHub repository and turn on GitHub Pages.
6. Sign up on your site, then run the "make yourself admin" line at the bottom of the SQL file.
