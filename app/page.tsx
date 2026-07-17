import PricingCalculator from "@/components/pricing/PricingCalculator";
import ComingSoonGate from "@/components/ComingSoonGate";

export default function Home() {
  return (
    <ComingSoonGate>
      <PricingCalculator />
    </ComingSoonGate>
  );
}
