# Valencia PowerWatch: Capstone Proposal Presentation Guide & Summary
**System Title:** Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon  
**Audience:** Panelists, Advisers, and Stakeholders  

---

## 1. 🎯 1-Minute Elevator Pitch (Pambungad nga Pailaila)
> *"Maayong adlaw sa atong mga tinahod nga panelist. Ang among proposed system gi-ulohan og **Valencia PowerWatch: Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon**.*  
> *Kini usa ka modernong digital platform nga nagsumpay sa mga residente sa Valencia City ug sa power utility management aron mapadali ang pag-report, pag-verify, ug pag-monitor sa mga brownout pinaagi sa real-time interactive mapping ug mobile technology."*

---

## 2. ⚠️ Background & Problem Statement (Ang Problema)
* **Karon nga Sitwasyon:** Kung mag-brownout sa Valencia City, ang mga residente magsalig ra sa pagtawag sa busy nga hotline, mag-comment sa Facebook page nga dili ma-track, o mag-antos sa paghulat nga walay klarong opisyal nga update.
* **Problema sa mga Residente:**
  1. Dili makabalo kung scheduled brownout ba o naay emergency nga guba o aksidente sa linya.
  2. Walay sayon nga paagi sa pag-report sa ilang eksaktong lokasyon o guba nga poste ug transformer.
* **Problema sa Power Utility & Linemen:**
  1. Nagkatag ug nagbalik-balik ang mga reklamo sa social media nga lisod kolektahon ug i-track.
  2. Dugay matultolan ang eksaktong dapit sa naguba nga linya kay walay GPS coordinates.
  3. Walay centralized visual dashboard nga nagpakita kung asang mga barangay ang labing apektado.

---

## 3. 💡 Proposed Solution (Ang Valencia PowerWatch)
Ang **Valencia PowerWatch** naghatag og duha (2) ka integrated nga portal nga nagkonektar sa usa ka sentral nga database:
1. **User / Community Mobile App (PWA):**  
   Usa ka installable application para sa cellphone sa mga residente diin makapa-abot dayon sila og brownout report gamit ang interactive GPS Map sulod lang sa pipila ka segundo.
2. **Administrator & Utility Dispatch Portal:**  
   Usa ka secured web dashboard para sa mga enhinyero ug opisyales aron makita ang Outage GIS Heatmap, ma-verify ang mga insidente, ug makapadala dayon og maintenance crew.

---

## 4. 👥 Target Users (Kinsa ang Mogamit)
| User Role | Gamit sa Sistema |
| :--- | :--- |
| **Mga Residente (Community)** | Mag-report og brownout gamit ang GPS Pinpoint, mag-monitor sa live status sa restoration, ug magbasa sa official emergency advisories. |
| **Utility Engineers / Linemen** | Mo-dawat sa verified dispatch, mosusi sa teknikal nga guba sa field, ug mo-update sa repair status padulong sa "Resolved". |
| **System Administrator / LGU** | Mo-dumala sa user accounts, magpagawas og emergency advisories, mag-monitor sa GIS heatmap, ug mag-generate og official incident reports. |

---

## 5. 🧩 Kompleto nga mga Modules sa Sistema (User Side ug Admin Side)

### A. MGA MODULES SA USER / COMMUNITY SIDE (MOBILE APP - PWA)
1. **Home & City Grid Dashboard Module:** Real-time city power status (Power Grid Health, Active Outages, Restored lines), Live Weather Monitoring (temperature, rain, thunderstorm warnings para sa Valencia City), Quick 1-Tap Outage Report button, ug Latest Emergency Advisories carousel.
2. **Outage Reporting & GPS Pinpointing Module:** Interactive Leaflet map GPS picker (makapili sa eksaktong balay o poste), 31 ka barangay directory, Outage Severity categorization (Total Blackout, Low Voltage / Fluctuating, Line Down / Sparking Transformer), Photo evidence upload, ug **Offline Report Queue** (mag-save kung mawad-an og cellular signal sa bagyo ug mo-auto upload inig balik sa signal).
3. **Interactive Outage Map Module:** Real-time GIS interactive map nga may color-coded pins (Pending, Verified, Repairing, Restored) ug dynamic Outage Heatmap.
4. **Notifications & Incident Tracker Module:** Real-time ticket status tracking (`Submitted` ➔ `Verified` ➔ `Linemen Dispatched` ➔ `Restored`) ug scheduled maintenance power interruption alerts.
5. **User Profile & Settings Module:** Personal details, contact number, home barangay, ug notification alert preferences.
6. **PWA Standalone Mobile Installation Module (`/install`):** Play Store-styled app landing page nga may 1-tap installer diretso sa Android Home Screen ug App Drawer (walay browser URL bar).

