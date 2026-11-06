# ACLC COLLEGE OF BUKIDNON CAMPUS
**3535 TS. Fashion Bldg., Hagkol, Valencia City, Bukidnon**

---

### DESIGN AND DEVELOPMENT OF VALENCIA POWERWATCH: A MULTI-ROLE WEB- AND MOBILE-BASED COMMUNITY POWER INTERRUPTION REPORTING, VERIFICATION, AND INFORMATION MANAGEMENT SYSTEM FOR VALENCIA CITY, BUKIDNON

**A Capstone Project Proposal Presented to the Faculty of**  
**ACLC College of Bukidnon CAMPUS**  
**Valencia City, Bukidnon**

**In Partial Fulfilment of the Requirements for the Subject Capstone**  
**for the Degree of Bachelor of Science in Information Technology**

**By:**  
**Lui Gie Condiman Aguimbag**  
**Delmarkel Saro-ay**  
**Armirarin Suello**

**Academic Year 2026–2027**  
**DECEMBER 2026**

---

## Table of Contents

- **Chapter 1. PROJECT AND ITS BACKGROUND** ....................................................... 3
  - Project Context ........................................................................................ 3
  - Problem Statement ................................................................................... 4
  - Objectives of the Study ............................................................................ 4
    - General Objective ................................................................................ 4
    - Specific Objectives ............................................................................. 5
  - Significance of the Study .......................................................................... 5
  - Scope and limitations ............................................................................... 6
    - Scope ................................................................................................. 6
    - Limitations ........................................................................................... 7
  - Definition of Terms ................................................................................... 7
- **Chapter 2. REVIEW OF RELATED LITERATURE AND STUDIES** ................................ 9
  - Related Literature ..................................................................................... 9
    - Theoretical Models in Technology Adoption and System Success .................... 9
    - Civic Crowdsourcing, Open311, and Citizen Incident Reporting ..................... 10
    - Outage Management Systems and Distribution Grid Operations ...................... 11
    - Geospatial Information Systems and Municipal Mapping ............................... 12
    - Progressive Web Applications in Low-Bandwidth Infrastructure ....................... 13
    - Multi-Channel Telecommunication and SMS Alerting in Crisis Response ........... 14
    - Role-Based Access Security and Data Privacy in Civic Portals ......................... 15
    - Deterministic and Heuristic Restoration Time Estimation (ETR) ..................... 16
  - Synthesis and Research Gap ...................................................................... 17
- **Chapter 3. RESEARCH METHODOLOGY** ............................................................... 19
  - Research Setting ....................................................................................... 19
  - Research Design ....................................................................................... 20
  - Data Gathering and Requirements Analysis ..................................................... 20
  - System Development Methodology .............................................................. 23
  - Methodology Phase Guide .......................................................................... 24
  - System Flow ............................................................................................. 25
  - System Architecture ................................................................................. 26
  - System Development Requirements ............................................................... 28
    - Hardware Requirements .......................................................................... 28
    - Software Requirements .......................................................................... 29
  - Data Flow Diagram (DFD) ............................................................................ 30
    - Context Diagram (Level 0) ........................................................................ 30
    - Level 1 Data Flow Diagram ...................................................................... 31
  - Entity Relationship Diagram (ERD) ............................................................... 32
- **REFERENCES** ................................................................................................. 35

---

# Chapter 1
## PROJECT AND ITS BACKGROUND

This Chapter establishes the need for the project. It explains the current situation, identifies the specific problem, states what the researchers intend to achieve, identifies who will benefit, and defines the boundaries of the proposed solution.

### Project Context

Electrical energy is an essential utility sustaining socioeconomic life in Valencia City, Bukidnon. It powers households, sustains daily commercial operations, powers learning tools in schools, and keeps medical apparatus active across rural and urban clinics. When sudden, unannounced power interruptions strike, household activities stall, commercial enterprises incur direct financial losses, and community security is compromised. During these blackouts, line faults, and system trips, the primary operational need of residents is clear, verifiable, and timely information: which areas are affected, what caused the outage, and when the electricity is realistically expected to return.

In Valencia City, power distribution is franchised and managed by the First Bukidnon Electric Cooperative, Inc. (FIBECO). At present, when an outage occurs, electricity consumers rely heavily on informal, fragmented, and uncoordinated communication channels to log reports or check status updates. Residents predominantly attempt to call telephone hotline switchboards or post unmoderated inquiries across social media, particularly on community Facebook pages. 

This current setup produces severe communication bottlenecks. During major feeder trips, telephone switchboards become instantaneously overwhelmed with calls, greeting frustrated residents with continuous busy signals. Simultaneously, public social media comment sections are inundated with hundreds of vague, unvetted remarks—often stating simple phrases such as *"Walay suga diri"* (No power here)—without providing essential diagnostic details such as the specific barangay, purok, nearest landmark, or photo of the damaged pole.

For utility dispatchers and technical operations personnel, extracting useful incident data from these scattered, informal messages is laborious and inefficient. Dispatchers must repeatedly answer duplicate phone inquiries regarding an already identified main-line trip while struggling to detect isolated, local faults, such as a fallen tree branch on a secondary service line or a blown transformer fuse. Because there is no centralized, map-based tracking platform, dispatchers cannot readily distinguish whether thirty phone calls represent thirty isolated line breaks or a single tripped lateral breaker affecting an entire neighborhood. Consequently, field linemen spend valuable time driving around looking for faults, while residents are left uncertain about whether maintenance crews are working on their sector.

To resolve these operational deficits, the researchers designed and developed **Valencia PowerWatch: A Multi-Role Web- and Mobile-Based Community Power Interruption Reporting, Verification, and Information Management System**. The platform equips Valencia City with an organized, map-driven communication and management system where community residents, utility dispatchers, and field crews coordinate smoothly. Instead of vague phone calls, residents submit structured reports with their exact barangay, purok, GPS coordinates, and photos. Dispatchers verify reports on an interactive map console, group related reports into master incident tickets, and assign field maintenance crews. Field linemen update repair stages (*En Route*, *Inspecting*, *Repairing*, *Completed*) directly from their mobile devices, triggering automated SMS text alerts and web notifications back to reporting residents. This creates a transparent, efficient, and accountable end-to-end incident management workflow.

---

### Problem Statement

Power interruption reporting, incident verification, and technical dispatching in Valencia City currently depend on congested telephone hotlines and unmoderated social media threads. The absence of an organized, geo-referenced, and automated incident management platform leads to communication bottlenecks, duplicated record-keeping, delayed field dispatch, and public uncertainty during electrical outages.

Specifically, this study addresses the following research questions:

1. What functional, operational, and architectural requirements are necessary to design and develop a multi-role web- and mobile-based power interruption management platform tailored to the 31 official barangays of Valencia City?
2. How can an interactive geospatial mapping module and a deterministic Estimated Time of Restoration (ETR) algorithm be formulated and integrated to visualize incident clusters and compute realistic restoration windows for utility personnel and citizens?
3. How can a multi-portal architecture featuring Role-Based Access Control (RBAC), automated text alerting via SMS gateway, and a bilingual conversational chatbot (English and Cebuano) be implemented to coordinate residents, dispatchers, and field linemen?
4. What is the level of software quality and user acceptability of the developed Valencia PowerWatch platform when evaluated across community residents, field linemen, utility dispatchers, and IT professionals using the ISO/IEC 25010 Software Quality Standard?

---

### Objectives of the Study

#### General Objective
To design, develop, and evaluate **Valencia PowerWatch**, an integrated multi-role web- and mobile-based community power interruption reporting, verification, and information management system for Valencia City, Bukidnon.

