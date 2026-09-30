# Valencia PowerWatch: Capstone Proposal Presentation Guide & Summary
**System Title:** Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon  
**Audience:** Panelists, Advisers, and Stakeholders  

---

## 1. 🎯 1-Minute Elevator Pitch (Pambungad nga Pailaila)
> *"Maayong adlaw sa atong mga tinahod nga panelist. Ang among proposed system gi-ulohan og **Valencia PowerWatch: Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon**.*  
> *Kini usa ka modernong digital platform nga nagsumpay sa mga residente sa Valencia City ug sa power utility management aron mapadali ang pag-report, pag-verify, ug pag-monitor sa mga brownout pinaagi sa real-time interactive mapping ug mobile technology."*

---

## 2. ⚠️ Background & Problem Statement (Ang Problema)
* **Karon nga Sitwasyon:** Kung mag-brownout sa Valencia City, ang mga residente magsalig sa pagtawag sa busy nga hotline, mag-comment sa Facebook, o mag-antos sa paghulat nga walay klarong impormasyon.
* **Problema sa Residente:**
  1. Dili makabalo kung scheduled ba ang brownout o emergency blackout.
  2. Walay sayon nga paagi sa pag-report sa ilang eksaktong lokasyon o guba nga transformer/poste.
* **Problema sa Utility / Linemen:**
  1. Nagkatag ug nagbalik-balik ang mga reklamo sa social media nga lisod i-track.
  2. Dugay matultolan ang eksaktong lokasyon sa naguba nga linya.
  3. Walay centralized visual dashboard nga nagpakita asa dapit nga barangay ang labing apektado.

---

## 3. 💡 Proposed Solution (Ang Solusyon: Valencia PowerWatch)
Ang **Valencia PowerWatch** naghatag og duha ka integrated nga sistema nga konektado sa usa ka sentral nga database:
1. **User / Community Mobile App (PWA):**  
   Usa ka installable mobile application para sa mga residente diin makapa-abot sila og brownout report gamit ang GPS Pinpoint Map sulod sa pipila ka segundo.
2. **Administrator & Utility Dispatch Dashboard:**  
   Usa ka secured web portal para sa mga enhinyero ug opisyales aron makita ang GIS Outage Heatmap, ma-verify ang mga insidente, ug makapahibalo sa publiko.

---

## 4. 👥 Target Users (Kinsa ang Mogamit)
| User Role | Gamit sa Sistema |
| :--- | :--- |
| **Residente (Community)** | Mag-report og brownout gamit ang GPS, magtan-aw sa live status sa restoration, ug magbasa sa official advisories. |
| **Utility Engineers / Linemen** | Mo-dawat sa verified dispatch, mosusi sa teknikal nga guba, ug mo-update sa repair status gikan sa field. |
| **System Administrator / LGU** | Mo-dumala sa accounts, magpagawas og emergency advisories, mag-monitor sa GIS heatmap, ug mag-generate og official reports. |

---

## 5. 🧩 Key Modules & Features (Mga Parte sa Sistema)

### A. Community Portal (Mobile PWA)
* **1-Tap GPS Pinpoint Reporting:** Makapili og Barangay ug maka-pinpoint sa eksaktong lokasyon sa balay o poste sa interactive Leaflet map.
* **Offline Report Queue:** Kung mapalong ang signal tungod sa bagyo, i-save sa app ang report ug awtomatikong i-upload inig balik sa koneksyon.
* **Real-time Incident Tracking:** Makit-an sa user kung ang ilang report kay `Pending`, `Verified`, `Dispatched`, o `Resolved`.
* **Official Advisories & Scheduled Interruptions:** Dili na kinahanglan maghulat sa chismis; naay opisyal nga advisory gikan sa utility office.

### B. Admin & Management Portal
* **Live Incident Management:** Listahan sa tanang bag-ong report nga puwede i-filter base sa Barangay o status.
* **GIS Heatmap & Smart Clustering:** Makit-an sa mapa kung asa nagtapok ang mga brownout aron mahibal-an dayon kung tibuok feeder o transformer ang naguba.
* **Audit-Ready Printable Reports:** 1-click generation sa opisyal nga incident report para sa dokumentasyon ug meeting sa city hall.
* **Role-Based Security:** Ang resident accounts dili makasulod sa Admin portal.

---

