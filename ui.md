# Examination Platform UI Architecture & Design System

## 1. Overview & Visual Direction

The **CB_Test** examination portal has been redesigned into a soft, calm, academic assessment interface inspired by the **Holst color palette** and university assessment layout standards.

All neon colors, glassmorphism, aggressive gradients, glowing effects, and saturated elements have been eliminated in favor of a restrained, trustworthy, and minimal aesthetic tailored for institutional assessments.

---

## 2. Holst Color Palette Tokens

The design strictly employs the six core tokens from the Holst palette:

| Token Name | Hex Code | Primary UI Role |
| :--- | :--- | :--- |
| **Deep Navy** | `#0D1B2A` | Headings, primary CTA buttons, dark video container frames, admin navigation bar |
| **Dark Navy** | `#1B263B` | Interactive hover states, active review + answered markers |
| **Muted Blue** | `#415A77` | Secondary text, current question highlight border, secondary buttons, subheadings |
| **Muted Sage** | `#778D7A` | Answered question indicator, completed hardware checks, successful submission status |
| **Warm Beige** | `#D4C4A8` | Marked for review badge, guidance accent borders, spinner highlights |
| **Soft Cream** | `#F4F1DE` | Global canvas/page background |

### Supporting Surfaces & Semantic States
* **Card & Surface Backgrounds**: `#FFFFFF` and `#FAF8F2` (soft warm cream cards with thin `rgba(13,27,42,0.10)` borders).
* **Success Background**: `#EDF2EE` with `#778D7A` sage borders and `#1B263B` text.
* **Informational / Warning Background**: `#F7F3EA` with `#D4C4A8` beige borders and `#415A77` text.
* **Error / Security Alert Background**: `#FBEAEA` with muted dark red `#9E2A2B` text and `#9E2A2B`/20 borders.

---

## 3. Typography & Hierarchy

* **Font Family**: `Plus Jakarta Sans` (Google Fonts), fallback to system sans-serif.
* **Headings**: Semibold / Bold (`font-bold text-[#0D1B2A] tracking-tight`).
* **Subtitles & Metadata**: Medium (`text-xs text-[#415A77]`).
* **Question Content**: Regular / Medium with generous line height (`leading-relaxed text-[#0D1B2A]`).
* **Labels**: Uppercase tracking-wider (`text-xs font-semibold uppercase tracking-wider`).

---

## 4. Screen-by-Screen Redesign Details

### 4.1. Student Login (`/login`)
* **Background**: Soft cream `#F4F1DE`.
* **Card**: 20px rounded warm card with subtle border `rgba(13,27,42,0.10)`, soft shadow.
* **Header**: University Assessment Portal badge with book/portal icon, `KLU Proctored` chip.
* **Fields**: Refined `TextField` components with warm off-white surface, deep navy labels, and muted blue focus rings.
* **Button**: Deep navy `#0D1B2A` with hover `#1B263B`.
* **Status Notifications**: Muted sage (success) or muted dark red (error) banners.

### 4.2. Hardware & Proctoring Verification (`/system-check`)
* **Layout**: Two-column layout based on Kalvium examination onboarding standards.
* **Left Sidebar**:
  * Assessment Details box: Proctoring (`Automated Remote`), Duration (`60m`), Total Questions.
  * Stepper: Step 1 (Environment Setup - active deep navy/sage pill), Step 2 (Examination).
  * Examination Guidelines card in warm beige `#F7F3EA`.
* **Main Area**:
  * **Media Preview Frames**: Dual 16:9 containers utilizing deep navy `#0D1B2A` rather than generic black, with sage active indicator chips.
  * **Action Buttons**: Muted blue or sage toggle buttons (`#778D7A`).
  * **Full-Screen Banner**: Soft beige warning when windowed; turns sage `#EDF2EE` when full-screen is engaged.
  * **6-Box PIN Input**: Individual numbered inputs with forward focus and backspace return.
  * **Proceed CTA**: Deep navy `#0D1B2A` button verifying test active status with backend.

### 4.3. Examination Room (`/student`)
* **Structured Three-Part Layout**:
  1. **Left Navigation (Desktop)**:
     * Monitoring panel: Dual `#0D1B2A` preview boxes for camera and desktop screen with pulsing sage dot.
     * Question Palette Matrix: Restrained 4-column grid reflecting exact Holst palette states:
       * **Current**: `#415A77` (muted blue border and soft blue tint)
       * **Answered**: `#778D7A` (muted sage background, cream/white text)
       * **Mark for Review**: `#D4C4A8` (warm beige background, deep navy text)
       * **Answered + Review**: `#1B263B` (dark navy with beige border/indicator)
       * **Unattempted**: Neutral white with muted border `rgba(13,27,42,0.15)`
     * Compact Status Legend.
  2. **Top Header Bar**:
     * Soft surface `#FAF8F2`, question badge (`Question X of Y`).
     * Candidate credential chip.
     * Real-time timer (`MM:SS`), transitioning to muted red `#9E2A2B` when under 60 seconds.
     * Deep navy `#0D1B2A` "Finish Assessment" button.
  3. **Main Question Canvas**:
     * Large warm white card with 16–24px radius and generous padding.
     * "Mark for Review" checkbox and marking chips (`+1.0` sage, `0.0` beige).
     * MCQ Options: Smooth radio selectors with subtle muted blue border and light tint on selection.
     * File Upload: Clean dashed container with file picker and deep navy upload trigger.
     * Footer navigation: "Clear Response", "Previous" (secondary), and "Next Question" (primary).
* **Modals**:
  * Finish Assessment: Sage progress bar, answered vs unanswered metrics, confirmation button.
  * Submission Success: Sage checkmark, clear confirmation, return to home button.

### 4.4. Administration Portal (`/admin*`)
* **Navigation Bar**: Deep navy `#0D1B2A` bar with warm beige tab highlights and global **Begin Test / End Test** controller switch in sage/muted red.
* **Add Question (`/admin`)**: Clean warm card authoring form with MCQ option rows and file upload specifications.
* **Question List (`/admin/list`)**: Visual question cards highlighting the designated key in sage, with **Download PDF** and inline edit/delete actions.
* **Student Scores (`/admin/score`)**: Spacious, clean table with percentage badges, per-student attempt reset, and **Export CSV**.
* **Reset Student (`/admin/reset`)**: Clean single-card attempt clearance portal.

---

## 5. Non-Negotiable Guardrails Maintained

The visual overhaul preserves 100% of underlying application logic:
* Student `@klu.ac.in` domain verification and student credential lookup.
* Proctoring event listeners (tab blur with 5s grace period, fullscreen exit, DevTools key combinations, swipe back gesture blocks).
* Camera and screen share streams persistence via `window.__proctoringStreams`.
* Question shuffling and MCQ option randomization.
* Database score persistence, duplicate submission prevention, and scoring algorithm.