#### Specific Objectives
1. **To identify and analyze** the functional and operational requirements, reporting workflows, and user needs of Valencia City residents, utility dispatchers, and field maintenance personnel through stakeholder consultations, hotline workflow analysis, and operational reviews.
2. **To design and implement** a responsive geospatial mapping module using Leaflet.js with exact municipal barangay boundaries, and a deterministic Estimated Time of Restoration (ETR) calculation engine driven by reported fault types, active incident density, and live Open-Meteo weather factors.
3. **To develop and integrate** three synchronized, role-restricted portals—the Resident Community Portal (PWA), Dispatcher Administrative SCADA Dashboard, and Linemen Mobile Staff Portal—featuring secure `scryptSync` password authentication, automated Semaphore SMS alerts, and a bilingual (Cebuano/English) assistance chatbot.
4. **To evaluate the software quality and acceptability** of the developed platform across the characteristics of Functional Suitability, Performance Efficiency, Usability, Reliability, and Security by administering a standardized evaluation instrument based on the ISO/IEC 25010 Software Quality Standard to 50 purposively sampled respondents comprising community residents, field personnel, utility dispatchers, and IT professionals.

---

### Significance of the Study

The development of Valencia PowerWatch provides direct, measurable benefits to several key stakeholders in Valencia City:

* **For Community Residents of Valencia City:** Residents obtain a convenient, 24/7 web- and mobile-accessible platform to report power outages in three simple steps. Rather than experiencing anxiety over unacknowledged hotline calls, citizens receive immediate confirmation, view their ticket status change dynamically (*Submitted*, *Verified*, *In Progress*, *Resolved*), inspect live municipal outage maps, and receive automated SMS notifications when technicians are dispatched and service is restored.
* **For Utility Dispatchers and Operations Personnel:** Dispatchers gain an administrative command dashboard that automatically consolidates multiple citizen reports originating from the same feeder or purok under a single master incident ticket (`OUT-XXXX`). This eliminates duplicated paperwork, highlights high-density fault clusters, estimates restoration timelines, and streamlines technician dispatching.
* **For Field Maintenance Crews and Linemen:** Field personnel utilize a streamlined, mobile-optimized Staff Portal that displays assigned repair tickets, exact purok landmarks, GPS route markers, and citizen-uploaded photos of fallen branches or damaged hardware. Linemen can confirm on-site arrival via GPS, log progression stages (*En Route*, *Inspecting*, *Repairing*), and upload post-repair completion evidence, minimizing transit delays and eliminating paper dispatch sheets.
* **For Local Government Units and Disaster Responders (CDRRMO):** City administrators, the City Disaster Risk Reduction and Management Office (CDRRMO), and local emergency services can consult the public and administrative outage maps during severe meteorological events to monitor grid integrity across barangays, allowing timely deployment of backup generation assets to medical clinics, emergency shelters, and water pumping stations.
* **For Future IT Researchers and Academics:** The study provides a documented architectural reference for developing resilient municipal civic software. It demonstrates the practical integration of Progressive Web Applications (PWAs), client-side GIS mapping, hybrid operational databases combining local SQLite with serverless PostgreSQL persistence, and localized conversational interfaces.

---

### Scope and limitations

#### Scope
The project covers the design, software development, cloud hosting, and empirical ISO/IEC 25010 evaluation of the Valencia PowerWatch platform across all thirty-one (31) official barangays of Valencia City, Bukidnon:
* *Bagontaas, Banlag, Barobo, Batangan, Catumbalon, Colonia, Concepcion, Dagat-Kidavao, Guinoyuran, Kahapunan, Laligan, Lilingayon, Lourdes, Lumbayao, Lumbo, Lurogan, Maapag, Mabuhay, Mailag, Mt. Nebo, Nabago, Pinatilan, Poblacion, San Carlos, San Isidro, Sinabuagan, Sinayawan, Sugod, Tongantongan, Tugaya, and Vintar.*

The platform includes:
1. **Four Defined User Roles:** Resident, Field Personnel (Staff), Utility / Dispatcher, and System Administrator.
2. **Core Operational Modules:**
   - Crowdsourced outage intake capturing barangay, purok, geolocation coordinates, fault type classification, and media evidence (JPEG/PNG/MP4).
   - Administrative master incident grouping (`OUT-XXXX`) linking multiple individual report tickets (`VPR-XXXX`).
   - Interactive GIS mapping with heatmaps, status layer filters, and official barangay coordinate boundaries.
   - Deterministic ETR calculation engine factoring in baseline fault repair durations, regional incident density, and live Open-Meteo weather codes.
   - Multi-channel notification pipeline delivering in-app alerts and Semaphore SMS text messages.
   - Bilingual rule-based resident support chatbot responding in English and conversational Cebuano/Bisaya.
   - Post-restoration citizen satisfaction feedback mechanism (1-to-5 star rating scale with qualitative feedback).
3. **Technical Architecture:** Built using Node.js and Express.js, hosted on Render.com, utilizing local SQLite in Write-Ahead Logging (WAL) mode for low-latency operational CRUD workflows, coupled with Neon Serverless PostgreSQL for persistent cloud database snapshots and durable resident identity storage.
4. **Software Evaluation:** Assessed by 50 evaluators across four stakeholder groups using an evaluation instrument grounded in the ISO/IEC 25010 standard.

#### Limitations
To maintain technical feasibility and institutional scope, the following boundaries are defined:
1. **No Direct Electrical Grid Hardware Actuation:** The platform functions strictly as an information, communication, and dispatch management system. It does not interface directly with electrical substation Supervisory Control and Data Acquisition (SCADA) systems, high-voltage breakers, automatic reclosers, or Advanced Metering Infrastructure (AMI) smart meters. It cannot mechanically disconnect or re-energize transmission circuits.
2. **Network and Device Dependency:** Active report submission and map tile synchronization necessitate an internet connection (cellular data or Wi-Fi). Although the client applications utilize PWA service workers to cache application shells for offline startup, reports compiled without active connectivity remain queued in local memory until data transmission is re-established.
3. **Geocoding Granularity in Unpaved Sectors:** Automated reverse-geocoding relies on OpenStreetMap Nominatim data. While urban centers possess detailed street vectors, remote rural sitios with unmapped roads require residents to confirm their specific purok or landmark manually from structured dropdown lists.
4. **Telecommunication SMS Gateway Availability:** Automated text message dissemination is subject to regional cellular carrier signal reception and prepaid SMS credit balances on the Semaphore gateway service. During offline testing or test automation environments, SMS transactions are captured via structured system mock logs.

---

### Definition of Terms

The following operational definitions clarify the specific usage of key terms throughout this study:

