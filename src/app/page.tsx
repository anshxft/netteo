'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { TrustStrip } from '@/components/landing/TrustStrip';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeatureBento } from '@/components/landing/FeatureBento';
import { TestimonialsCarousel } from '@/components/landing/TestimonialsCarousel';
import { FaqAccordion } from '@/components/landing/FaqAccordion';
import { CtaBand } from '@/components/landing/CtaBand';
import { LandingFooter } from '@/components/landing/LandingFooter';
import {
  StaircasePreloader,
  StaircasePreviewDock,
  PreloaderMode,
  PreloaderState,
} from '@/components/common/StaircasePreloader';

export default function LandingPage() {
  const [isPreloaderOpen, setIsPreloaderOpen] = useState(true);
  const [preloaderKey, setPreloaderKey] = useState(0);
  const [preloaderConfig, setPreloaderConfig] = useState<{
    mode: PreloaderMode;
    columnCount: number;
    durationMs: number;
    state?: PreloaderState;
  }>({
    mode: 'converging',
    columnCount: 5,
    durationMs: 3200,
  });

  const handleTrigger = (config: {
    mode: PreloaderMode;
    columnCount: number;
    durationMs: number;
    state?: PreloaderState;
  }) => {
    setPreloaderConfig(config);
    setPreloaderKey((prev) => prev + 1);
    setIsPreloaderOpen(true);
  };

  return (
    <AppLayout>
      {/* 0. Advanced Dual-Direction Double Staircase Preloader */}
      <StaircasePreloader
        key={preloaderKey}
        isOpen={isPreloaderOpen}
        mode={preloaderConfig.mode}
        columnCount={preloaderConfig.columnCount}
        durationMs={preloaderConfig.durationMs}
        state={preloaderConfig.state}
        onComplete={() => setIsPreloaderOpen(false)}
      />

      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          backgroundColor: 'var(--color-page)',
          color: 'var(--color-ink)',
          overflowX: 'hidden',
          paddingBottom: 'var(--space-4xl)',
        }}
      >
        {/* 1. Floating Pill Navbar (Centered inside page frame) */}
        <LandingNavbar />

        {/* 2. Hero: Large rounded container with warm gradient & floating UI cards */}
        <LandingHero />

        {/* 3. Trust Strip: Infinite marquee */}
        <TrustStrip />

        {/* 4. How It Works: 2x2 grid of soft rounded cards with mini UI previews */}
        <HowItWorks />

        {/* 5. Feature/Benefit Bento: Large Netting Simulator + 3 Companion Cards */}
        <FeatureBento />

        {/* 6. Testimonials: Watermelon UI-inspired layout with carousel */}
        <TestimonialsCarousel />

        {/* 7. FAQ Accordion: Institutional questions */}
        <FaqAccordion />

        {/* 8. Final CTA Band */}
        <CtaBand />

        {/* 9. Landing Footer */}
        <LandingFooter />
      </div>

      {/* Interactive Staircase Configurator & Replay Dock */}
      <StaircasePreviewDock
        onTrigger={handleTrigger}
        isPreloaderActive={isPreloaderOpen}
      />
    </AppLayout>
  );
}
