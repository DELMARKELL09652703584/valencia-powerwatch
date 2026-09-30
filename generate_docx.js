const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType
} = require('docx');

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: [
        // Title
        new Paragraph({
          text: "Valencia PowerWatch",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon",
              bold: true,
              italics: true,
              size: 22,
              color: "073C68"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Comprehensive Proposal Defense Guide, System Architecture, & Panel Q&A Script",
              size: 20,
              color: "555555"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),

        // Section 1
        new Paragraph({
          text: "1. 1-Minute Elevator Pitch (Pambungad sa Panel)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "“Maayong adlaw sa atong mga tinahod nga panelist. Ang among proposed system gi-ulohan og Valencia PowerWatch: Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon.\n\nKini usa ka modernong digital platform nga nagsumpay sa mga residente sa Valencia City ug sa power utility management aron mapadali ang pag-report, pag-verify, ug pag-monitor sa mga brownout pinaagi sa real-time interactive mapping ug mobile technology.”",
              italics: true,
              size: 22
            })
          ],
          spacing: { after: 240 }
        }),

        // Section 2
        new Paragraph({
          text: "2. Background & Main Problem Statement (Ang Problema sa Valencia City)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Karon nga Sitwasyon: ",
              bold: true
            }),
            new TextRun("Kung mag-brownout sa Valencia City, ang mga residente magsalig ra sa pagtawag sa busy nga hotline, mag-comment sa Facebook page nga dili ma-track, o mag-antos sa paghulat nga walay klarong opisyal nga advisory.")
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Problema sa mga Residente:\n", bold: true }),
            new TextRun("   1. Dili makabalo kung scheduled brownout ba o naay emergency nga guba o aksidente sa kable.\n"),
            new TextRun("   2. Walay sayon nga paagi sa pag-report sa ilang eksaktong lokasyon o guba nga poste ug transformer.")
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Problema sa Power Utility & Linemen:\n", bold: true }),
            new TextRun("   1. Nagkatag ug nagbalik-balik ang mga reklamo sa social media nga lisod kolektahon ug i-track.\n"),
            new TextRun("   2. Dugay matultolan ang eksaktong dapit sa naguba nga linya kay walay GPS coordinates.\n"),
            new TextRun("   3. Walay centralized visual dashboard nga nagpakita kung asang mga barangay ang labing apektado.")
          ],
          spacing: { after: 240 }
        }),

        // Section 3
        new Paragraph({
          text: "3. Proposed Solution (Ang Valencia PowerWatch)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          text: "Ang Valencia PowerWatch naghatag og duha (2) ka integrated nga portal nga nagkonektar sa usa ka sentral nga database:",
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "1. User / Community Mobile App (PWA): ", bold: true }),
            new TextRun("Usa ka installable application para sa cellphone sa mga residente diin makapa-abot dayon sila og brownout report gamit ang interactive GPS Map sulod lang sa pipila ka segundo.")
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "2. Administrator & Utility Dispatch Portal: ", bold: true }),
            new TextRun("Usa ka secured web dashboard para sa mga enhinyero ug opisyales aron makita ang Outage GIS Heatmap, ma-verify ang mga insidente, ug makapadala dayon og maintenance crew.")
          ],
          spacing: { after: 240 }
        }),

        // Section 4
        new Paragraph({
          text: "4. Target Users (Kinsa ang Mogamit)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Role", bold: true })] })],
                  shading: { fill: "E2E8F0", type: ShadingType.CLEAR }
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "Deskripsyon ug Gamit sa Sistema", bold: true })] })],
                  shading: { fill: "E2E8F0", type: ShadingType.CLEAR }
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Mga Residente (Community)")] }),
                new TableCell({ children: [new Paragraph("Mag-report og brownout gamit ang GPS Pinpoint, mag-monitor sa live status sa restoration, ug magbasa sa official emergency advisories.")] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Utility Engineers / Linemen")] }),
                new TableCell({ children: [new Paragraph("Mo-dawat sa verified dispatch, mosusi sa teknikal nga guba sa field, ug mo-update sa repair status padulong sa 'Resolved'.")] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("System Administrator / LGU")] }),
                new TableCell({ children: [new Paragraph("Mo-dumala sa user accounts, magpagawas og emergency advisories, mag-monitor sa GIS heatmap, ug mag-generate og official incident reports.")] })
              ]
            })
          ]
        }),
        new Paragraph({ text: "", spacing: { after: 240 } }),

        // Section 5
        new Paragraph({
          text: "5. Key Modules & Features (Mga Parte sa Sistema)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "A. Para sa Residente (Community Mobile App):\n", bold: true, color: "073C68" }),
            new TextRun("• 1-Tap GPS Pinpoint Reporting: Makapili og Barangay ug maka-tudlo sa eksaktong lokasyon sa balay o poste sa interactive Leaflet map.\n"),
            new TextRun("• Offline Report Queue: Kung mapalong ang cellular signal panahon sa bagyo, i-save sa app ang report ug awtomatikong i-upload inig balik sa signal.\n"),
            new TextRun("• Real-time Incident Tracker: Makit-an sa user kung ang ilang report kay Pending, Verified, Dispatched, o Resolved.\n"),
            new TextRun("• Official Advisories & Announcements: Diretso sa phone ang mga schedule sa kuryente gikan sa utility office.")
          ],
          spacing: { after: 160 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "B. Para sa Admin & Utility Management:\n", bold: true, color: "073C68" }),
            new TextRun("• Live Incident Management: Listahan sa tanang bag-ong report nga puwede i-filter base sa Barangay, petsa, o status.\n"),
            new TextRun("• GIS Heatmap & Smart Clustering: Makit-an sa mapa kung asa nagtapok ang mga brownout aron mahibal-an dayon kung tibuok feeder o transformer ang naguba.\n"),
            new TextRun("• Printable Official Incident Reports: 1-click generation sa opisyal nga incident report para sa dokumentasyon ug meeting sa city hall.\n"),
            new TextRun("• Role-Based Security: Ang resident accounts dili makasulod sa Admin portal.")
          ],
          spacing: { after: 240 }
        }),

        // Section 6
        new Paragraph({
          text: "6. System Workflow (Giunsa Pagdagan sa Datos)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Step 1: Paghimo og Report – ", bold: true }),
            new TextRun("Ang residente mag-abli sa app sa ilang phone ug mo-submit og report nga naay GPS coordinates, barangay, ug detalye sa blackout.")
          ],
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Step 2: Sentral nga Pagtipig – ", bold: true }),
            new TextRun("Ang report moagi sa secure HTTPS connection ug mosulod diretso sa Central SQLite Database (data/powerwatch.db).")
          ],
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Step 3: Pagsusi ug Dispatch – ", bold: true }),
            new TextRun("Motungha dayon ang report sa dashboard sa Admin. Makita kini sa GIS Heatmap ug i-dispatch ang maintenance crew.")
          ],
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Step 4: Restoration & Notification – ", bold: true }),
            new TextRun("Inig kaayo sa linya, i-mark sa Admin ang insidente isip 'Resolved', ug makadawat dayon og status update ang tanang residente sa ilang phone.")
          ],
          spacing: { after: 240 }
        }),

        // Section 7
        new Paragraph({
          text: "7. Benefits & Significance (Mga Kaayohan)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun("• Paspas nga Response Time: Dili na magtagna-tagna ang linemen kung asa ang guba kay may eksaktong GPS coordinates ug Barangay.\n"),
            new TextRun("• Transparency: Makabalo ang publiko kung unsa na ang kahimtang sa pag-ayo sa kuryente.\n"),
            new TextRun("• Data-Driven Planning: Makatabang sa City Hall ug Utility nga mahibal-an kung asang mga linya ang karaan ug kinahanglan nang ilisan og bag-ong transformer.")
          ],
          spacing: { after: 240 }
        }),

        // Section 8
        new Paragraph({
          text: "8. Limitations (Mga Limitasyon)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun("1. Nagkinahanglan og Internet Connection: Bisan naay offline report queue ang app, kinahanglan gihapon og data o Wi-Fi aron maabot ang report sa opisina sa Admin.\n"),
            new TextRun("2. Citizen-Driven (Crowdsourced): Ang datos naggikan sa report sa mga tawo, dili gikan sa automated hardware sensor sa poste (apan nasulbad kini pinaagi sa Admin Verification module).\n"),
            new TextRun("3. Geographical Scope: Nakatutok kining maong prototype sa 31 ka barangay sa Valencia City, Bukidnon.")
          ],
          spacing: { after: 240 }
        }),

        // Section 9
        new Paragraph({
          text: "9. Top Anticipated Panel Questions & Best Answers",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Q1: Ngano nga PWA (Progressive Web App) inyong gigamit ug dili native APK gikan sa Google Play Store?\n", bold: true, color: "B45309" }),
            new TextRun({ text: "Tubag: ", bold: true }),
            new TextRun("Sir/Ma'am, ang PWA mas gaan, dali i-deploy, ug accessible sa tanang klase sa cellphone. Dili na kinahanglan mag-download og bug-at nga 50MB nga file o magbayad sa Google Play Store. I-scan lang ang QR code, ma-install na dayon kini sa ilang home screen ug app drawer sulod sa 5 ka segundo.")
          ],
          spacing: { after: 160 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Q2: Unsaon ninyo pagpugong kung naay mag-binuang o mag-spam og fake reports?\n", bold: true, color: "B45309" }),
            new TextRun({ text: "Tubag: ", bold: true }),
            new TextRun("Una, kinahanglan mag-register ang user nga may tinuod nga contact number. Ikaduha, ang sistema naggamit og Smart Clustering—kung usa ra ka tawo ang nag-report unya ang tibuok silingan walay report, makit-an kini dayon sa Admin. Ikatulo, dili dayon ma-post sa public status hangtod dili ma-verify sa engineer.")
          ],
          spacing: { after: 160 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Q3: Unsaon kung mawad-an og cellular signal samtang nag-bagyo?\n", bold: true, color: "B45309" }),
            new TextRun({ text: "Tubag: ", bold: true }),
            new TextRun("Gibutangan namo ang sistema og Offline Report Queue gamit ang Service Worker ug local cache. Makahimo gihapon ang residente sa pag-fill up sa report bisan walay internet. Inig balik sa signal o data, awtomatiko kining i-sync ug i-upload sa server.")
          ],
          spacing: { after: 160 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Q4: Unsay kalainan niini sa Facebook page sa utility company karon?\n", bold: true, color: "B45309" }),
            new TextRun({ text: "Tubag: ", bold: true }),
            new TextRun("Sa Facebook, magkatag ang reklamo sa comment section ug walay GPS coordinates o status tracking. Sa among sistema, structured ang datos: naay database, naay heatmap, naay timestamp, ug naay opisyal nga ticket status.")
          ],
          spacing: { after: 160 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Q5: Asa gitipigan ang mga datos ug unsaon pag-seguro niini?\n", bold: true, color: "B45309" }),
            new TextRun({ text: "Tubag: ", bold: true }),
            new TextRun("Gitipigan ang tanang impormasyon sa usa ka Centralized Database gamit ang SQLite/Relational Database nga may session security ug access restrictions tali sa Admin ug Residente.")
          ],
          spacing: { after: 240 }
        })
      ]
    }
  ]
});

const outputPath = path.join(__dirname, 'Valencia_PowerWatch_Proposal_Presentation_Guide.docx');

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log('Successfully created Word document at:', outputPath);
}).catch((err) => {
  console.error('Error creating docx:', err);
});