* **Administrator:** A privileged user account authorized to configure system parameters, govern account roles, inspect security audit logs, manage database snapshot routines, and oversee platform maintenance.
* **Barangay:** The primary political and administrative division in the Philippines; used within this system as the foundational geographic boundary for aggregating incident reports.
* **Chatbot:** A rule-based conversational software component integrated into the Resident Portal that evaluates resident queries using tokenized pattern matching in Cebuano and English to return navigational actions and status summaries.
* **Citizen Feedback:** A quality assurance feature enabling reporting citizens to submit a 1 to 5 star rating and optional comments verifying actual electrical restoration upon ticket closure.
* **Data Flow Diagram (DFD):** A structured systems modeling notation illustrating the functional boundaries, external entities, data flows, and storage stores comprising the software architecture.
* **Estimated Time of Restoration (ETR):** A deterministically calculated projection indicating the anticipated timestamp of power restoration based on empirical fault repair metrics, concurrent incident load, and prevailing weather indices.
* **Entity Relationship Diagram (ERD):** A graphical model detailing the structural schema of database entities, primary keys, foreign key constraints, and relational cardinalities.
* **Field Personnel (Staff):** Technical utility employees, such as linemen and dispatch technicians, authorized to access the mobile staff portal to receive work assignments, confirm field locations, and log repair progress.
* **Geospatial Mapping:** The computer-assisted visual representation of geographic coordinates, outage distribution clusters, and municipal boundaries on an interactive digital map canvas.
* **Incident (`OUT-XXXX`):** An authoritative master ticket created by dispatchers representing an acknowledged electrical disruption event, linking one or multiple individual resident reports.
* **ISO/IEC 25010:** An international standard for software engineering defining software product quality models across specific characteristics: Functional Suitability, Performance Efficiency, Compatibility, Usability, Reliability, Security, Maintainability, and Portability.
* **Outage Report (`VPR-XXXX`):** A crowdsourced trouble ticket submitted by a registered citizen recording an unannounced power loss, complete with location, description, and diagnostic media.
* **Progressive Web Application (PWA):** A web application engineered with modern web APIs (Service Workers, Cache API, Web App Manifest) that delivers app-like experiences, offline shell access, and installability on mobile operating systems without requiring an app store download.
* **Purok:** A sub-barangay neighborhood or communal cluster utilized within the system to localize fault reports precisely within large rural barangays.
* **Role-Based Access Control (RBAC):** An information security paradigm that restricts network and system resource access strictly to authorized users based on verified privilege roles.
* **Semaphore API:** A Philippine online SMS service used by the system backend to send text message notifications to mobile numbers.

---

# Chapter 2
## REVIEW OF RELATED LITERATURE AND STUDIES

This chapter presents the review of related literature, published studies, and existing systems relevant to the proposed project. Grounded in established computer science and utility management research, this review examines what previous systems and approaches have achieved, identifies common technical limitations, and establishes the local research gap that Valencia PowerWatch addresses. The review covers eight foundational domains: technology adoption models, civic crowdsourcing protocols, outage management systems, geospatial services, progressive web applications, telecommunication alerting, web application security, and restoration heuristic models.

### Related Literature

#### Theoretical Models in Technology Adoption and System Success
Deploying community-facing software requires understanding the socio-technical drivers governing public adoption. DeLone and McLean (2003) updated their Information Systems Success Model, demonstrating that multi-dimensional system success is dictated by **System Quality** (availability, execution speed, mobile usability), **Information Quality** (accuracy, relevance, timeliness of data), and **Service Quality**. These dimensions directly shape user satisfaction and continued intention to use. In Valencia PowerWatch, system quality corresponds to responsive rendering and lightweight PWA execution on low-cost smartphones; information quality is established through verified incident tags, accurate outage maps, and realistic restoration updates.

In parallel, Davis (1989) formulated the Technology Acceptance Model (TAM), establishing that technological adoption is primarily governed by **Perceived Usefulness (PU)**—the degree to which an individual believes that using a particular system will enhance their job performance or daily convenience—and **Perceived Ease of Use (PEOU)**—the degree to which using the platform is free from cognitive and physical effort. Venkatesh and Davis (2000) extended this through TAM2, proving that cognitive instrumental processes, such as job relevance and output quality, significantly bolster perceived usefulness. For an electricity consumer experiencing a localized blackout in Valencia City, perceived usefulness manifests as immediate insight into whether utility crews are cognizant of the failure. Perceived ease of use is achieved by reducing the report intake process to an intuitive three-step sequence with automated geocoding.

Furthermore, Carter and Belanger (2005) investigated citizen adoption of e-government services, identifying **institutional and technological trust** as fundamental prerequisites for public engagement. Citizens adopt civic portals only when they trust that the managing entity will act upon filed data and that the underlying platform securely safeguards personal identifiers.

#### Civic Crowdsourcing, Open311, and Citizen Incident Reporting
The integration of citizen reporting into municipal workflows has been standardized globally by civic frameworks. The Open311 consortium (Open311, n.d.) established the GeoReport v2 protocol, a standard enabling citizens to log infrastructure defects (such as water mains, roadway hazards, or non-functional public lighting) with standardized metadata, geolocation coordinates, and unique tracking identifiers. The City of Bloomington’s open-source uReport system (City of Bloomington, n.d.) represents an implementation of these civic intake models. Valencia PowerWatch adopts similar tracking paradigms by assigning unique alphanumerical ticket codes (`VPR-XXXX` for reports; `OUT-XXXX` for verified master incidents), tracking lifecycle statuses, and persisting spatial coordinates.

However, Offenhuber (2014) critically examined civic reporting loops in municipal governance, identifying **reporting fatigue** as a prevalent point of failure. When citizens repeatedly submit complaint tickets into non-transparent administrative silos that fail to communicate status updates, citizen participation collapses. To counteract reporting fatigue, Valencia PowerWatch implements proactive closed-loop feedback: the system pushes automated real-time status transitions and SMS milestone notices directly to the reporting resident whenever a report is verified, a lineman is dispatched, or service is restored.

In the Philippine context, Fernandez, Ahmed, and Shaw (2020) analyzed crowdsourced disaster tracking and civic sensing in Metro Manila, observing that citizen-generated reporting accelerates emergency response cycles. Crucially, the authors emphasized that platforms implemented in provincial and non-metropolitan localities must remain technically lightweight, operate efficiently over congested cellular connections, and accommodate local dialects to guarantee community-wide inclusivity.

#### Outage Management Systems and Distribution Grid Operations
Electric utility cooperatives depend on Outage Management Systems (OMS) to maintain operational awareness over electrical distribution networks. Brown (2008) in *Electric Power Distribution Reliability* traced the technological transition from manual, paper-based trouble boards to computerized relational databases that correlate customer calls against physical feeder network diagrams. In provincial distribution cooperatives, however, capital-intensive Advanced Metering Infrastructure (AMI) and automated smart meters are often absent due to budgetary constraints, preventing utilities from detecting secondary-line failures automatically.

Farhangi (2010) observed that during grid modernization transitions, crowdsourced consumer reporting acts as an effective, low-cost distributed human sensor network. When multiple consumer reports cluster simultaneously along a distinct lateral circuit, dispatchers can infer the locus of line failure prior to field reconnaissance. Kezunovic, Dong, and Guan (2012) confirmed that merging consumer trouble calls with spatial information visualization substantially reduces System Average Interruption Duration Index (SAIDI) and Customer Average Interruption Duration Index (CAIDI) metrics. Valencia PowerWatch embodies this principle by aggregating neighborhood citizen reports into master incident tickets, furnishing dispatchers with immediate visual clarity regarding feeder performance.

#### Geospatial Information Systems and Municipal Mapping
Geospatial visualization is essential for utility dispatch and outage tracking. Goodchild (2007) introduced the concept of **Volunteered Geographic Information (VGI)**, positing that citizens equipped with GPS-capable consumer devices serve as distributed spatial sensors capable of collecting granular geographic data that centralized offices cannot capture efficiently. Commercial mobile solutions, such as Esri’s ArcGIS Survey123 (Esri, n.d.), demonstrate the utility of geo-tagged field surveys.

Despite the analytical depth of commercial enterprise GIS suites, their prohibitive licensing costs render them inaccessible to provincial cooperatives and academic implementations. Open-source geospatial libraries, notably Leaflet.js, offer a modular, high-performance alternative, providing hardware-accelerated tile rendering within desktop and mobile browsers. Haklay (2010) empirically evaluated OpenStreetMap (OSM) data, determining that crowd-contributed geographic datasets exhibit exceptional topological accuracy in populated municipal corridors. Valencia PowerWatch leverages Leaflet.js to render incident markers, interactive heatmaps, and official barangay polygon boundaries, utilizing OpenStreetMap Nominatim for automated reverse-geocoding of device coordinates.

