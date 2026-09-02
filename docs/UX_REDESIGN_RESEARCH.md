# CropShield UX Redesign Research

## Executive conclusion

CropShield should behave like a field instrument rather than a dense analytics wall. The mobile home screen should prioritize the farmer’s next decision, while separate pages hold crop records, scans, cases, support contacts, and profile settings. Desktop can expose more navigation and comparison context, but mobile should not be a compressed copy of the desktop layout.

## Research signals

| Area | Evidence | Design decision |
|---|---|---|
| Mobile navigation | Apple recommends a small set of labeled top-level destinations and adaptable sidebars for complex structures. Material recommends cards only when they improve hierarchy. [1] [2] | Keep four primary farmer destinations visible: Dashboard, Crops, Scans, and Cases. Move secondary tools to More. |
| Touch and accessibility | Material recommends 48px touch targets. WCAG requires color not to be the only signal and sets contrast requirements for text and UI boundaries. [3] [4] | Use generous hit areas, visible text labels, focus rings, and status labels plus icons rather than color alone. |
| Forms and disclosure | WCAG requires labels or instructions. GOV.UK reports that conditional reveals work best for simple, tightly related content. [5] [6] | Keep scan capture short. Put optional field context behind an explicit control and use visible labels above inputs. |
| Farmer workflows | Plantix, xarvio, Cropwise, Climate FieldView, and John Deere emphasize photo capture, field context, prioritization, history, and expert or team handoff. [7] [8] [9] [10] [11] | Make “Scan a crop problem” the primary action. Present cautious findings with evidence, freshness, severity, and a next action. |
| Practitioner feedback | Reddit discussions repeatedly mention information overload, fragmented tools, the need for context-specific mobile flows, and the value of batch or repeated-entry operations. These are anecdotal hypotheses, not prevalence estimates. [12] [13] [14] [15] | Reduce dashboard density, use role-specific flows, and validate the IA with real farmers instead of assuming mobile parity. |
| Visual system | Carbon, USWDS, Material, and WCAG support semantic tokens, neutral surfaces, restrained status colors, and non-color status communication. [4] [16] [17] [18] | Replace the green-and-white cliché with indigo, mineral teal, saffron, and cool blue-gray surfaces. Reserve red and amber for actionable risk. |

## Implemented direction

The redesign uses a deep indigo navigation and primary-action color, a mineral-teal stable state, saffron for attention and forecast context, and a cool blue-gray canvas. Panels use neutral borders and restrained shadows. The mobile layout hides secondary utility controls, keeps the bottom navigation thumb-reachable, and gives the primary scan action a distinct treatment. At narrow widths, the marketing copy is removed from the role-selection screen so the account choice becomes the primary task.

The application already has separate routes for dashboard, crops, scans, cases, risk alerts, experts, stores, analytics, farmers, and profile. The redesign preserves those URLs and improves their shared shell rather than combining the records into a single screen. Further usability work should test the highest-priority alert comprehension, scan completion, low-bandwidth recovery, and the distinction between screening and confirmed diagnosis with representative growers.

## References

[1]: https://developer.apple.com/design/human-interface-guidelines/tab-bars "Apple Human Interface Guidelines: Tab bars"
[2]: https://m3.material.io/components/cards/guidelines "Material Design 3: Cards guidelines"
[3]: https://m2.material.io/develop/web/supporting/touch-target "Material Design: Touch targets"
[4]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2"
[5]: https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html "WCAG: Labels or instructions"
[6]: https://accessibility.blog.gov.uk/2021/09/21/an-update-on-the-accessibility-of-conditionally-revealed-questions/ "GOV.UK: Conditionally revealed questions"
[7]: https://plantix.net/en/ "Plantix"
[8]: https://www.xarvio.com/ca/en/news/scouting-app-for-farmers-in-india.html "xarvio Scouting for farmers in India"
[9]: https://www.cropwise.com/protector "Cropwise Protector"
[10]: https://climate.com/en-ca/resources/blog/work-smarter-with-field-health-imagery-and-scouting-tools.html "Climate FieldView: Field health imagery and scouting"
[11]: https://www.deere.com/en-us/products-solutions/technology-solutions/precision-ag-technology/operations-center "John Deere Operations Center"
[12]: https://www.reddit.com/r/farming/comments/1e7n73j/thoughts_on_allinone_farm_management_software/ "Reddit r/farming: All-in-one farm management software"
[13]: https://www.reddit.com/r/farming/comments/98rbci/farm_software_what_are_you_using_and_why/ "Reddit r/farming: Farm software discussion"
[14]: https://www.reddit.com/r/UXDesign/comments/lmnfjq/why_a_lot_of_b2b_dashboards_dont_support/ "Reddit r/UXDesign: Why B2B dashboards do not support mobile"
[15]: https://www.reddit.com/r/webdev/comments/1ntqs67/mobile_first_design_is_harder_than_anyone_admits/ "Reddit r/webdev: Mobile-first design discussion"
[16]: https://carbondesignsystem.com/patterns/status-indicator-pattern/ "IBM Carbon: Status indicator pattern"
[17]: https://designsystem.digital.gov/design-tokens/color/ "U.S. Web Design System: Color tokens"
[18]: https://m3.material.io/styles/color/roles "Material Design 3: Color roles"
