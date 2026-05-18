# Supabase password reset (email link)

The forgot-password flow sends a **reset link** by email. After the user clicks the link, they return to the login screen and the **Reset Password** modal opens automatically.

## Dashboard checklist

1. [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **URL configuration**
2. Set **Site URL** to your app origin (e.g. `http://localhost:5173`)
3. Add the same URL under **Redirect URLs**
4. **Authentication** → **Email Templates** → **Reset password**
   - Use a **link** in the template (e.g. `{{ .ConfirmationURL }}`), not OTP-only copy
   - If the template only sends `{{ .Token }}` without a link, users will not get a working redirect

## App flow

1. **Forgot?** → enter email → **Send Reset Link** (`resetPasswordForEmail`)
2. User clicks the link in email → redirected to the app
3. Supabase fires `PASSWORD_RECOVERY` → login screen stays visible → **Reset Password** modal opens
4. User sets a new password → enters the app (or signs out if they cancel the modal)

## Troubleshooting

- **`otp_expired` / link invalid**: Request a fresh link from **Forgot?**; links expire quickly. Ensure the email template uses the confirmation URL, not an expired OTP code.
- **Modal does not open**: Confirm redirect URL matches Site URL and `detectSessionInUrl` is enabled on the Supabase client.
- **Lands in app without modal**: `isPasswordRecovery` should keep the auth screen visible until the password is updated.