#### Progressive Web Applications in Low-Bandwidth Infrastructure
Cross-platform municipal software must guarantee universal accessibility without imposing technical or financial friction on community users. Biørn-Hansen, Majchrzak, and Grønli (2020) evaluated native mobile applications against Progressive Web Applications (PWAs), concluding that PWAs drastically eliminate installation barriers. Citizens are not required to navigate proprietary application marketplaces, endure substantial downloads, or expend scarce device storage.

PWAs leverage background Service Workers to intercept network requests and store critical application assets in the local Cache API. Malavolta, Chinnappan, and Swanborn (2017) demonstrated that client-side caching of the "application shell" guarantees rapid loading speeds and structural availability even under degraded 2G/3G cellular networks or transient disconnectivity. Valencia PowerWatch incorporates distinct PWA manifest and service worker configurations for the Resident Community Portal and the Linemen Staff App, ensuring instantaneous shell rendering and operational stability in rural barangays.

#### Multi-Channel Telecommunication and SMS Alerting in Crisis Response
Information dissemination during utility failures requires resilient communication channels. While modern mobile push notifications and webhooks provide rich interactions under high-speed broadband, Short Message Service (SMS) remains the most robust telecommunications alerting mechanism across rural and suburban Philippine environments.

Al-Dmour, Masa’deh, and Obeidat (2020) conducted a systematic review of emergency communications, finding that SMS messages achieve an open rate exceeding 90% within fifteen minutes of transmission, vastly outperforming email or social media posts obscured by algorithmic feeds. In the Philippines, programmatic integration through the Semaphore SMS API enables server applications to broadcast instantaneous text alerts directly to mobile subscribers across all domestic telecommunication carriers (Globe, Smart, DITO). Valencia PowerWatch utilizes Semaphore to broadcast automated transaction notifications upon key milestone triggers: report verification, repair team dispatch, and electrical service restoration.

#### Role-Based Access Security and Data Privacy in Civic Portals
Civic portals collecting citizen identities, contact numbers, and GPS telemetry must enforce rigorous data security standards. Sandhu, Coyne, Feinstein, and Youman (1996) formulated the classical Role-Based Access Control (RBAC) model, establishing that system operations must be bounded by cryptographically verified user roles (e.g., Resident, Staff, Utility, Administrator) to eliminate privilege escalation and unauthorized data exposure.

The Open Web Application Security Project (OWASP, 2021) identifies **Broken Access Control** and **Cryptographic Failures** as premier vulnerabilities in modern web applications. Furthermore, the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) mandates that personal citizen information be managed with stringent administrative and technical safeguards. Valencia PowerWatch adheres to these mandates by deriving cryptographic password digests using Node.js `crypto.scryptSync`, persisting session tokens exclusively as SHA-256 cryptographic hashes, validating uploaded media using binary magic-byte inspection, and enforcing strict server-side middleware guards (`requireRole`) across all administrative and staff API endpoints.

#### Deterministic and Heuristic Restoration Time Estimation (ETR)
Publishing deterministic Estimated Time of Restoration (ETR) data mitigates public anxiety and enables institutional planning during electrical blackouts. Coster, Myrzik, Kruimer, and Kling (2011) demonstrated that outage restoration duration is an empirical function of fault severity (e.g., replacement of blown transformer units versus clearance of vegetative line contact), adverse meteorological factors, and concurrent crew commitments.

While advanced predictive methods employing machine learning ensembles (Ji, Wei, & Mei, 2016) have been explored in academic literature, their real-world application requires continuous historical SCADA archives that provincial cooperatives do not maintain in digital structures. In contrast, a rule-based deterministic calculation engine that applies calibrated duration baselines, weather severity multipliers, and active incident queue weights offers a mathematically transparent, consistent, and computationally lightweight solution. Valencia PowerWatch implements a dedicated calculation module (`etr.js`) to generate reliable restoration projections without consuming excessive server compute cycles.

---

### Synthesis and Research Gap

The reviewed academic literature underscores that modern municipal utility administration achieves optimal efficiency when coupling responsive, accessible citizen interfaces (TAM, PWA) with structured incident protocols (Open311), volunteer geographic sensing (VGI, Leaflet), dependable multi-channel alerting (SMS), and transparent restoration modeling (ETR).

Nevertheless, existing commercial and open-source solutions reveal a clear operational gap. Generic civic issue applications, such as uReport, facilitate general citizen requests (e.g., pothole repairs, refuse collection) but completely lack utility-specific operational logic, such as high-voltage electrical fault classifications, lineman stage tracking, feeder grouping, or ETR computation. Conversely, enterprise Outage Management Systems utilized by major metropolitan utilities (such as Meralco in Metro Manila) represent proprietary, capital-intensive architectures requiring comprehensive automated smart meter grids that provincial cooperatives cannot afford. Consequently, communities like Valencia City remain dependent on overloaded telephone switchboards and chaotic Facebook comments.

This establishes a defined local research gap: **Valencia City lacks a purpose-built, cost-effective, multi-role incident reporting, geospatial verification, and information management platform adapted to its geographical layout and municipal needs.** Valencia PowerWatch bridges this divide directly, delivering a bilingual, community-accessible reporting tool for residents, an incident-clustering dashboard for dispatchers, and a mobile dispatch manager for field linemen, backed by a resilient dual-tier database architecture engineered for production reliability.

---

# Chapter 3
## RESEARCH METHODOLOGY

This chapter presents the methodology that will be used in the development and evaluation of the proposed System. It discusses the research design, system development methodology, data collection methods, target respondents, statistical treatment, and the tools and technologies to be used. The purpose of this chapter is to provide a detailed plan on how the project will be implemented and evaluated.

### Research Setting

The study is conducted in **Valencia City**, a prominent component city situated in the central portion of Bukidnon province, Northern Mindanao (Region X), Philippines. Located at geographic coordinates 7.906° N, 125.094° E, Valencia City encompasses an expansive land area of 587.29 square kilometers, serving as the trade, commerce, and agricultural center of the province.

Electrical distribution throughout the city is franchised and maintained by the **First Bukidnon Electric Cooperative, Inc. (FIBECO)**. Administratively, Valencia City is composed of thirty-one (31) official barangays. The municipal landscape features dense urban commercial centers (such as Poblacion, Lumbo, Bagontaas, and Batangan) contrasted against expansive, topographically complex rural farming communities (such as Guinoyuran, Lilingayon, Mt. Nebo, and Concepcion). 

This geographic variation creates distinct operational conditions: urban core outages can be accessed quickly along paved thoroughfares, whereas rural outages along unpaved or mountainous roads demand precise purok identification, landmark coordination, and efficient dispatching. Consequently, Valencia City is an ideal real-world setting for designing, deploying, and testing an interactive map-based power outage reporting and information management system.

```
+-----------------------------------------------------------------------------+
|                                                                             |
|            FIGURE 1: LOCATION OF VALENCIA CITY, BUKIDNON                    |
|                             (STUDY SITE)                                    |
|                                                                             |
|      [ Administrative Boundary Map Depicting 31 Official Barangays:         |
|        Urban Commercial Core vs. Rural Agricultural/Mountainous Zones ]     |
|                                                                             |
+-----------------------------------------------------------------------------+
```
**Figure 1. Location of Valencia City, Bukidnon (Study Site)**

---

### Research Design

The study uses a **Developmental Research Design**, adhering to the Design and Development Research (DDR) framework formulated by Richey and Klein (2007). Developmental research focuses on the systematic planning, design, creation, and empirical evaluation of technological interventions engineered to solve concrete, real-world operational problems.

