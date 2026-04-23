import React from 'react';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Modules from '@/components/landing/Modules';
import SpotlightSections from '@/components/landing/SpotlightSections';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import ContactForm from '@/components/landing/ContactForm';
import Footer from '@/components/landing/Footer';

const Landing: React.FC = () => (
  <div className="min-h-screen bg-white">
    <Navbar />
    <Hero />
    <Features />
    <Modules />
    <SpotlightSections />
    <Pricing />
    <Testimonials />
    <FAQ />
    <ContactForm />
    <Footer />
  </div>
);

export default Landing;
