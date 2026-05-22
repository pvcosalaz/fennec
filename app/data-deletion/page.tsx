export default function DataDeletionPage() {
  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 680, margin: "60px auto", padding: "0 24px", color: "#111" }}>
      <h1>Data Deletion Instructions</h1>
      <p><strong>Last updated:</strong> May 2026</p>

      <p>If you connected your Facebook account to Fennec and want to delete your data, you have two options:</p>

      <h2>Option 1 — Delete from the app</h2>
      <ol>
        <li>Open Fennec and go to <strong>Settings</strong></li>
        <li>Tap <strong>Data &amp; Reset</strong></li>
        <li>Select the data you want to delete</li>
        <li>To delete your full account, tap <strong>Sign out</strong> and contact us at the email below</li>
      </ol>

      <h2>Option 2 — Contact us directly</h2>
      <p>Send an email to <a href="mailto:hello@fennec.audio">hello@fennec.audio</a> with the subject <strong>"Delete my data"</strong> and we will remove all your information within 30 days.</p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your account and profile</li>
        <li>All projects, quotes, and client data</li>
        <li>Social platform connections (Spotify, YouTube, Facebook)</li>
      </ul>
    </main>
  );
}
