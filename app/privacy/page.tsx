export default function PrivacyPage() {
  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 680, margin: "60px auto", padding: "0 24px", color: "#111" }}>
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> May 2026</p>

      <h2>1. Information We Collect</h2>
      <p>Fennec collects the information you provide when creating an account (name, email) and data you enter while using the app (projects, quotes, clients). When you connect a social account (Spotify, YouTube, Facebook), we access only the data necessary to display your stats.</p>

      <h2>2. How We Use Your Information</h2>
      <p>We use your information solely to provide and improve the Fennec service. We do not sell your personal data to third parties.</p>

      <h2>3. Third-Party Services</h2>
      <p>Fennec integrates with Spotify, YouTube, and Facebook to display analytics. These integrations are governed by each platform's own privacy policies.</p>

      <h2>4. Data Storage</h2>
      <p>Your data is stored securely using Supabase (PostgreSQL). We use industry-standard encryption in transit and at rest.</p>

      <h2>5. Your Rights</h2>
      <p>You may request deletion of your account and all associated data at any time by contacting us at <a href="mailto:hello@fennec.audio">hello@fennec.audio</a> or using the in-app data deletion option.</p>

      <h2>6. Contact</h2>
      <p>For privacy-related questions: <a href="mailto:hello@fennec.audio">hello@fennec.audio</a></p>

      <p style={{ marginTop: 40 }}><a href="/terms">Terms of Service</a> · <a href="/data-deletion">Delete your account</a></p>
    </main>
  );
}
