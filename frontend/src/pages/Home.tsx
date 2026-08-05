import { Navbar } from "../components/home/Navbar";
import { Hero } from "../components/home/Hero";
import { About } from "../components/home/About";
import { WhyParticipate } from "../components/home/WhyParticipate";
import { Domains } from "../components/home/Domains";
import { Timeline } from "../components/home/Timeline";
import { ProblemStatements } from "../components/home/ProblemStatements";
import { JudgingCriteria } from "../components/home/JudgingCriteria";
import { Prizes } from "../components/home/Prizes";
import { Rules } from "../components/home/Rules";
import { Sponsors } from "../components/home/Sponsors";
import { Faq } from "../components/home/Faq";
import { FinalCta } from "../components/home/FinalCta";
import { Footer } from "../components/home/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050816] text-white">
      <Navbar />
      <main>
        <Hero />
        <About />
        <WhyParticipate />
        <Domains />
        <Timeline />
        <ProblemStatements />
        <JudgingCriteria />
        <Prizes />
        <Rules />
        <Sponsors />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