The research execution is organized across four sequential phases:
1. **Requirements Analysis:** Investigating current communication breakdowns during blackouts, establishing user access levels, and formulating system requirements through stakeholder interviews and process observation.
2. **System Design:** Creating UI/UX wireframes, process flowcharts, Context Level 0 and Level 1 Data Flow Diagrams (DFDs), Entity Relationship Diagrams (ERDs), and RESTful API structures.
3. **Prototype Development:** Engineering the responsive front-end portals, implementing the Node.js/Express backend services, integrating Leaflet.js mapping with Open-Meteo weather parameters, and configuring Semaphore SMS messaging.
4. **Testing and Evaluation:** Conducting automated integration and unit testing (113 test suites), deploying the cloud application on Render.com with Neon database persistence, and administering an empirical ISO/IEC 25010 evaluation questionnaire to 50 purposively selected stakeholders.

---

### Data Gathering and Requirements Analysis

To design a system that accurately resolves local utility bottlenecks, the researchers gathered requirements through a combination of qualitative stakeholder consultations, workflow observation, and standardized quantitative evaluation instruments.

#### 1. Stakeholders and Participants
Requirements were gathered directly from the individuals who experience and manage power outages in Valencia City. To ensure representative feedback, participants were selected using **Purposive Sampling** across four key stakeholder groups ($N = 50$):

| Respondent Group | Count ($N$) | Percentage (%) | Role in Data Gathering and Evaluation |
|:---|:---:|:---:|:---|
| **Community Residents** | 30 | 60.0% | Homeowners and small business owners providing data on reporting delays, usability pain points, mobile accessibility, and SMS alert preferences across urban and rural barangays. |
| **Field Maintenance Linemen** | 10 | 20.0% | Utility technical crew members providing requirements for mobile job tracking, GPS arrival logging, photo evidence, and hazard navigation. |
| **Utility Dispatchers / Admins** | 5 | 10.0% | Operations personnel providing data on telephone hotline congestion, manual trouble-ticket logging, report verification, and crew dispatching. |
| **IT Professionals / Engineers** | 5 | 10.0% | Experienced software engineers and systems analysts evaluating system architecture, RBAC security, API modularity, and database design. |
| **TOTAL** | **50** | **100.0%** | **Comprehensive Research and Evaluation Sample** |

#### 2. Information Collected and Analysis Methods
Data gathering was carried out through three distinct instruments:
* **Semi-Structured Interviews:** Conducted with community residents and barangay officials to identify the specific problems encountered when attempting to report power loss via hotlines and social media, and with utility linemen to determine the information they require before heading to a repair site.
* **Operational Process Walkthrough and Observation:** Traced how telephone trouble calls are currently received, transcribed onto paper logs, verified, and manually assigned to field personnel.
* **ISO/IEC 25010 Software Quality Evaluation Instrument:** A standardized evaluation instrument administered to the 50 respondents to evaluate the working software prototype across five core quality characteristics: *Functional Suitability, Usability, Performance Efficiency, Reliability, and Security*.

#### 3. Privacy, Informed Consent, and Ethical Considerations
All stakeholder data was collected under voluntary, informed consent protocols. Participants were informed of the objectives of the study and signed written consent agreements. In strict accordance with the **Data Privacy Act of 2012 (Republic Act No. 10173)**, all personal identifiable information (such as contact numbers and residential puroks) was anonymized, stored using cryptographic hashing, and restricted solely to academic research purposes.

#### 4. Statistical Treatment of Data
Survey responses collected from the ISO/IEC 25010 evaluation instrument were tabulated and evaluated using basic descriptive statistics, specifically the **Weighted Mean ($\bar{x}$)**:

$$\bar{x} = \frac{\sum (f \cdot x)}{N}$$

Where:
- $\bar{x}$ = Weighted Mean
- $f$ = Frequency of responses for each rating point
- $x$ = Scale value assigned to the Likert rating (1 to 5)
- $N$ = Total number of respondent evaluators ($N = 50$)

To interpret the computed weighted mean scores qualitatively, the following 5-point Likert scale continuum was utilized:

| Scale Point | Mean Score Continuum | Qualitative Description | Verbal Interpretation |
|:---:|:---:|:---|:---|
| **5** | 4.21 – 5.00 | Strongly Agree | Highly Acceptable / Excellent |
| **4** | 3.41 – 4.20 | Agree | Acceptable / Very Satisfactory |
| **3** | 2.61 – 3.40 | Neutral | Moderately Acceptable / Satisfactory |
| **2** | 1.81 – 2.60 | Disagree | Poor / Needs Improvement |
| **1** | 1.00 – 1.80 | Strongly Disagree | Very Poor / Unacceptable |

---

### System Development Methodology

The researchers adopted the **Agile Scrum Development Methodology** to iteratively design, build, test, and refine Valencia PowerWatch. Agile Scrum was selected because civic web applications require rapid iterative cycles, frequent testing, and continuous user feedback to ensure high usability and reliability.

```
+-----------------------------------------------------------------------------+
|                                                                             |
|            FIGURE 2: PROPOSED AGILE SCRUM SYSTEM DEVELOPMENT                 |
|                               METHODOLOGY                                   |
|                                                                             |
|   [ Product Backlog ]                                                       |
|           │                                                                 |
|           ▼                                                                 |
|   [ Sprint Planning ] ──► [ 2-Week Sprint Cycle ] ──► [ Daily Standup ]     |
|                                  │                                          |
|                                  ▼                                          |
|   [ Product Increment ] ◄── [ Sprint Review & Retrospective ]               |
|                                                                             |
+-----------------------------------------------------------------------------+
```
**Figure 2. Proposed Agile Scrum System Development Methodology**

Development was conducted across four structured two-week sprints:
* **Sprint 1 (Core Foundation & Security):** Database design, role modeling, password hashing using `scryptSync`, SHA-256 session management, and administrative base layouts.
* **Sprint 2 (Citizen Intake & Geospatial Mapping):** Resident Community Portal (PWA), GPS coordinate capture, OpenStreetMap Nominatim reverse geocoding, file upload validation with Multer, and Leaflet.js interactive mapping.
* **Sprint 3 (Staff Dispatch & Telecommunications):** Mobile Linemen Portal, task status progression (*En Route*, *Inspecting*, *Repairing*, *Completed*), field photo evidence uploads, and automated text messaging via Semaphore SMS API.
* **Sprint 4 (Incident Consolidation, Bilingual Chatbot & Polish):** Master incident clustering (`OUT-XXXX`), deterministic ETR calculation module (`etr.js`), bilingual Cebuano/English chatbot, automated testing (113 test suites passing), and deployment to Render.com with Neon cloud database snapshots.

---

### Methodology Phase Guide

| Phase | What the Team Will Do | Expected Deliverable |
|:---|:---|:---|
| **1. Planning** | Define project objectives, stakeholder roles, project timeline, and initial user stories. | Project Charter, Proposal, and Sprint Backlog. |
| **2. Analysis** | Interview residents and linemen; analyze telephone hotline bottlenecks and document detailed functional requirements. | Software Requirements Specification (SRS) and Data Dictionary. |
| **3. Design** | Prepare system flowcharts, DFDs, ERD, and wireframe layouts for the three user portals. | System Architecture Diagram, UI Mockups, and Database Design. |
| **4. Development** | Build Node.js REST APIs, SQLite/Neon hybrid persistence, Leaflet maps, and responsive PWA shells. | Working Software Prototype Deployed on Render.com Cloud. |
| **5. Testing** | Execute 113 automated unit and integration tests covering auth, reports, staff workflow, and responsiveness. | Test Execution Reports (113/113 Passed), Bug Tracker, and Audit Logs. |
| **6. Evaluation / Refinement** | Administer ISO/IEC 25010 survey to 50 respondents; tabulate statistical data; finalize manuscript documentation. | Evaluation Results, Statistical Analysis, and Capstone Manuscript. |

