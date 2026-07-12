export default function DataDeletionPage() {
  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 680, margin: "60px auto", padding: "0 24px", color: "#111" }}>
      <h1>Delete Your Account and Data</h1>
      <p><strong>Last updated:</strong> July 2026</p>

      <p>You can permanently delete your Fennec account and all associated data at any time.</p>

      <h2>Option 1 — Delete from the app</h2>
      <ol>
        <li>Open Fennec and go to <strong>Settings</strong></li>
        <li>Tap <strong>Data &amp; Reset</strong></li>
        <li>Under <strong>Delete account</strong>, tap the button and confirm</li>
      </ol>
      <p>Your account and all associated data are deleted immediately, and any active Pro subscription is cancelled.</p>

      <h2>Option 2 — Request deletion by email</h2>
      <p>If you cannot access the app, send an email to <a href="mailto:hello@fennec.audio">hello@fennec.audio</a> with the subject <strong>&quot;Delete my account&quot;</strong> from the email address on your account, and we will remove all your information within 30 days.</p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your account and profile</li>
        <li>All projects, quotes, and client data</li>
        <li>Uploaded tracks and the notes on them</li>
        <li>Your network connections and karma</li>
        <li>Social platform connections (Spotify, YouTube, Facebook)</li>
      </ul>
      <p>This action cannot be undone.</p>

      <p style={{ marginTop: 40 }}><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a></p>
    </main>
  );
}