### B. MGA MODULES SA ADMINISTRATOR & UTILITY MANAGEMENT SIDE (WEB PORTAL)
1. **Executive Dashboard Module:** Real-time KPIs (Active Outages, Reports Today, Mean Time to Restore [MTTR], Verification Accuracy Rate), City Grid Health meter, ug Live Incident Activity stream.
2. **Citizen Reports Management Module:** Centralized repository sa tanang report gikan sa mga cellphone sa residente nga may filters base sa Barangay, Status, Petsa, Severity, report details modal (GPS coordinates, citizen contact info, litrato), ug automatic duplicate grouping.
3. **Technical Verification & Triage Module:** Pagsusi sa mga enhinyero aron mapugngan ang false alarms (1-click actions: Verify & Escalate, Reject with Reason, o Merge to Existing Incident).
4. **Incidents & Linemen Dispatch Module:** Pag-organisar sa official field repairs, pag-dispatch og crews sa specific feeders/barangays, ug stage progression tracker.
5. **Smart Outage Clustering Module:** Spatial intelligence algorithm nga awtomatikong mag-grupo sa 3 o labaw pa nga reports sulod sa 500 meters aron ma-isolate dayon ang guba nga transformer o feeder fault.
6. **Dispatch GIS Mapping Workstation Module:** Fullscreen GIS workstation nga may dynamic Outage Heatmap layer, feeder line overlays, ug satellite view.
7. **Scheduled Outages & Maintenance Planner Module:** Calendar planner sa preventive maintenance, pagpili sa apektadong barangays/feeders, ug automatic broadcast notification sa mga residente.
8. **Public Announcements & Emergency Advisories Module:** Paspas nga pagpagawas og official typhoon advisories, grid alerts, ug safety reminders nga may priority tags.
9. **Targeted Notifications Dispatcher Module:** Direct alert broadcasting per barangay o city-wide.
10. **Outage History & Audit Archive Module:** Historical logs sa tanang nangaging brownout nga may date-range filtering ug exportable spreadsheet logs.
11. **User Management & Role-Based Access Control Module:** Strict security layers tali sa System Administrator, Utility Engineer, Dispatch Staff, ug Resident.
12. **Valencia City Barangays Directory Module:** Direktoryo sa tanang 31 ka barangay sa Valencia City, assigned substation feeders, ug hotlines.
13. **Analytics, Reliability Indices & Official Report Generator Module:** Awtomatikong pagkwenta sa grid reliability metrics (SAIFI ug SAIDI), hotspot analysis, ug **1-Click Printable Incident PDF Report Generator** para sa City Hall ug management meetings.
14. **Tamper-Proof Audit Trail Module:** Kompleto nga logging sa tanang lihok sa admin (kinsa, kanus-a, unsa nga aksyon, ug IP address).
15. **System Configuration & Settings Module:** Logo branding, emergency contact hotlines, ug database backups.

---

## 6. 🔄 System Workflow (Giunsa Pagdagan sa Datos)
1. **Paghimo og Report:** Ang residente mag-abli sa app sa ilang phone ug mo-submit og report nga naay GPS coordinates, barangay, litrato, ug detalye sa blackout.
2. **Sentral nga Pagtipig:** Ang report moagi sa secure HTTPS connection ug mosulod diretso sa Central SQLite Database (`data/powerwatch.db`).
3. **Pagsusi ug Dispatch:** Motungha dayon ang report sa dashboard sa Admin. Makita kini sa GIS Heatmap, i-verify sa Engineer, ug i-dispatch ang maintenance crew.
4. **Restoration & Notification:** Inig kaayo sa linya, i-mark sa Admin ang insidente isip "Resolved", ug makadawat dayon og status update ang tanang residente sa ilang phone.

---

## 7. 🌟 Benefits & Limitations
* **Mga Kaayohan (Benefits):** Paspas nga response time; Transparency sa publiko; Data-driven planning para sa City Hall ug Utility upgrades.
* **Mga Limitasyon (Limitations):** Nagkinahanglan og data/Wi-Fi connection para sa live upload (bisan naay offline queue); Crowdsourced citizen data (nasulbad pinaagi sa Admin Verification triage); Nakatutok sa 31 ka barangay sa Valencia City, Bukidnon.

---

## 8. 🎯 Top 5 Anticipated Panel Questions & Best Answers
* **Q1: Ngano nga PWA (Progressive Web App) inyong gigamit ug dili native APK sa Google Play Store?**  
  *Tubag:* Mas gaan, dali i-deploy, ug accessible sa tanang klase sa cellphone. Dili na kinahanglan mag-download og bug-at nga file o magbayad sa Play Store. I-scan lang ang QR code, ma-install na dayon kini sa home screen ug app drawer sulod sa 5 ka segundo.
* **Q2: Unsaon ninyo pagpugong kung naay mag-binuang o mag-spam og fake reports?**  
  *Tubag:* Kinahanglan mag-register ang user nga may tinuod nga contact number. Naa pud tay Smart Clustering sa mapa—kung usa ra ka tawo ang nag-report unya ang tibuok silingan walay report, makit-an dayon sa Admin. Dili dayon ma-post sa public status hangtod dili ma-verify sa engineer.
* **Q3: Unsaon kung mawad-an og cellular signal samtang nag-bagyo?**  
  *Tubag:* Gibutangan namo ang sistema og Offline Report Queue gamit ang Service Worker ug local cache. Makahimo gihapon ang residente sa pag-fill up sa report bisan walay internet. Inig balik sa signal o data, awtomatiko kining i-sync ug i-upload sa server.
* **Q4: Unsay kalainan niini sa Facebook page sa utility company karon?**  
  *Tubag:* Sa Facebook, magkatag ang reklamo sa comment section ug walay GPS coordinates o status tracking. Sa among sistema, structured ang datos: naay database, naay heatmap, naay timestamp, ug naay opisyal nga ticket status.
* **Q5: Asa gitipigan ang mga datos ug unsaon pag-seguro niini?**  
  *Tubag:* Gitipigan ang tanang impormasyon sa usa ka Centralized Database gamit ang SQLite/Relational Database nga may session security ug access restrictions tali sa Admin ug Residente.