---

### System Flow

The operational flow of Valencia PowerWatch traverses six coordinated operational stages:

1. **Submitting a Report:** A resident opens the Community Portal (PWA) on their phone or computer, selects their barangay, indicates their purok, marks their location on the map, chooses the suspected fault type, attaches a photo if available, and submits ticket `VPR-XXXX`.
2. **Intake and Validation:** The server validates the upload, inspects image magic-bytes, logs the submission timestamp, and enqueues the ticket into the dispatcher's review queue.
3. **Grouping into Incidents:** The dispatcher reviews incoming tickets on the Admin SCADA Dashboard. When multiple reports originate from the same neighborhood or line feeder, the dispatcher links them under a single Master Incident ticket (`OUT-XXXX`). The ETR engine computes an estimated restoration time using fault severity, report cluster size, and live Open-Meteo weather data.
4. **Field Crew Dispatch:** The dispatcher assigns an authorized field repair team to the incident. An automated SMS alert is dispatched via Semaphore to the crew lead lineman.
5. **Field Repair Tracking:** Linemen open the Staff Portal on their phones, check the location and attached photos, confirm arrival on site via GPS telemetry, and advance the job status: *En Route* $\rightarrow$ *Inspecting* $\rightarrow$ *Repairing*.
6. **Completion and Citizen Feedback:** Once repairs are completed, the crew uploads an after-repair completion photo. The dispatcher marks the master incident *Resolved*. The system broadcasts automated text alerts and web notifications to reporting residents, who open their portal to submit a 1 to 5 star rating confirming that power has been restored.

```
+-----------------------------------------------------------------------------+
|                                                                             |
|                    FIGURE 3: PROPOSED SYSTEM FLOW                           |
|                                                                             |
|   [ Resident Intake (PWA) ] ──► [ Authentication & API Gateway ]            |
|                                            │                                |
|                                            ▼                                |
|   [ Field Staff Portal ] ◄─── [ Dispatcher Verification & Incident Group ]  |
|            │                               │                                |
|            ▼                               ▼                                |
|   [ Stage Updates: En Route ] ──► [ Resolution & SMS Alerting via Semaphore]|
|                                            │                                |
|                                            ▼                                |
|                               [ Citizen Feedback 1-5 Stars ]                |
|                                                                             |
+-----------------------------------------------------------------------------+
```
**Figure 3. Proposed System Flow**

---

### System Architecture

Valencia PowerWatch is built on a **Three-Tier Client-Server Architecture** supported by a high-performance **Hybrid Persistence Layer**:

```
+-----------------------------------------------------------------------------+
|                           PRESENTATION TIER                                 |
|                                                                             |
|   +-----------------------+ +--------------------+ +--------------------+   |
|   |   Community Portal    | |  Admin SCADA HUD   | |  Linemen Staff App |   |
|   |     (User PWA)        | |    (Dashboard)     | |    (Field PWA)     |   |
|   +-----------------------+ +--------------------+ +--------------------+   |
|               │                       │                       │             |
+───────────────┼───────────────────────┼───────────────────────┼─────────────+
                ▼                       ▼                       ▼
+-----------------------------------------------------------------------------+
|                           APPLICATION TIER                                  |
|                        (Render.com Cloud Host)                              |
|                                                                             |
|      Node.js (v22 LTS) + Express.js RESTful API Framework                   |
|      - Authentication Engine (`scryptSync` + Hashed Tokens)                 |
|      - Role-Based Access Control (`requireAuth`, `requireRole`)             |
|      - Deterministic ETR Calculation Engine (`etr.js`)                      |
|      - Barangay Reverse Geocoder (`location-geocoder.js`)                   |
|      - Bilingual Chatbot Virtual Assistant (`chatbot.js`)                   |
|               │                                       │                     |
+───────────────┼───────────────────────────────────────┼─────────────────────+
                ▼                                       ▼
+------------------------------------+  +-------------------------------------+
|        DATA & STORAGE TIER         |  |      EXTERNAL CLOUD SERVICES        |
|                                    |  |                                     |
|  [ SQLite3 Engine (powerwatch.db) ]|  |  [ Semaphore SMS Gateway API ]      |
|  - Active Operational CRUD Store   |  |  - Multi-Carrier Text Alerts        |
|  - Write-Ahead Logging (WAL) Mode  |  |                                     |
|                                    |  |  [ OpenStreetMap Nominatim ]        |
|  [ Neon Serverless PostgreSQL ]    |  |  - Geocoding & Map Tile Services    |
|  - Compressed Gzip DB Snapshots    |  |                                     |
|  - Persistent Resident Identity    |  |  [ Open-Meteo Weather API ]         |
|  - Long-Term 35-Table Schema       |  |  - Real-Time Precipitation Telemetry|
+------------------------------------+  +-------------------------------------+
```
**Figure 4. Proposed System Architecture**

1. **Presentation Tier (Client Portals):**
   - *Resident Community Portal (`community.html`):* Responsive PWA for report intake, live map tracking, weather cards, and chatbot support.
   - *Admin SCADA Dashboard (`admin.html`):* Desktop- and mobile-optimized command console for report review, incident grouping, team dispatching, and analytics.
   - *Staff Field Portal (`staff.html`):* Mobile PWA for field linemen displaying assigned tickets, GPS confirmation, and evidence photo uploads.
2. **Application Tier (Node.js & Express Server):**
   - Hosted on Render.com cloud infrastructure.
   - Executes secure `scryptSync` password hashing and SHA-256 session verification.
   - Enforces Role-Based Access Control middleware (`requireRole('resident', 'personnel', 'utility', 'administrator')`).
   - Drives business logic: ETR computation (`etr.js`), reverse geocoding (`location-geocoder.js`), and bilingual NLP chatbot parsing (`chatbot.js`).
3. **Data and Storage Tier (Hybrid Persistence):**
   - *Operational CRUD Store (SQLite3):* Local `powerwatch.db` operating in WAL mode delivers sub-millisecond read/write latency.
   - *Cloud Persistence Store (Neon PostgreSQL):* Provides durable storage for resident authentication records and automated compressed database snapshots, ensuring zero data loss across Render dyno restarts.
4. **External Services Tier:**
   - *Semaphore SMS Gateway:* Dispatches automated text notifications to Philippine mobile subscribers.
   - *OpenStreetMap & Leaflet.js:* Renders interactive map pins, layers, and municipal boundary polygons.
   - *Open-Meteo Weather API:* Supplies live rainfall and wind velocity parameters consumed by the ETR engine.

---

### System Development Requirements

#### Hardware Requirements

| Requirement | Proposed Specification / Tool | Purpose / Justification |
|:---|:---|:---|
| **Development Computer** | AMD Ryzen 5 / Intel Core i5 (6 Cores), 16GB DDR4 RAM, 512GB NVMe SSD | Sufficient for running local Node.js test servers, automated test suites, and IDE workflows smoothly. |
| **Server / Hosting** | Render.com Web Service (Linux, Node.js 22 LTS, 512MB RAM) | Cloud host running the 24/7 web application, background daemons, and RESTful API endpoints. |
| **Cloud Database** | Neon Serverless PostgreSQL Cloud Instance | Provides durable storage for persistent resident credentials and compressed database snapshots. |
| **Mobile Client Test Units** | Android Smartphone (Android 11+) and Apple iPhone (iOS 15+) | Testing responsive layouts, mobile PWA installation, and GPS reporting accuracy. |
| **Desktop Test Station** | Windows 11 PC (1080p FHD Monitor) | Testing multi-column administrative SCADA dashboards, data tables, and GIS heatmaps. |

#### Software Requirements