## 6. 🔄 System Workflow (Giunsa Pagdagan sa Datos)
1. **Paghimo og Report:** Ang residente mag-abli sa app sa ilang phone ug mo-submit og report nga naay GPS coordinates ug detalye sa blackout.
2. **Sentral nga Pagtipig:** Ang report moagi sa Cloudflare/Internet ug mosulod diretso sa **Central SQLite Database (`data/powerwatch.db`)**.
3. **Pagsusi sa Admin:** Motungha dayon ang report sa dashboard sa Admin. Makita kini sa GIS Heatmap ug i-dispatch ang maintenance crew.
4. **Restoration & Update:** Inig kaayo sa linya, i-mark sa Admin ang insidente isip `Resolved`, ug makadawat dayon og update ang tanang residente sa ilang phone.

---

## 7. 🌟 Benefits & Significance (Kaayohan sa Sistema)
* **Sa Residente:** Adunay tingog ug transparent nga update kung kanus-a mabalik ang kuryente.
* **Sa Power Utility / Linemen:** Maminusan ang response time kay eksakto ang GPS coordinates sa guba nga linya; dili na magtagna-tagna asa dapit.
* **Sa LGU / Siyudad sa Valencia:** Makahipos og historical data aron mahibal-an kung asang mga barangay ang nanginahanglan og upgrade sa kable ug transformer.

---

## 8. ⚠️ Limitations (Mga Limitasyon nga Kinahanglan Isulti sa Panel)
1. **Kinahanglan og Internet para sa Live Sync:** Bisan naay offline report queue, kinahanglan gihapon og data o Wi-Fi aron maabot ang report sa Admin.
2. **Citizen-Driven (Crowdsourced):** Ang datos naggikan sa report sa tawo, dili sa automated smart hardware sensor nga nakataod sa poste (apan nasulbad kini pinaagi sa Admin Verification module).
3. **Scope sa Lokasyon:** Gi-disenyo kining maong prototype para lamang sa 31 ka barangay sa Valencia City, Bukidnon.

---

## 9. 🎓 Top 5 Anticipated Panel Questions & Model Answers

### Q1: *"Ngano nga Web / PWA man ang inyong gigamit imbes nga i-upload sa Google Play Store?"*
> **Tubag:** *"Sir/Ma'am, among gigamit ang **Progressive Web App (PWA)** technology tungod kay mas paspas ug accessible kini para sa tanang residente. Dili na kinahanglan mag-download og bug-at nga 50MB APK o magsalig sa Play Store approval. Pinaagi sa QR code o link, ma-install dayon kini sa ilang home screen ug app drawer sulod sa 5 ka segundo, ug mo-gana bisan unsa pa ang brand o OS sa ilang cellphone."*

### Q2: *"Unsaon ninyo pagpugong sa Fake Reports o Spam?"*
> **Tubag:** *"Una, kinahanglan mag-register ang user nga naay verified contact number ug account. Ikaduha, ang sistema naggamit og **Smart Clustering**—kung usa ra ka tawo ang nag-report unya ang tibuok silingan walay report, makit-an kini sa Admin. Ikatulo, dili dayon ma-post sa public status ang report hangtod dili ma-verify sa utility engineer."*

### Q3: *"Unsaon kung mawad-an og signal ang residente samtang nag-bagyo?"*
> **Tubag:** *"Gibutangan namo ang sistema og **Offline Report Queue** gamit ang Service Worker ug local cache. Makahimo gihapon ang residente sa pag-fill up sa report bisan walay internet. Inig balik sa signal o data, awtomatiko kining i-sync ug i-upload sa server."*

### Q4: *"Unsay kalainan niini sa Facebook page diin nag-post ang utility company karon?"*
> **Tubag:** *"Sa Facebook, magkatag ang reklamo sa comment section ug dili ma-filter base sa GPS o barangay. Sa among sistema, structured ang data: naay database, naay heatmap, naay timestamp, ug naay status tracker nga dili masagol sa ubang posts."*

### Q5: *"Asa gitipigan ang mga datos ug unsaon pag-seguro niini?"*
> **Tubag:** *"Gitipigan ang tanang impormasyon sa usa ka **Centralized Database** nga protektado og session-based authentication ug password hashing. Ang Admin portal kay naka-separate og access restriction aron walay ordinaryong user nga makapangusab sa datos."*
