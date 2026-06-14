# SAP Clean Core Explorer

**Live Deployed App**: [https://KMohnishM.github.io/tool_SAP/](https://KMohnishM.github.io/tool_SAP/)

A high-performance React application designed to simplify search and analytics for SAP developers and project managers aiming for a **Clean Core** architecture. This tool combines guidelines from key SAP extensibility notes and the official SAP Cloudification Repository into an interactive, lightning-fast dashboard.

---

## 📖 Table of Contents
1. [Key Features](#key-features)
2. [SAP Clean Core Terminology Reference](#-sap-clean-core-terminology-reference)
3. [Understanding Clean Core Levels & Compliance](#-understanding-clean-core-levels--compliance)
4. [Custom Code Compliance Analyzer & ATC Logs](#-custom-code-compliance-analyzer--atc-logs)
5. [Step-by-Step Scan & Remediation Examples](#-step-by-step-scan--remediation-examples)
6. [Getting Started](#getting-started)
7. [Technical Architecture](#technical-architecture)
8. [Data Sources](#data-sources)

---

## Key Features

1. **Clean Core Pattern Finder & Analytics Dashboard**:
   - Filter, search, and analyze 90+ developer patterns and integration protocols from **SAP Note 3578329 (Extensibility, v20)** and **Note 3690029 (Integration, v2)**.
   - Comprehensive analytics: Distribution of patterns by Clean Core Level (A–D), horizontal category breakdowns, upgrade vs. cloud-readiness grids, and successor availability.
   - **Interactive Filtering**: Click on the Donut Chart slices, Top Category bars, or Remediation Complexity bars to instantly filter the master list of patterns.
   - Expandable details cards showing target components, cloud viability, upgrade-stability, alternatives, and detailed technical notes.

2. **Cloudification Repository Explorer & Code Analyzer**:
   - Instantly search through **34,000+ released APIs, tables, structures, and business objects** from the official SAP Cloudification Repository database.
   - **Custom Code Analyzer (Scanner)**: Paste a raw list of SAP standard objects used in your custom code or paste the raw console outputs directly from your ABAP Test Cockpit (ATC) checks. The tool extracts standard objects, calculates your Clean Core compliance score, estimates remediation hours, and maps violations to their recommended cloud-ready successor objects.
   - **Interactive Remediation Simulator**: Move the simulation slider to resolve a percentage of violations (prioritizing the lowest effort/easiest direct replacements first) and watch your compliance score increase and remaining project hours decrease in real-time.
   - **CSV Exporter**: Click a button to download an Excel-compliant CSV report containing names, release states, remediation complexities, effort hours, and successor pathways.

3. **Performance & Offline Design**:
   - Zero-backend footprint. All data is parsed and queried in-memory, ensuring sub-50ms search and scanner response times.
   - Offline database caching built-in, with an option to synchronize live datasets directly from SAP's official GitHub repository.
   - Beautiful, modern theme with glassmorphic cards, custom HSL status-colored styling, and support for Light and Dark modes.

---

## 📘 SAP Clean Core Terminology Reference

To successfully manage an SAP S/4HANA migration or greenfield project, it is essential to understand the following concepts implemented in this tool:

### 1. The Clean Core Concept
**Clean Core** is an SAP architectural strategy aimed at keeping the core ERP system stable, unmodified, and upgrade-ready. By separating standard SAP code from custom developments, organizations can adopt updates, security patches, and new features from SAP with minimal effort, testing time, and disruption.

### 2. Extensibility Models
- **Developer Extensibility (Tier 1)**: Custom ABAP code written directly on the S/4HANA stack (via ADT) but restricted to using **Released APIs** and extension points. This code is upgrade-stable and cloud-compliant.
- **Classic Extensibility (Tier 3)**: Legacy ABAP development where developers can modify standard objects or use any non-released SAP standard API. This model is prohibited in S/4HANA Cloud Public and strongly discouraged in Private Cloud / On-Premise.
- **Tier 2 Extensibility (Wrappers)**: A mitigation tier where classic custom components wrap non-released SAP APIs (Level C) into custom released wrappers, protecting the Tier 1 developer layer from direct dependency on standard SAP internals.

### 3. API Types & Release States
- **Released API (Level A / Cloud Ready)**: Standard SAP objects (interfaces, classes, CDS views, function modules) explicitly approved and marked by SAP for public custom usage. They are guaranteed to remain stable and backward-compatible.
- **Classic API (Level B / Upgrade Stable)**: SAP standard objects that are upgrade-stable but not released for cloud extensibility. They are safe for on-premise or Private Cloud, but cannot be used in S/4HANA Cloud Public.
- **SAP Internal API (Level C / Tier 2 Wrapper Required)**: Standard SAP objects not released for custom code but stable. Guidelines recommend wrapping these inside a Tier 2 Custom Wrapper to isolate custom code.
- **Obsolete / Blocked (Level D / Avoid)**: Objects that are deprecated, obsolete, or strictly internal. Using them violates Clean Core. They require complete redevelopment, redesign, or replacement using a cloud-ready successor.

### 4. Technical Terms
- **ATC Check (ABAP Test Cockpit)**: SAP's central tool for static code analysis. In a Clean Core project, ATC checks identify custom code calling non-released APIs, direct database writes on standard tables, and other violations.
- **Successor Object**: The modern, released object recommended by SAP to replace a legacy, non-released standard object (e.g., using released CDS view `I_Product` instead of direct SELECT on table `MARA`).
- **Remediation Effort**: The estimated developer-hours required to replace a non-compliant standard API reference with a compliant option:
  - **Released (0 hours)**: Fully compliant. No effort.
  - **Deprecated / Classic API (6 hours)**: Requires replacing the call with a modern successor, wrapping it in a custom API, or performing medium-complexity redesign.
  - **Internal / Blocked (16 hours / 2 Dev Days)**: Requires substantial redevelopment, such as rewriting database accesses to use public API frameworks.
  - **Custom Namespace (0 hours)**: Customer custom objects (e.g., `ZCL_*`, `YIF_*`) which do not require clean core analysis.

---

## 📊 Understanding Clean Core Levels & Compliance

When you scan custom code or search extensibility patterns, the tool maps findings to four distinct compliance levels:

| Level | Classification | Upgrade Stable? | Cloud Ready? | Action Required | Remediation Complexity |
|:---:|:---|:---:|:---:|:---|:---:|
| **Level A** | **Cloud Ready** | Yes | Yes | **None**. Fully compliant with strict cloud guidelines. | None (0h) |
| **Level B** | **Classic API** | Yes | No | **Allowed in Private Cloud**. Avoid in Public Cloud. | Medium (6h) |
| **Level C** | **Internal API** | Conditional | No | **Wrap in Tier 2**. Isolate custom code from changes. | Medium (6h) |
| **Level D** | **Obsolete / Blocked** | No | No | **Strictly Prohibited**. Redesign using successors. | High (16h) |

---

## 🔍 Custom Code Compliance Analyzer & ATC Logs

The Custom Code Object Analyzer operates in two modes:
1. **Direct Object List Mode**: Accepts a plain, line-separated list of standard SAP object names (e.g. `MARA`, `BAPI_USER_GET_DETAIL`).
2. **Raw ATC Log Mode**: Parses raw console logs exported from the ABAP Test Cockpit. 
   - A regex extracts uppercase symbols, namespaces (e.g., `/AIF/`), and objects.
   - An integrated word blacklist filters out common ABAP keywords (e.g., `CLAS`, `TABL`, `WARN`, `ERROR`, `SYSTEM`, `CODE`) to ensure only standard objects are scanned against the 34k database.

### Score Metrics
- **Clean Core Compliance Score**: Percentage of scanned SAP standard objects that are fully **Released (Level A)**.
  $$\text{Compliance Score} = \left( \frac{\text{Released Objects (Level A)}}{\text{Total Scanned SAP Standard Objects}} \right) \times 100\%$$
- **Remediation Effort (Hours)**: Sum of estimated hours based on the release state of standard objects:
  $$\text{Total Effort} = \sum (\text{Deprecated Objects} \times 6\text{h}) + \sum (\text{Blocked Objects} \times 16\text{h})$$

---

## 📋 Step-by-Step Scan & Remediation Examples

You can test the analyzer immediately using the **Sample Inputs** buttons in the Custom Code Object Analyzer tab. Below are detailed breakdowns of each example:

### Example 1: ATC Log (Mixed Compliance)
*   **Log Content**:
    ```text
    ATC Check: Usage of Released APIs (Cloudification Repository)
    --------------------------------------------------------------------------------
    Object: CLAS ZCL_SALES_REMEDIATION (Source: ZCL_SALES_REMEDIATION======CP)
    Finding: Usage of non-released class CL_ABAP_CHAR_UTILITIES (Level: Deprecated)
    Finding: Usage of released interface IF_XCO_NEWS (Level: Released)
    Finding: Usage of non-released function FM BAPI_USER_GET_DETAIL (Level: Deprecated)
    Finding: SELECT from non-released table KNA1 (Level: Deprecated)
    Finding: Usage of released CDS view I_Product (Level: Released)
    ```
*   **Objects Extracted**: `CL_ABAP_CHAR_UTILITIES`, `IF_XCO_NEWS`, `BAPI_USER_GET_DETAIL`, `KNA1`, `I_PRODUCT` (5 standard objects).
*   **Compliance Classification**:
    1.  `IF_XCO_NEWS` -> **Released (Level A)** (0h)
    2.  `I_PRODUCT` -> **Released (Level A)** (0h)
    3.  `CL_ABAP_CHAR_UTILITIES` -> **Deprecated / Classic API** (6h)
    4.  `BAPI_USER_GET_DETAIL` -> **Deprecated / Classic API** (6h)
    5.  `KNA1` -> **Deprecated / Classic API** (6h)
*   **Metrics Output**:
    - **Total Scanned**: 5 standard objects
    - **Clean Core Compliance**: **40%** (2 out of 5 are Released)
    - **Initial Effort**: **18 Hours** (3 deprecated objects $\times$ 6 hours)
*   **Remediation Path**:
    - `CL_ABAP_CHAR_UTILITIES` -> Search in Explorer to find the released class `CL_ABAP_UC_XCO_UTILITIES` or helper alternatives.
    - `BAPI_USER_GET_DETAIL` -> Search in Explorer for successor APIs.
    - `KNA1` -> Replace direct database SELECTs with released CDS view `I_Customer`.

---

### Example 2: ATC Log (Legacy Migration)
*   **Log Content**:
    ```text
    ABAP Test Cockpit - Results Report - 14.06.2026
    --------------------------------------------------------------------------------
    Check Variant: ABAP_CLEAN_CORE_DEVELOPMENT
    System: DEV - Client: 100

    1. ZPG_LEGACY_REPORTS (PROG) - Line 140
       Critical: Usage of restricted database access on standard table MARA (Level: Deprecated)
    2. ZCL_CUSTOMER_SYNC (CLAS) - Line 45
       Critical: Call of non-released function module SUBST_GET_FILE_LIST (Level: notToBeReleased)
    3. ZCL_CUSTOMER_SYNC (CLAS) - Line 72
       Warning: Usage of classic API BAPI_CUSTOMER_GETDETAIL2 (Level: Deprecated)
    4. ZIF_VENDOR_DATA (INTF) - Line 12
       Info: Released API CL_ABAP_HMAC_SHA256 is fully cloud ready (Level: Released)
    ```
*   **Objects Extracted**: `MARA`, `SUBST_GET_FILE_LIST`, `BAPI_CUSTOMER_GETDETAIL2`, `CL_ABAP_HMAC_SHA256` (4 standard objects).
*   **Compliance Classification**:
    1.  `CL_ABAP_HMAC_SHA256` -> **Released (Level A)** (0h)
    2.  `MARA` -> **Deprecated / Classic API** (6h)
    3.  `BAPI_CUSTOMER_GETDETAIL2` -> **Deprecated / Classic API** (6h)
    4.  `SUBST_GET_FILE_LIST` -> **Internal / Blocked (notToBeReleased)** (16h)
*   **Metrics Output**:
    - **Total Scanned**: 4 standard objects
    - **Clean Core Compliance**: **25%** (1 out of 4 is Released)
    - **Initial Effort**: **28 Hours** (2 deprecated $\times$ 6h + 1 blocked $\times$ 16h)
*   **Remediation Path**:
    - `MARA` -> Replace direct reads with released CDS views like `I_Product` or product APIs.
    - `BAPI_CUSTOMER_GETDETAIL2` -> Use modern released API counterparts.
    - `SUBST_GET_FILE_LIST` -> Fails Clean Core checks. Replace with standard released class `CL_GUI_FRONTEND_SERVICES` or server file system released APIs.

---

### Example 3: ATC Log (Sales & Billing Module)
*   **Log Content**:
    ```text
    ATC Check: ABAP Clean Core Integration & Extensibility Check
    --------------------------------------------------------------------------------
    Object: CLAS ZCL_SD_BILLING_EXT (Source: ZCL_SD_BILLING_EXT=========CP)
    Finding: Usage of deprecated classic table VBAP (Level: Deprecated) -> Use released CDS view I_SalesDocumentItem
    Finding: Usage of non-released FM SD_SALES_DOCUMENT_READ (Level: Deprecated) -> Use SD_SALESDOCUMENT_READ (Released)
    Finding: Usage of released API CL_ABAP_CONTAINER_UTILITIES (Level: Released)
    Finding: Modification check fails on standard structure VBRK (Level: notToBeReleased)
    Finding: Call of released class CL_SD_DOC_FLOW (Level: Released)
    ```
*   **Objects Extracted**: `VBAP`, `SD_SALES_DOCUMENT_READ`, `CL_ABAP_CONTAINER_UTILITIES`, `VBRK`, `CL_SD_DOC_FLOW` (5 standard objects).
*   **Compliance Classification**:
    1.  `CL_ABAP_CONTAINER_UTILITIES` -> **Released (Level A)** (0h)
    2.  `CL_SD_DOC_FLOW` -> **Released (Level A)** (0h)
    3.  `VBAP` -> **Deprecated / Classic API** (6h)
    4.  `SD_SALES_DOCUMENT_READ` -> **Deprecated / Classic API** (6h)
    5.  `VBRK` -> **Internal / Blocked (notToBeReleased)** (16h)
*   **Metrics Output**:
    - **Total Scanned**: 5 standard objects
    - **Clean Core Compliance**: **40%** (2 out of 5 are Released)
    - **Initial Effort**: **28 Hours** (2 deprecated $\times$ 6h + 1 blocked $\times$ 16h)
*   **Remediation Path**:
    - `VBAP` -> Replace direct database SELECTs with released CDS view `I_SalesDocumentItem`.
    - `SD_SALES_DOCUMENT_READ` -> Replace with standard released successor function module `SD_SALESDOCUMENT_READ`.
    - `VBRK` -> Blocked modification. Replace with released SD billing CDS views or standard extensibility fields.

---

### Example 4: ATC Log (Financials Clean Core)
*   **Log Content**:
    ```text
    ABAP Test Cockpit Findings Report - Finance Custom Objects Scan
    --------------------------------------------------------------------------------
    1. ZCL_FIN_GL_POSTING (CLAS) - Line 89
       Critical: Direct database update on standard table BSEG (Level: notToBeReleased) -> Use Journal Entry API (Released)
    2. ZCL_FIN_GL_POSTING (CLAS) - Line 142
       Warning: Usage of obsolete BAPI_ACC_DOCUMENT_POST (Level: Deprecated) -> Use Released Successor API
    3. ZIF_FIN_TAX_CALC (INTF) - Line 24
       Info: Released interface IF_BADI_TAX_CALCULATION is fully compliant (Level: Released)
    4. ZCDS_FIN_TAX_VIEW (DDLS) - Line 5
       Critical: SELECT from non-released database view BSTAT (Level: Deprecated)
    ```
*   **Objects Extracted**: `BSEG`, `BAPI_ACC_DOCUMENT_POST`, `IF_BADI_TAX_CALCULATION`, `BSTAT` (4 standard objects).
*   **Compliance Classification**:
    1.  `IF_BADI_TAX_CALCULATION` -> **Released (Level A)** (0h)
    2.  `BSTAT` -> **Deprecated / Classic API** (6h)
    3.  `BAPI_ACC_DOCUMENT_POST` -> **Deprecated / Classic API** (6h)
    4.  `BSEG` -> **Internal / Blocked (notToBeReleased)** (16h)
*   **Metrics Output**:
    - **Total Scanned**: 4 standard objects
    - **Clean Core Compliance**: **25%** (1 out of 4 is Released)
    - **Initial Effort**: **28 Hours** (2 deprecated $\times$ 6h + 1 blocked $\times$ 16h)
*   **Remediation Path**:
    - `BSEG` -> Direct database writes are strictly forbidden. Must rewrite using the standard released SOAP service or OData API for Journal Entries.
    - `BAPI_ACC_DOCUMENT_POST` -> Replace with standard released successor APIs.
    - `BSTAT` -> Replace direct view selects with financial CDS views such as `I_JournalEntryProduct`.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0 or higher recommended)
- `npm` (packaged with Node.js)

### Installation
1. Clone or copy this project folder.
2. Open a terminal in the project root:
   ```bash
   npm install
   ```

### Running in Development Mode
Launch the local Vite server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your web browser.

### Building for Production
Bundle the application into a folder of static, optimized assets:
```bash
npm run build
```
The resulting `dist/` folder can be served by any static web server (e.g. Apache, Nginx, IIS, GitHub Pages) with zero server-side configurations required.

---

## Technical Architecture

- **Vite & React**: The application is built using a modern React SPA architecture. Vite enables ultra-fast hot module replacement during development and optimizes builds via Rolldown.
- **Dynamic Lazy Loading**: The 9.8MB SAP Cloudification database (`objectReleaseInfoLatest.json`) is code-split dynamically. It is loaded asynchronously via `import()` only when the user clicks the "API Repository" tab, preventing initial page load bloat.
- **Design Tokens**: Standard CSS custom properties are defined in `src/styles/variables.css` using theme attributes (`[data-theme="light"]`, `[data-theme="dark"]`). Glassmorphic components adapt dynamically to Light and Dark modes.
- **Visuals**: Custom gauges, donut charts, and bar charts are implemented using standard SVG vectors and CSS variables (no heavy external charting libraries like Chart.js or Recharts).

---

## Data Sources
- **SAP Note 3578329** (Extensibility Patterns)
- **SAP Note 3690029** (Integration Protocols)
- **SAP Cloudification Repository** (`SAP/abap-atc-cr-cv-s4hc` GitHub)