| Requirement | Proposed Specification / Tool | Purpose / Justification |
|:---|:---|:---|
| **Operating System** | Windows 11 Pro (Development) / Linux Ubuntu 22.04 LTS (Production) | Primary development and cloud server execution operating environments. |
| **Frontend** | Semantic HTML5, CSS3, Modern JavaScript (ES6+) | Framework-free frontend ensuring minimal bundle sizes, ultra-fast loading, and broad browser compatibility. |
| **Backend / API** | Node.js (v22 LTS) with Express.js (v4.21) | Executes asynchronous business logic, REST API endpoints, and cryptographic security functions. |
| **Database** | SQLite3 (`node:sqlite` DatabaseSync) in WAL Mode & Neon Serverless PostgreSQL | Hybrid database architecture: fast local CRUD operations coupled with durable cloud persistence. |
| **Mapping Tools** | Leaflet.js (v1.9.4) and Leaflet.heat (v0.2.0) | Renders interactive map pins, layers, and outage heatmaps in the browser. |
| **File Upload Handling**| Multer (v2.4.0) with binary magic-byte verification | Securely processes and validates uploaded photo and video evidence. |
| **Third-Party APIs** | Semaphore SMS API and Open-Meteo Weather API | Powers automated text notifications and live weather data ingestion. |
| **Development Tools** | Visual Studio Code, Git, GitHub Actions, PowerShell 7 | Code editing, version control, automated testing, and deployment scripting. |

---

### Data Flow Diagram (DFD)

#### Context Diagram (Level 0)
The Context Diagram establishes the operational perimeter of Valencia PowerWatch, representing the application as a central software process interacting with four external entities:
* **Residents:** Submit outage reports, feedback ratings, and chatbot questions; receive ticket tracking updates, SMS notifications, and public advisories.
* **Field Linemen:** Receive repair assignments and purok GPS coordinates; send job stage updates, GPS arrival confirmations, and completion photos.
* **Utility Dispatchers / Administrators:** Receive incoming report queues, audit logs, and outage summaries; send incident groups, repair assignments, and official announcements.
* **External Services (Semaphore, OpenStreetMap, Open-Meteo):** Exchange geocoding telemetry, meteorological indices, and transactional SMS transmissions.

```
+-----------------------------------------------------------------------------+
|                                                                             |
|            FIGURE 5a: DATA FLOW DIAGRAM — CONTEXT DIAGRAM (LEVEL 0)         |
|                                                                             |
|    +-------------------+                       +---------------------+      |
|    |     RESIDENT      |                       |    FIELD LINEMEN    |      |
|    +-------------------+                       +---------------------+      |
|      │ Reports, Feedback                         │ Stage Updates,           |
|      │ Chat Inquiries                            │ Completion Photos        |
|      ▼                                           ▼                          |
|    +─────────────────────────────────────────────────────────────────+      |
|    │                                                                 │      |
|    │                 VALENCIA POWERWATCH SYSTEM                      │      |
|    │                     (PROCESS 0.0)                               │      |
|    │                                                                 │      |
|    +─────────────────────────────────────────────────────────────────+      |
|      ▲                                           ▲                          |
|      │ Verifications, Dispatch                   │ Telemetry, Alerts,       |
|      │ Admin Announcements                       │ Weather Parameters       |
|    +-------------------+                       +---------------------+      |
|    | UTILITY / ADMIN   |                       |  EXTERNAL SERVICES  |      |
|    +-------------------+                       +---------------------+      |
|                                                                             |
+-----------------------------------------------------------------------------+
```
**Figure 5a. Data Flow Diagram — Context Diagram (Level 0)**

#### Level 1 Data Flow Diagram
The Level 1 DFD decomposes the system into six core sub-processes:
* **Process 1.0 (Authentication & Roles):** Validates credentials against `users` and `resident_accounts`, creates SHA-256 hashed sessions, and enforces RBAC guards.
* **Process 2.0 (Report Intake & Geocoding):** Ingests reports, validates image uploads, queries OpenStreetMap Nominatim for reverse geocoding, and records tickets in `outage_reports`.
* **Process 3.0 (Incident Verification):** Allows dispatchers to review reports and combine them into master `outage_incidents`, linking records in `incident_links` and `incident_areas`.
* **Process 4.0 (Dispatch Management):** Manages crew assignments through `repair_teams` and logs stage progress in `repair_assignment_updates`.
* **Process 5.0 (ETR & Map Processing):** Calculates restoration estimates via `etr.js` and maps data against official Valencia barangay boundaries using Leaflet.js.
* **Process 6.0 (Alerts & Citizen Feedback):** Dispatches text alerts via `sms_logs`, pushes in-app notifications, and saves post-restoration ratings in `citizen_feedback`.

```
+-----------------------------------------------------------------------------+
|                                                                             |
|               FIGURE 5b: LEVEL 1 DATA FLOW DIAGRAM (DFD)                    |
|                                                                             |
|   [ Resident / User ]                                                       |
|           │                                                                 |
|           ▼                                                                 |
|   (1.0 Auth & RBAC) ──────► [ D1: Users & Sessions ]                        |
|           │                                                                 |
|           ▼                                                                 |
|   (2.0 Report Intake) ────► [ D2: Outage Reports & Attachments ]            |
|           │                                                                 |
|           ▼                                                                 |
|   (3.0 Verification) ─────► [ D3: Master Incidents & Links ]                |
|           │                                                                 |
|           ▼                                                                 |
|   (4.0 Field Dispatch) ───► [ D4: Repair Teams & Assignments ]              |
|           │                                                                 |
|           ▼                                                                 |
|   (5.0 ETR & GIS Map) ────► [ D5: Barangays & Geocodes ]                    |
|           │                                                                 |
|           ▼                                                                 |
|   (6.0 Alerts & Rating) ──► [ D6: SMS Logs & Citizen Feedback ]             |
|                                                                             |
+-----------------------------------------------------------------------------+
```
**Figure 5b. Level 1 Data Flow Diagram (DFD) of the Proposed System**

---

### Entity Relationship Diagram (ERD)

The operational database schema contains **26 relational tables** in SQLite, mapped to an expanded **35-table normalized schema** deployed in Neon Serverless PostgreSQL for long-term scalability. 

The principal operational entities and their cardinalities are structured as follows:

1. **`users`:** Stores system accounts, contact numbers, `password_hash`, role types (`resident`, `personnel`, `utility`, `administrator`), and timestamps.
   - *1-to-many* with `sessions` (one user holds multiple session tokens).
   - *1-to-many* with `outage_reports` (as `reporter_id`).
   - *1-to-many* with `audit_logs` (recording user activities).
2. **`barangays`:** Contains official reference records for Valencia City's 31 barangays, polygon center-points, and geographic bounds.
   - *1-to-many* with `outage_reports` and `incident_areas`.
3. **`outage_reports`:** Stores individual citizen tickets (`VPR-XXXX`), GPS coordinates, barangay, purok, reported fault classification, and status (`Submitted`, `Verified`, `In Progress`, `Resolved`, `Rejected`).
   - *1-to-many* with `report_attachments` (photo/video evidence).
   - *1-to-many* with `report_status_history` (audit trail of status transitions).
   - *Many-to-1* with `outage_incidents` via foreign key `incident_id` and the `incident_links` junction table.
4. **`outage_incidents`:** Authoritative master incident records (`OUT-XXXX`) generated by dispatchers, storing priority ratings, affected consumer counts, and calculated ETR timestamps.
   - *Many-to-many* with `barangays` through the `incident_areas` table.
   - *1-to-many* with `repair_assignments`.
