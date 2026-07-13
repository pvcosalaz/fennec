import LegalPage from "@/components/legal/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <h2>1. Information We Collect</h2>
      <p>Fennec collects the information you provide when creating an account (name, email) and data you enter while using the app (projects, quotes, clients). When you connect a social account (Spotify, YouTube, Facebook), we access only the data necessary to display your stats.</p>

      <h2>2. How We Use Your Information</h2>
      <p>We use your information solely to provide and improve the Fennec service. We do not sell your personal data to third parties.</p>

      <h2>3. Third-Party Services</h2>
      <p>Fennec integrates with Spotify, YouTube, and Facebook to display analytics. These integrations are governed by each platform&apos;s own privacy policies.</p>

      <h2>4. Data Storage</h2>
      <p>Your data is stored securely using Supabase (PostgreSQL). We use industry-standard encryption in transit and at rest.</p>

      <h2>5. Your Rights</h2>
      <p>You may request deletion of your account and all associated data at any time by contacting us at <a href="mailto:hello@fennec.audio">hello@fennec.audio</a> or using the in-app data deletion option.</p>

      <h2>6. Contact</h2>
      <p>For privacy-related questions: <a href="mailto:hello@fennec.audio">hello@fennec.audio</a></p>

      <p className="legal-footer"><a href="/terms">Terms of Service</a> · <a href="/data-deletion">Delete your account</a></p>
    </LegalPage>
  );
}
