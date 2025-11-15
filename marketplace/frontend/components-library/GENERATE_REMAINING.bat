@echo off
REM Batch script to generate remaining component placeholders

echo Generating remaining component files...

REM Pricing (3 remaining)
echo Creating pricing components...
echo ^<!-- 4-Tier Pricing Table - Similar to 3-tier but with 4 columns --^> > pricing\pricing-table-four-tier.html
echo ^<!-- Value Stack Comparison Table --^> > pricing\value-stack-comparison.html
echo ^<!-- Single Price Box (for individual products) --^> > pricing\price-box-single.html

REM CTAs (5 remaining)
echo Creating CTA components...
echo ^<!-- Secondary CTA Button --^> > ctas\cta-button-secondary.html
echo ^<!-- Urgent CTA Button (with scarcity styling) --^> > ctas\cta-button-urgent.html
echo ^<!-- Full-width CTA Section --^> > ctas\cta-section-full.html
echo ^<!-- Sticky CTA Bar (fixed bottom) --^> > ctas\cta-sticky-bar.html
echo ^<!-- 4-Path CTA Section --^> > ctas\cta-four-path.html

REM Product (4 remaining)
echo Creating product components...
echo ^<!-- Book Card (individual) --^> > product\book-card.html
echo ^<!-- Filterable Book Grid --^> > product\book-grid-filterable.html
echo ^<!-- Territory Grid --^> > product\territory-grid.html
echo ^<!-- Armory Section (full showcase) --^> > product\armory-section.html

REM Social Proof (6 components)
echo Creating social proof components...
echo ^<!-- Testimonial Card --^> > social-proof\testimonial-card.html
echo ^<!-- Testimonial Grid --^> > social-proof\testimonial-grid.html
echo ^<!-- Victories Section --^> > social-proof\victories-section.html
echo ^<!-- Trust Badges --^> > social-proof\trust-badges.html
echo ^<!-- Stats Display --^> > social-proof\stats-display.html
echo ^<!-- Social Sharing Buttons --^> > social-proof\social-sharing.html

REM Interactive (7 components)
echo Creating interactive components...
echo ^<!-- Exit-Intent Modal --^> > interactive\modal-exit-intent.html
echo ^<!-- One-Time Offer Modal --^> > interactive\modal-oto.html
echo ^<!-- Countdown Timer --^> > interactive\countdown-timer.html
echo ^<!-- Progress Bar --^> > interactive\progress-bar.html
echo ^<!-- FAQ Accordion --^> > interactive\faq-accordion.html
echo ^<!-- Expandable List --^> > interactive\expandable-list.html
echo ^<!-- Video Player --^> > interactive\video-player.html

REM Content (6 components)
echo Creating content components...
echo ^<!-- Benefits Grid (6-card) --^> > content\benefits-grid.html
echo ^<!-- Features 3-Column --^> > content\features-three-column.html
echo ^<!-- Features 5-Column --^> > content\features-five-column.html
echo ^<!-- Checklist Section --^> > content\checklist-section.html
echo ^<!-- Transformation Journey --^> > content\transformation-journey.html
echo ^<!-- Outcome Anchors --^> > content\outcome-anchors.html

REM Conversion (5 components)
echo Creating conversion components...
echo ^<!-- Objection Destruction --^> > conversion\objection-destruction.html
echo ^<!-- Guarantee Box --^> > conversion\guarantee-box.html
echo ^<!-- Urgency Banner --^> > conversion\urgency-banner.html
echo ^<!-- Scarcity Indicator --^> > conversion\scarcity-indicator.html
echo ^<!-- Manifesto Section --^> > conversion\manifesto-section.html

REM Navigation (5 components)
echo Creating navigation components...
echo ^<!-- Sticky Header --^> > navigation\header-sticky.html
echo ^<!-- Minimal Header --^> > navigation\header-minimal.html
echo ^<!-- Full Footer --^> > navigation\footer-full.html
echo ^<!-- Minimal Footer --^> > navigation\footer-minimal.html
echo ^<!-- Mobile Nav Drawer --^> > navigation\mobile-nav-drawer.html

echo.
echo ========================================
echo Component placeholders created!
echo ========================================
echo.
echo Next steps:
echo 1. Review generated files
echo 2. Add full HTML/CSS/JS to each component
echo 3. Test components in isolation
echo 4. Integrate into funnel templates
echo.
echo Total components: 50+
echo Status: All placeholder files created
echo.
pause