5. **`repair_teams`:** Stores operational field maintenance crews, lead technicians, contact numbers, and vehicle identifiers.
   - *1-to-many* with `repair_assignments`.
   - *1-to-many* with `staff_team_members`.
6. **`repair_assignments`:** Tracks work orders dispatched to teams, storing target puroks, dispatch timestamps, and completion records.
   - *1-to-many* with `repair_assignment_evidence` (post-repair completion photos).
   - *1-to-many* with `repair_assignment_updates` (chronological stage logs).
   - *1-to-many* with `repair_assignment_location_confirmations` (technician GPS arrival logs).
7. **`citizen_feedback`:** Captures 1-to-5 star ratings and qualitative comments submitted by reporting residents after service restoration.
8. **`sms_logs`:** Maintains a permanent audit log of outbound text alert payloads, recipient telephone numbers, and Semaphore API gateway delivery responses.
9. **`neon_snapshots`:** Supporting cloud persistence infrastructure (`app_snapshots`, `app_snapshots_backup`, `app_snapshot_files`, `resident_accounts`, `resident_sessions`) deployed in Neon PostgreSQL to ensure zero data loss during cloud dyno sleep cycles.

```
+-----------------------------------------------------------------------------+
|                                                                             |
|            FIGURE 6: ENTITY RELATIONSHIP DIAGRAM (ERD)                      |
|                                                                             |
|   +---------------+ 1       * +------------------+                          |
|   |     USERS     |──────────<|     SESSIONS     |                          |
|   +---------------+           +------------------+                          |
|           │ 1                                                               |
|           │                                                                 |
|           │ *                                                               |
|   +---------------+ 1       * +------------------+                          |
|   | OUTAGE_REPORTS|──────────<|REPORT_ATTACHMENTS|                          |
|   +---------------+           +------------------+                          |
|           │ *                         │ 1                                   |
|           │                           │                                     |
|           │ *                         │ *                                   |
|   +---------------+ 1       * +------------------+                          |
|   |INCIDENT_LINKS |──────────<| OUTAGE_INCIDENTS |                          |
|   +---------------+           +------------------+                          |
|                                       │ 1                                   |
|                                       │                                     |
|                                       │ *                                   |
|   +---------------+ 1       * +------------------+                          |
|   | REPAIR_TEAMS  |──────────<|REPAIR_ASSIGNMENTS|                          |
|   +---------------+           +------------------+                          |
|                                       │ 1                                   |
|                                       │                                     |
|                                       │ *                                   |
|                               +------------------+                          |
|                               | ASSIGNMENT_LOGS  |                          |
|                               +------------------+                          |
|                                                                             |
+-----------------------------------------------------------------------------+
```
**Figure 6. Entity Relationship Diagram (ERD) of the Proposed System**

---

# REFERENCES

Al-Dmour, N. A., Masa’deh, R., & Obeidat, B. Y. (2020). The role of mobile short message service (SMS) in emergency and crisis management: A systematic literature review. *International Journal of Interactive Mobile Technologies*, 14(18), 4–22. https://doi.org/10.3991/ijim.v14i18.15674

Biørn-Hansen, A., Majchrzak, T. A., & Grønli, T. M. (2020). Progressive web apps: The definitive guide to next-generation mobile applications. *IEEE Computer*, 53(4), 44–54. https://doi.org/10.1109/MC.2020.2972704

Brown, R. E. (2008). *Electric power distribution reliability* (2nd ed.). CRC Press. https://doi.org/10.1201/9781420058451

Carter, L., & Belanger, F. (2005). The utilization of e-government services: Citizen trust, innovation and acceptance factors. *Information Systems Journal*, 15(1), 5–25. https://doi.org/10.1111/j.1365-2575.2005.00183.x

City of Bloomington. (n.d.). *uReport: Constituent relationship management system* [Computer software]. GitHub. https://github.com/City-of-Bloomington/uReport

Coster, E. J., Myrzik, J. M., Kruimer, B., & Kling, W. L. (2011). Integration issues of distributed generation in distribution grids. *Proceedings of the IEEE*, 99(1), 28–39. https://doi.org/10.1109/JPROC.2010.2072780

Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. *MIS Quarterly*, 13(3), 319–340. https://doi.org/10.2307/249008

DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. *Journal of Management Information Systems*, 19(4), 9–30. https://doi.org/10.1080/07421222.2003.11045748

Esri. (n.d.). *What is ArcGIS Survey123?* ArcGIS documentation. Retrieved October 26, 2026, from https://doc.arcgis.com/en/survey123/get-started/whatissurvey123.htm

Farhangi, H. (2010). The path of the smart grid. *IEEE Power and Energy Magazine*, 8(1), 18–28. https://doi.org/10.1109/MPE.2009.934876

Fernandez, G., Ahmed, B., & Shaw, R. (2020). Urban disaster risk reduction and civic crowdsourcing in Metro Manila: Critical reflections. *International Journal of Disaster Risk Reduction*, 48, 101588. https://doi.org/10.1016/j.ijdrr.2020.101588

Goodchild, M. F. (2007). Citizens as sensors: The world of volunteered geography. *GeoJournal*, 69(4), 211–221. https://doi.org/10.1007/s10708-007-9111-y

Haklay, M. (2010). How good is volunteered geographical information? A comparative study of OpenStreetMap and Ordnance Survey datasets. *Environment and Planning B: Planning and Design*, 37(4), 682–703. https://doi.org/10.1068/b35097

ISO/IEC. (2011). *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models* (ISO/IEC Standard No. 25010:2011). https://www.iso.org/standard/35733.html

Ji, C., Wei, Y., & Mei, F. (2016). Outage duration prediction in power distribution systems using ensemble machine learning. *IEEE Transactions on Smart Grid*, 7(3), 1332–1341. https://doi.org/10.1109/TSG.2015.2443808

Kezunovic, M., Dong, Z., & Guan, X. (2012). Smart grid data analytics for enhanced operational awareness. *IEEE Transactions on Smart Grid*, 3(3), 1246–1257. https://doi.org/10.1109/TSG.2012.2198083

Malavolta, I., Chinnappan, K., & Swanborn, M. (2017). End-user perception of progressive web apps: An empirical study. In *Proceedings of the 13th International Conference on Web Engineering* (pp. 340–358). Springer. https://doi.org/10.1007/978-3-319-60131-1_21

mySociety. (2013, January 17). *Open311 explained*. Retrieved October 26, 2026, from https://www.mysociety.org/2013/01/17/open311-explained/

Offenhuber, D. (2014). Visual governance: Public displays, 311 systems, and the new discipline of municipal feedback loops. *Information, Communication & Society*, 17(7), 884–901. https://doi.org/10.1080/1369118X.2013.856920

Open311. (n.d.). *Open311: Collaborative civic issue tracking*. Retrieved October 26, 2026, from https://www.open311.org/

OWASP. (2021). *OWASP Top 10: 2021 web application security risks*. Open Web Application Security Project. https://owasp.org/Top10/

Republic of the Philippines. (2012). *Data Privacy Act of 2012* (Republic Act No. 10173). Official Gazette of the Republic of the Philippines. https://www.officialgazette.gov.ph/2012/08/15/republic-act-no-10173/

Richey, R. C., & Klein, J. D. (2007). *Design and development research: Methods, strategies, and issues*. Lawrence Erlbaum Associates.

Sandhu, R. S., Coyne, E. J., Feinstein, H. L., & Youman, C. E. (1996). Role-based access control models. *IEEE Computer*, 29(2), 38–47. https://doi.org/10.1109/2.485845

Venkatesh, V., & Davis, F. D. (2000). A theoretical extension of the Technology Acceptance Model: Four longitudinal field studies. *Management Science*, 46(2), 186–204. https://doi.org/10.1287/mnsc.46.2.186.11926
