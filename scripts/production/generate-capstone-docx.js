const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  TabStopType,
  LeaderType,
  ShadingType
} = require('docx');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_FILE = path.join(ROOT, 'docs', 'Valencia_PowerWatch_Chapters_1-3_Final.docx');
const DOWNLOADS_FILE = 'C:\\Users\\User\\Downloads\\Valencia_PowerWatch_Chapters_1-3_Final.docx';
const FLOWCHART_PATH = path.join(ROOT, 'docs', 'Valencia_PowerWatch_Official_System_Flowchart.jpg');

const FONT_NAME = 'Times New Roman';

function createPara(text, options = {}) {
  const {
    bold = false,
    italics = false,
    size = 24, // 12pt
    alignment = AlignmentType.JUSTIFIED,
    spaceBefore = 0,
    spaceAfter = 120, // 6pt
    lineSpacing = 360, // 1.5 lines
    indent = undefined,
    color = '000000'
  } = options;

  return new Paragraph({
    alignment,
    spacing: {
      before: spaceBefore,
      after: spaceAfter,
      line: lineSpacing
    },
    indent,
    children: [
      new TextRun({
        text,
        bold,
        italics,
        size,
        font: FONT_NAME,
        color
      })
    ]
  });
}

function createTocEntry(title, pageNum, options = {}) {
  const {
    bold = false,
    indent = 0,
    spaceBefore = 40,
    spaceAfter = 40,
    size = 22
  } = options;

  return new Paragraph({
    tabStops: [
      {
        type: TabStopType.RIGHT,
        position: 9360, // exact right margin for 8.5" with 1" margins
        leader: LeaderType.DOT
      }
    ],
    indent: indent > 0 ? { left: indent } : undefined,
    spacing: {
      before: spaceBefore,
      after: spaceAfter,
      line: 300
    },
    children: [
      new TextRun({
        text: title,
        bold,
        size,
        font: FONT_NAME
      }),
      new TextRun({
        text: '\t',
        bold,
        size,
        font: FONT_NAME
      }),
      new TextRun({
        text: String(pageNum),
        bold,
        size,
        font: FONT_NAME
      })
    ]
  });
}

function createHeading(text, level, options = {}) {
  const {
    alignment = AlignmentType.LEFT,
    spaceBefore = 240,
    spaceAfter = 120,
    size = 26,
    bold = true,
    italics = false,
    allCaps = false
  } = options;

  return new Paragraph({
    heading: level,
    alignment,
    spacing: {
      before: spaceBefore,
      after: spaceAfter,
      line: 360
    },
    children: [
      new TextRun({
        text: allCaps ? text.toUpperCase() : text,
        bold,
        italics,
        size,
        font: FONT_NAME,
        color: '000000'
      })
    ]
  });
}

function createFigureBox(figureNumber, title, imagePath = null) {
  const children = [];

  if (imagePath && fs.existsSync(imagePath)) {
    const imgData = fs.readFileSync(imagePath);
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 180, after: 120 },
        children: [
          new ImageRun({
            data: imgData,
            transformation: {
              width: 500,
              height: 320
            }
          })
        ]
      })
    );
  } else {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 360, after: 360 },
                    children: [
                      new TextRun({
                        text: `[ ${title.toUpperCase()} ]`,
                        italics: true,
                        size: 22,
                        font: FONT_NAME,
                        color: '555555'
                      })
                    ]
                  })
                ],
                shading: {
                  type: ShadingType.CLEAR,
                  fill: 'F5F7FA'
                },
                margins: { top: 200, bottom: 200, left: 200, right: 200 }
              })
            ]
          })
        ]
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 240 },
      children: [
        new TextRun({
          text: `Figure ${figureNumber}. `,
          bold: true,
          size: 22,
          font: FONT_NAME
        }),
        new TextRun({
          text: title,
          italics: true,
          size: 22,
          font: FONT_NAME
        })
      ]
    })
  );

  return children;
}

function createTable(headers, rows, colWidthsPct = [], alignments = []) {
  const tableRows = [];

  // Header row
  const headerCells = headers.map((headerText, i) => {
    return new TableCell({
      width: colWidthsPct[i] ? { size: colWidthsPct[i], type: WidthType.PERCENTAGE } : undefined,
      shading: {
        type: ShadingType.CLEAR,
        fill: 'EAEAEA'
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({
              text: headerText,
              bold: true,
              size: 20,
              font: FONT_NAME
            })
          ]
        })
      ],
      margins: { top: 120, bottom: 120, left: 140, right: 140 }
    });
  });

  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headerCells
    })
  );

  // Data rows
  rows.forEach((row) => {
    const dataCells = row.map((cellText, i) => {
      const align = alignments[i] || (i === 0 ? AlignmentType.LEFT : AlignmentType.JUSTIFIED);
      return new TableCell({
        width: colWidthsPct[i] ? { size: colWidthsPct[i], type: WidthType.PERCENTAGE } : undefined,
        children: [
          new Paragraph({
            alignment: align,
            spacing: { before: 60, after: 60, line: 280 },
            children: [
              new TextRun({
                text: cellText,
                size: 20,
                font: FONT_NAME
              })
            ]
          })
        ],
        margins: { top: 100, bottom: 100, left: 140, right: 140 }
      });
    });

    tableRows.push(new TableRow({ children: dataCells }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: tableRows
  });
}

function createReferencePara(authorYear, title, sourceInfo) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 120, line: 360 },
    indent: { left: 720, hanging: 720 }, // 0.5 inch hanging indent
    children: [
      new TextRun({ text: authorYear + ' ', font: FONT_NAME, size: 24 }),
      new TextRun({ text: title + ' ', font: FONT_NAME, size: 24, italics: true }),
      new TextRun({ text: sourceInfo, font: FONT_NAME, size: 24 })
    ]
  });
}

async function generateDocx() {
  console.log('Generating humanized, polished Valencia PowerWatch Capstone Document...');

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_NAME,
            size: 24,
            color: '000000'
          },
          paragraph: {
            spacing: {
              line: 360
            }
          }
        }
      }
    },
    sections: [
      // -------------------------------------------------------------
      // COVER PAGE
      // -------------------------------------------------------------
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        children: [
          createPara('ACLC COLLEGE OF BUKIDNON CAMPUS', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 26,
            spaceAfter: 40
          }),
          createPara('3535 TS. Fashion Bldg., Hagkol, Valencia City, Bukidnon', {
            alignment: AlignmentType.CENTER,
            size: 22,
            spaceAfter: 480
          }),

          createPara('[ INSERT ACLC COLLEGE LOGO HERE ]', {
            alignment: AlignmentType.CENTER,
            italics: true,
            size: 20,
            color: '666666',
            spaceAfter: 600
          }),

          createPara(
            'DESIGN AND DEVELOPMENT OF VALENCIA POWERWATCH: A MULTI-ROLE WEB- AND MOBILE-BASED COMMUNITY POWER INTERRUPTION REPORTING, VERIFICATION, AND INFORMATION MANAGEMENT SYSTEM FOR VALENCIA CITY, BUKIDNON',
            {
              alignment: AlignmentType.CENTER,
              bold: true,
              size: 26,
              spaceBefore: 300,
              spaceAfter: 600,
              lineSpacing: 380
            }
          ),

          createPara('A Capstone Project Proposal Presented to the Faculty of', {
            alignment: AlignmentType.CENTER,
            size: 22,
            spaceAfter: 40
          }),
          createPara('ACLC College of Bukidnon Campus', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 24,
            spaceAfter: 40
          }),
          createPara('Valencia City, Bukidnon', {
            alignment: AlignmentType.CENTER,
            size: 22,
            spaceAfter: 360
          }),

          createPara('In Partial Fulfilment of the', {
            alignment: AlignmentType.CENTER,
            size: 22,
            spaceAfter: 40
          }),
          createPara('Requirements for the Subject Capstone', {
            alignment: AlignmentType.CENTER,
            size: 22,
            spaceAfter: 40
          }),
          createPara('for the Degree of Bachelor of Science in Information Technology', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 24,
            spaceAfter: 480
          }),

          createPara('By', {
            alignment: AlignmentType.CENTER,
            size: 22,
            spaceAfter: 120
          }),
          createPara('Lui Gie Condiman Aguimbag', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 24,
            spaceAfter: 40
          }),
          createPara('Delmarkel Saro-ay', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 24,
            spaceAfter: 40
          }),
          createPara('Armirarin Suello', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 24,
            spaceAfter: 480
          }),

          createPara('Academic Year 2026-2027', {
            alignment: AlignmentType.CENTER,
            size: 22,
            spaceAfter: 40
          }),
          createPara('DECEMBER 2026', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 24,
            spaceAfter: 0
          })
        ]
      },

      // -------------------------------------------------------------
      // TABLE OF CONTENTS (WITH FLUSH-RIGHT DOT LEADERS)
      // -------------------------------------------------------------
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        children: [
          createHeading('TABLE OF CONTENTS', HeadingLevel.HEADING_1, {
            alignment: AlignmentType.CENTER,
            size: 28,
            bold: true,
            spaceBefore: 0,
            spaceAfter: 280
          }),

          // Chapter 1
          createTocEntry('Chapter 1. PROJECT AND ITS BACKGROUND', 3, { bold: true, size: 24, spaceBefore: 120 }),
          createTocEntry('Project Context', 3, { indent: 360 }),
          createTocEntry('Problem Statement', 4, { indent: 360 }),
          createTocEntry('Objectives of the Study', 5, { indent: 360 }),
          createTocEntry('Significance of the Study', 6, { indent: 360 }),
          createTocEntry('Scope and limitations', 7, { indent: 360 }),
          createTocEntry('Definition of Terms', 9, { indent: 360 }),

          // Chapter 2
          createTocEntry('Chapter 2. REVIEW OF RELATED LITERATURE AND STUDIES', 12, { bold: true, size: 24, spaceBefore: 160 }),
          createTocEntry('Related Literature', 12, { indent: 360 }),
          createTocEntry('Theoretical Frameworks in Technology Adoption and System Success', 12, { indent: 720 }),
          createTocEntry('Civic Reporting, Open311, and Citizen Participation', 14, { indent: 720 }),
          createTocEntry('Outage Management Systems and Distribution Grid Operations', 16, { indent: 720 }),
          createTocEntry('Geospatial Mapping and Location-Based Services in Public Utilities', 18, { indent: 720 }),
          createTocEntry('Progressive Web Applications in Low-Bandwidth Environments', 20, { indent: 720 }),
          createTocEntry('Multi-Channel Notifications and SMS Alerting in Emergency Response', 22, { indent: 720 }),
          createTocEntry('Role-Based Security and Privacy Protection in Municipal Portals', 24, { indent: 720 }),
          createTocEntry('Restoration Time Estimation and Heuristic Modeling', 26, { indent: 720 }),
          createTocEntry('Synthesis and Research Gap', 28, { indent: 360 }),

          // Chapter 3
          createTocEntry('Chapter 3. RESEARCH METHODOLOGY', 31, { bold: true, size: 24, spaceBefore: 160 }),
          createTocEntry('Research Setting', 31, { indent: 360 }),
          createTocEntry('Research Design', 32, { indent: 360 }),
          createTocEntry('Respondents and Sampling Technique', 33, { indent: 360 }),
          createTocEntry('Data Gathering and Research Instruments', 34, { indent: 360 }),
          createTocEntry('Statistical Treatment of Data', 35, { indent: 360 }),
          createTocEntry('System Development Methodology', 36, { indent: 360 }),
          createTocEntry('Methodology Phase Guide', 37, { indent: 360 }),
          createTocEntry('System Flow', 38, { indent: 360 }),
          createTocEntry('System Architecture', 40, { indent: 360 }),
          createTocEntry('System Development Requirements', 42, { indent: 360 }),
          createTocEntry('Hardware Requirements', 42, { indent: 720 }),
          createTocEntry('Software Requirements', 43, { indent: 720 }),
          createTocEntry('Data Flow Diagram (DFD)', 44, { indent: 360 }),
          createTocEntry('Entity Relationship Diagram (ERD)', 47, { indent: 360 }),

          // References
          createTocEntry('REFERENCES', 51, { bold: true, size: 24, spaceBefore: 160 })
        ]
      },

      // -------------------------------------------------------------
      // MAIN MANUSCRIPT (CHAPTERS 1, 2, 3 & REFERENCES)
      // -------------------------------------------------------------
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT]
                  })
                ]
              })
            ]
          })
        },
        children: [
          // =========================================================
          // CHAPTER 1
          // =========================================================
          createHeading('CHAPTER 1', HeadingLevel.HEADING_1, {
            alignment: AlignmentType.CENTER,
            size: 28,
            bold: true,
            spaceBefore: 0,
            spaceAfter: 80
          }),
          createHeading('PROJECT AND ITS BACKGROUND', HeadingLevel.HEADING_2, {
            alignment: AlignmentType.CENTER,
            size: 24,
            bold: true,
            spaceBefore: 0,
            spaceAfter: 280
          }),

          createHeading('Project Context', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 180,
            spaceAfter: 120
          }),
          createPara(
            'Electricity is essential for daily life in Valencia City, Bukidnon. It powers households, runs local businesses, supports schools, and keeps healthcare facilities functioning. When unexpected power interruptions happen, daily routines stop, businesses lose income, and community safety can be compromised. During these brownouts and line faults, what residents need most is clear and reliable information: which areas are affected, what caused the outage, and how soon the power is expected to return.'
          ),
          createPara(
            'In Valencia City, power distribution is managed by the First Bukidnon Electric Cooperative (FIBECO). At present, when an outage strikes, residents usually turn to informal and uncoordinated channels to report the problem or seek updates. Many try calling the emergency hotline numbers, while others post complaints or comment on social media pages such as Facebook. This setup creates significant bottlenecks. During large outages, telephone lines quickly become congested with busy signals, leaving many callers frustrated. On social media, hundreds of comments pour in with incomplete information—often just stating "Walay suga diri" without giving a specific purok, landmark, or photo of the problem.'
          ),
          createPara(
            'For dispatchers and utility personnel, sorting through these scattered messages is difficult and time-consuming. They must answer repeated calls about the same tripped feeder while trying to figure out which specific neighborhood actually has a localized problem, such as a fallen branch on a service line or a blown transformer fuse. Because there is no single shared platform that maps these reports geographically, dispatchers cannot easily tell whether thirty calls come from thirty separate problems or from one single line fault affecting an entire purok. As a result, field linemen often spend extra time searching for faults on the ground, while residents remain in the dark about whether anyone is working on their neighborhood.'
          ),
          createPara(
            'To solve this problem, the researchers designed and developed "Valencia PowerWatch: A Multi-Role Web- and Mobile-Based Community Power Interruption Reporting, Verification, and Information Management System." The project gives Valencia City an organized, map-based digital platform where residents, utility dispatchers, and field crews can coordinate effectively. Instead of vague phone calls, residents can submit clear reports with their exact barangay, purok, GPS location, and photos. Dispatchers can see these reports grouped on a live city map, verify them, and send field crews directly to the site. Meanwhile, linemen can update repair progress from their mobile phones, allowing the system to send automatic status updates back to residents through text messages and web notifications.'
          ),

          createHeading('Problem Statement', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'Currently, power interruption reporting and information tracking in Valencia City relies on congested telephone hotlines and unmoderated social media threads. This lack of an organized, geo-referenced system causes slow incident verification, delayed crew dispatch, and public confusion during outages.'
          ),
          createPara(
            'Specifically, this study aims to answer the following research questions:'
          ),
          createPara(
            '1. What functional and operational requirements are needed to build a reliable system for submitting, verifying, assigning, and resolving power outage reports across the 31 barangays of Valencia City?'
          ),
          createPara(
            '2. How can an interactive map and a deterministic Estimated Time of Restoration (ETR) algorithm be developed to visualize outage clusters and provide realistic restoration timelines for residents and utility staff?'
          ),
          createPara(
            '3. How can a multi-portal architecture with role-based access control and automated notifications (in-app alerts, SMS, and a bilingual chatbot) be implemented to support residents, dispatchers, and field linemen?'
          ),
          createPara(
            '4. How acceptable and effective is the developed Valencia PowerWatch system when evaluated by community residents, utility staff, and IT experts using the ISO/IEC 25010 Software Quality Standard?'
          ),

          createHeading('Objectives of the Study', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createHeading('General Objective', HeadingLevel.HEADING_4, {
            size: 24,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'To design, develop, and evaluate "Valencia PowerWatch," an integrated multi-role web- and mobile-based community power interruption reporting, verification, and information management system for Valencia City, Bukidnon.'
          ),
          createHeading('Specific Objectives', HeadingLevel.HEADING_4, {
            size: 24,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            '1. To identify and analyze the user requirements, reporting workflows, and operational needs of Valencia City residents, utility dispatchers, and field crews through interviews and process walkthroughs.'
          ),
          createPara(
            '2. To design and implement a responsive geospatial mapping module using Leaflet.js and a deterministic Estimated Time of Restoration (ETR) engine based on reported fault types, weather conditions, and incident density.'
          ),
          createPara(
            '3. To develop the three dedicated portals (Resident Community Portal, Dispatcher Admin Dashboard, and Field Staff Mobile App) with role-based security, automated SMS text alerts via Semaphore API, and a bilingual Cebuano/English assistance chatbot.'
          ),
          createPara(
            '4. To evaluate the performance, usability, and technical quality of the developed system using an evaluation instrument based on the ISO/IEC 25010 Software Quality Standard administered to residents, utility personnel, and IT experts.'
          ),

          createHeading('Significance of the Study', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'This project offers practical benefits to several groups within the community:'
          ),
          createPara(
            'For Community Residents of Valencia City, residents gain a convenient, 24/7 web-based tool to report power outages from their smartphones or computers. Instead of wondering whether the utility knows about their situation, residents can see their report status change in real time (from Submitted to Verified, In Progress, and Resolved), receive SMS updates when technicians arrive, and view scheduled maintenance advisories before work begins.'
          ),
          createPara(
            'For Utility Dispatchers and Office Staff, dispatchers receive an organized dashboard that groups multiple calls from the same area under a single incident ticket. This eliminates duplicate record-keeping, helps staff assess the number of affected households faster, and allows them to assign field crews based on which barangays need the most urgent attention.'
          ),
          createPara(
            'For Field Maintenance Crews and Linemen, linemen can use the mobile-optimized Staff Portal to check their assigned jobs, view attached photos and exact purok landmarks, confirm their arrival on site using GPS, and upload completion photos once repairs are finished. This reduces confusion and minimizes travel delays.'
          ),
          createPara(
            'For Local Government Units and Disaster Responders (CDRRMO), city officials and disaster teams can look at the city-wide outage map during storms to identify which barangays have lost power. This helps them prioritize emergency resources, such as deploying backup generators to health centers, water pumping stations, and evacuation facilities.'
          ),
          createPara(
            'For Future IT Researchers, this project provides a practical reference for other students building civic software, showing how to implement Progressive Web Applications (PWAs), geocoding with OpenStreetMap, and hybrid database models that combine fast local storage with cloud-backed backups.'
          ),

          createHeading('Scope and limitations', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createHeading('Scope', HeadingLevel.HEADING_4, {
            size: 24,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'The project covers the development, deployment, and evaluation of the Valencia PowerWatch system for all thirty-one (31) official barangays of Valencia City, Bukidnon: Bagontaas, Banlag, Barobo, Batangan, Catumbalon, Colonia, Concepcion, Dagat-Kidavao, Guinoyuran, Kahapunan, Laligan, Lilingayon, Lourdes, Lumbayao, Lumbo, Lurogan, Maapag, Mabuhay, Mailag, Mt. Nebo, Nabago, Pinatilan, Poblacion, San Carlos, San Isidro, Sinabuagan, Sinayawan, Sugod, Tongantongan, Tugaya, and Vintar.'
          ),
          createPara(
            'The system includes four user roles: Resident, Field Personnel (Staff), Utility / Dispatcher, and System Administrator. Its core features encompass crowdsourced outage reporting with GPS location, purok selection, fault description, and photo/video attachments; centralized case management where dispatchers group related reports under master incident codes (OUT-XXXX); an interactive Leaflet.js GIS map with heatmaps and boundaries; algorithmic Estimated Time of Restoration (ETR) based on fault type, weather, and density; automated SMS text alerts via Semaphore API; and a bilingual rule-based chatbot answering questions in English and Cebuano.'
          ),
          createPara(
            'The software stack uses Node.js and Express.js, deployed on Render.com, utilizing local SQLite in Write-Ahead Logging mode for fast operations and Neon Serverless PostgreSQL for persistent cloud database snapshots.'
          ),
          createHeading('Limitations', HeadingLevel.HEADING_4, {
            size: 24,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'The project operates within clear, realistic boundaries: The system is an information and communication platform. It does not physically connect to substation circuit breakers, transformers, or automated smart meters, and it cannot turn electricity on or off automatically.'
          ),
          createPara(
            'Users need an active mobile data or Wi-Fi connection to submit new reports and receive live map updates. Although the PWA caches the app shell so it opens offline, reports filed without internet must wait until connection returns before reaching the server. Address lookups rely on OpenStreetMap Nominatim; in rural sitios where street data is limited, residents confirm their purok manually. SMS text alerts depend on cellular coverage and Semaphore gateway credits; in development and testing environments, the system logs simulated text messages.'
          ),

          createHeading('Definition of Terms', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'Administrator - A user with full privileges to manage user accounts, review system audit logs, configure global settings, and oversee database backups.'
          ),
          createPara(
            'Barangay - The basic local government unit in Valencia City; used as the main geographical boundary for grouping and reporting power outages.'
          ),
          createPara(
            'Chatbot - An automated assistant in the resident portal that recognizes common inquiries in English and Cebuano using keyword matching and offers quick answers or page links.'
          ),
          createPara(
            'Citizen Feedback - A feature where reporting residents submit a 1 to 5 star rating and brief comments after service restoration to evaluate the repair.'
          ),
          createPara(
            'Data Flow Diagram (DFD) - A structured diagram showing how information enters, moves between processes, and gets stored in the Valencia PowerWatch system.'
          ),
          createPara(
            'Estimated Time of Restoration (ETR) - An estimated date and time for power restoration, calculated by considering fault category, report volume, and local weather.'
          ),
          createPara(
            'Entity Relationship Diagram (ERD) - A diagram representing database tables, their primary and foreign keys, and the connections between them.'
          ),
          createPara(
            'Field Personnel (Staff) - Linemen and technicians who receive repair tickets, navigate to the reported location, and record job progress on the mobile staff portal.'
          ),
          createPara(
            'Geospatial Mapping - The visual presentation of outage locations and cluster densities on an interactive map using geographic coordinates.'
          ),
          createPara(
            'Incident (OUT-XXXX) - An official record created by dispatchers that represents a verified power outage event, linking one or more individual resident reports.'
          ),
          createPara(
            'ISO/IEC 25010 - An international standard used to evaluate software quality across characteristics including usability, reliability, and functionality.'
          ),
          createPara(
            'Outage Report (VPR-XXXX) - A ticket filed by a resident containing details of a power loss, including barangay, purok, GPS coordinates, and optional photos.'
          ),
          createPara(
            'Progressive Web Application (PWA) - A website built with modern web tools that can be installed directly onto a mobile phone home screen and open quickly like a native app.'
          ),
          createPara(
            'Purok - A community zone within a barangay; used in this study to pinpoint the neighborhood where an outage occurred.'
          ),
          createPara(
            'Role-Based Access Control (RBAC) - A security rule ensuring users can only view and edit pages and data permitted for their specific account type.'
          ),
          createPara(
            'Semaphore API - A Philippine online SMS service used by the system backend to send text message notifications to mobile numbers.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // =========================================================
          // CHAPTER 2
          // =========================================================
          createHeading('CHAPTER 2', HeadingLevel.HEADING_1, {
            alignment: AlignmentType.CENTER,
            size: 28,
            bold: true,
            spaceBefore: 0,
            spaceAfter: 80
          }),
          createHeading('REVIEW OF RELATED LITERATURE AND STUDIES', HeadingLevel.HEADING_2, {
            alignment: AlignmentType.CENTER,
            size: 24,
            bold: true,
            spaceBefore: 0,
            spaceAfter: 280
          }),

          createPara(
            'This chapter reviews relevant literature, published research, and existing systems that support the design of Valencia PowerWatch. To provide a thorough academic background, the review is organized into eight practical areas: technology adoption models, civic crowdsourcing, outage management, geospatial mapping, progressive web apps, SMS alerting, portal security, and restoration time estimation. The chapter concludes with a synthesis identifying the local research gap that this project addresses.'
          ),

          createHeading('Related Literature', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 180,
            spaceAfter: 120
          }),

          createHeading('Theoretical Frameworks in Technology Adoption and System Success', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'When introducing new software to a community, understanding how people accept and use technology is critical. DeLone and McLean (2003) updated their Information Systems Success Model to show that system success depends on three key inputs: System Quality (how well the software works), Information Quality (how clear and accurate the data is), and Service Quality. These directly influence whether people use the software and feel satisfied with it. In Valencia PowerWatch, System Quality means fast loading times and a reliable interface on mobile phones. Information Quality means providing accurate outage notices, verified incident badges, and realistic restoration estimates. When residents see that reports lead to actual updates, trust and satisfaction increase.'
          ),
          createPara(
            'Similarly, Davis (1989) developed the Technology Acceptance Model (TAM), proving that user adoption is driven primarily by two beliefs: Perceived Usefulness (how much the tool helps them in daily life) and Perceived Ease of Use (how simple it is to learn and operate). Venkatesh and Davis (2000) later noted in TAM2 that relevance to a user’s immediate needs strongly reinforces usefulness. For a family in Valencia experiencing an evening blackout, usefulness means being able to check their phone and immediately learn if their feeder line tripped. Ease of use means filing a report in three simple steps without filling out confusing forms.'
          ),
          createPara(
            'Carter and Belanger (2005) examined citizen adoption of digital public services and found that trust is the decisive factor—both trust in the agency providing the service and trust in the technical platform. If residents feel confident that the reporting tool will not leak their personal phone numbers and that the utility actually monitors incoming tickets, community adoption grows steadily.'
          ),

          createHeading('Civic Reporting, Open311, and Citizen Participation', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'Civic reporting systems allow citizens to report local infrastructure issues directly to municipal agencies. The Open311 consortium (Open311, n.d.) developed a widely accepted open protocol (GeoReport v2) that standardizes how service requests—such as broken streetlights and water leaks—are submitted and tracked. The City of Bloomington’s uReport (City of Bloomington, n.d.) is a practical example of an open-source civic reporting tool built on these concepts. Valencia PowerWatch follows similar principles by giving every ticket a unique tracking code (VPR-XXXX), clear lifecycle stages, and geographic coordinates.'
          ),
          createPara(
            'Offenhuber (2014) studied 311 systems in major cities and highlighted a common failure point: reporting fatigue. When citizens submit complaints into an opaque system that never provides feedback, they quickly stop using it. Valencia PowerWatch prevents this by establishing clear feedback loops: as soon as a dispatcher reviews a report or a lineman reaches the site, the system updates the resident’s timeline and sends an automated text alert.'
          ),
          createPara(
            'In the Philippines, Fernandez et al. (2020) analyzed crowdsourced disaster reporting in Metro Manila and noted that mobile citizen reporting significantly improves response times during emergencies. However, they emphasized that systems in provincial areas must be lightweight, work well over slower mobile networks, and support local dialects so all community members can participate comfortably.'
          ),

          createHeading('Outage Management Systems and Distribution Grid Operations', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'Electric utilities depend on Outage Management Systems (OMS) to identify grid faults and dispatch repair crews. Brown (2008) in "Electric Power Distribution Reliability" detailed how utilities evolved from paper trouble tickets to computerized databases that link consumer calls with physical feeder maps. In rural and provincial areas, however, complete smart meter installation (AMI) is often too expensive, meaning utilities cannot automatically know when an individual household loses power.'
          ),
          createPara(
            'Farhangi (2010) explained that during the transition to smarter grids, crowdsourced notifications from consumers serve as an affordable, human-driven sensor network. When several households along the same road report power loss at the same time, dispatchers can infer where a line tripped before a crew even leaves the station. Kezunovic et al. (2012) added that combining trouble calls with spatial mapping noticeably reduces outage duration metrics (such as SAIDI and CAIDI). Valencia PowerWatch applies this by grouping neighborhood reports into master incidents (OUT-XXXX), giving dispatchers an immediate snapshot of which feeders have failed.'
          ),

          createHeading('Geospatial Mapping and Location-Based Services in Public Utilities', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'Mapping plays a vital role in managing utility networks. Goodchild (2007) introduced the concept of Volunteered Geographic Information (VGI), showing that citizens on the ground can provide detailed, localized spatial information that centralized offices often overlook. Esri’s ArcGIS Survey123 (Esri, n.d.) is a widely used example of a mobile data collection tool that links field forms to digital maps.'
          ),
          createPara(
            'While enterprise GIS platforms are powerful, their high licensing costs make them impractical for smaller cooperatives and academic projects. Open-source tools like Leaflet.js provide an excellent alternative, offering fast and flexible map rendering inside web browsers. Haklay (2010) evaluated OpenStreetMap data and found that community-contributed spatial data in populated areas is accurate and frequently updated. Valencia PowerWatch uses Leaflet.js to render outage pins, heatmaps, and official barangay boundaries, while OpenStreetMap Nominatim handles reverse-geocoding to convert GPS coordinates into recognizable neighborhood names.'
          ),

          createHeading('Progressive Web Applications in Low-Bandwidth Environments', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'Public platforms must be easy to access on all devices. Biørn-Hansen et al. (2020) compared native mobile applications with Progressive Web Applications (PWAs) and found that PWAs significantly lower user friction. Residents do not need to open an app store, download large installation files, or worry about device storage limits. A PWA runs directly inside the browser and can be added to the phone’s home screen with one tap.'
          ),
          createPara(
            'PWAs use Service Workers to cache critical files locally on the device. Malavolta et al. (2017) demonstrated that caching application shells allows web apps to open almost instantly, even over slow 2G or 3G mobile connections commonly found in provincial barangays. Valencia PowerWatch uses separate PWA configurations for the Community Portal and the Staff Field App, ensuring quick access and offline shell readiness for both residents and field technicians.'
          ),

          createHeading('Multi-Channel Notifications and SMS Alerting in Emergency Response', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'Reliable communication is critical during power failures. While push notifications and social media updates work well when internet access is strong, Short Message Service (SMS) remains the most reliable alerting method in provincial Philippine communities where mobile data can be spotty.'
          ),
          createPara(
            'Al-Dmour et al. (2020) reviewed emergency alert systems and observed that text messages achieve an open rate of over 90% within fifteen minutes of sending, far exceeding emails or social media posts that get buried under platform algorithms. In the Philippines, the Semaphore SMS Gateway API allows web applications to send automated text messages directly to mobile numbers on all major networks (Globe, Smart, DITO). Valencia PowerWatch uses Semaphore to send immediate text alerts for key milestones, such as when a report is verified, when a repair crew is on the way, and when power has been restored.'
          ),

          createHeading('Role-Based Security and Privacy Protection in Municipal Portals', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'Systems that collect citizen identities, phone numbers, and location details must protect this data responsibly. Sandhu et al. (1996) established the standard model for Role-Based Access Control (RBAC), showing that assigning permissions to specific roles (such as Resident, Staff, or Admin) prevents unauthorized access and ensures users only see what they need to see.'
          ),
          createPara(
            'The Open Web Application Security Project (OWASP, 2021) identifies Broken Access Control and Cryptographic Failures as common web application risks. Under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), personal contact information must be stored securely. Valencia PowerWatch follows these best practices by hashing user passwords with strong scryptSync algorithms, storing session tokens as SHA-256 hashes, validating uploaded media files before saving them, and enforcing server-side route guards on every private API endpoint.'
          ),

          createHeading('Restoration Time Estimation and Heuristic Modeling', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createPara(
            'Giving residents a realistic Estimated Time of Restoration (ETR) reduces panic and helps families plan during a blackout. Coster et al. (2011) showed that outage duration depends primarily on three factors: the type of physical fault (e.g., a simple blown fuse versus a fallen pole), weather severity (e.g., strong winds or thunderstorms that slow down crew repairs), and the total number of concurrent outages competing for repair teams.'
          ),
          createPara(
            'While advanced machine learning models (Ji et al., 2016) have been studied, they require years of historical maintenance data that local cooperatives rarely have in digital format. In practice, a rule-based deterministic algorithm that adjusts base repair times according to weather multipliers and report cluster density offers a practical, transparent, and accurate solution. Valencia PowerWatch uses a dedicated calculation module (etr.js) to produce dependable estimates dynamically without heavy server computation.'
          ),

          createHeading('Synthesis and Research Gap', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'The reviewed literature shows that modern outage management benefits greatly from combining simple mobile interfaces (TAM, PWA), structured public reporting (Open311), volunteer mapping (VGI, GIS), reliable text alerting (SMS), and transparent restoration estimates (ETR).'
          ),
          createPara(
            'Existing tools, however, leave a clear gap. International civic applications like uReport handle general neighborhood issues but lack utility-specific workflows like lineman dispatch and technical repair stages. Commercial utility systems used by large private companies (such as Meralco in Metro Manila) are costly enterprise platforms designed for urban smart grids, making them unobtainable for provincial cooperatives. In Valencia City, residents and utility workers still rely on busy phone hotlines and scattered Facebook comments.'
          ),
          createPara(
            'This creates a clear local gap: Valencia City lacks an accessible, low-cost, multi-role digital platform built specifically for its geographic and community needs. Valencia PowerWatch fills this gap directly. It offers a bilingual, easy-to-use reporting portal for residents, an incident-clustering dashboard for dispatchers, and a mobile tracking tool for field crews, all supported by a resilient database setup tailored for local operations.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // =========================================================
          // CHAPTER 3
          // =========================================================
          createHeading('CHAPTER 3', HeadingLevel.HEADING_1, {
            alignment: AlignmentType.CENTER,
            size: 28,
            bold: true,
            spaceBefore: 0,
            spaceAfter: 80
          }),
          createHeading('RESEARCH METHODOLOGY', HeadingLevel.HEADING_2, {
            alignment: AlignmentType.CENTER,
            size: 24,
            bold: true,
            spaceBefore: 0,
            spaceAfter: 280
          }),

          createPara(
            'This chapter explains the methods, research procedures, system architecture, and technical specifications used to design, develop, and evaluate Valencia PowerWatch. It details the research setting, research design, participants, sampling technique, data gathering tools, statistical treatment, development process, system flow, architecture, hardware and software requirements, Data Flow Diagrams (DFD), and Entity Relationship Diagrams (ERD).'
          ),

          createHeading('Research Setting', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 180,
            spaceAfter: 120
          }),
          createPara(
            'The study is conducted in Valencia City, a bustling component city in central Bukidnon, Northern Mindanao (Region X), Philippines. Located at geographic coordinates 7.906° N, 125.094° E, Valencia City spans an area of 587.29 square kilometers, serving as the trade and agricultural center of the province.'
          ),
          createPara(
            'Electrical power distribution across the city is operated by the First Bukidnon Electric Cooperative, Inc. (FIBECO). Valencia City consists of thirty-one (31) official barangays, ranging from busy urban areas like Poblacion, Lumbo, Bagontaas, and Batangan, to large rural farming communities such as Guinoyuran, Lilingayon, Mt. Nebo, and Concepcion.'
          ),
          createPara(
            'These geographic differences mean that power faults in the city center can often be reached quickly, while rural faults along unpaved or mountainous roads require more coordination. This makes Valencia City an ideal setting for deploying and testing a map-based reporting and field tracking system.'
          ),

          ...createFigureBox('1', 'Geographic Map of Valencia City, Bukidnon (Study Site)'),

          createHeading('Research Design', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'This study uses a Developmental Research Design, based on the Design and Development Research (DDR) model described by Richey and Klein (2007). Developmental research focuses on the systematic planning, creation, testing, and evaluation of a functional software solution that solves a concrete problem.'
          ),
          createPara(
            'The study followed four sequential phases: (1) Requirements Analysis: Documenting current reporting pain points, user roles, and necessary system features through stakeholder consultations; (2) System Design: Developing user interface mockups, process flowcharts, DFDs, and database schemas; (3) Prototype Development: Writing and integrating the backend REST API, responsive web interfaces, mapping components, and SMS messaging services; and (4) Testing and Evaluation: Conducting functional automated unit testing and measuring user acceptance using an ISO/IEC 25010 evaluation questionnaire.'
          ),

          createHeading('Respondents and Sampling Technique', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'To obtain reliable and well-rounded feedback, the study involved fifty (50) selected respondents representing four key stakeholder groups:'
          ),

          createTable(
            ['Respondent Group', 'Count', 'Description / Role in Evaluation'],
            [
              ['Community Residents', '30', 'Homeowners and local business owners across urban and rural zones'],
              ['Field Maintenance Linemen', '10', 'Utility technical workers who test mobile field dispatch features'],
              ['Utility Dispatchers / Admins', '5', 'Office staff who verify reports and manage overall incident tickets'],
              ['IT Professionals / Engineers', '5', 'Software developers who evaluate code quality and architecture'],
              ['Total Respondents', '50', 'Complete participant sample for ISO/IEC 25010 evaluation']
            ],
            [30, 15, 55],
            [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT]
          ),

          createPara(
            'The study used Purposive Sampling. This non-probability sampling method was chosen because evaluation required participants who either live in Valencia City, work directly in power maintenance, or possess technical knowledge in software engineering to assess the system accurately against ISO/IEC 25010 standards.'
          ),

          createHeading('Data Gathering and Research Instruments', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'Data was collected through qualitative and quantitative methods: (1) Semi-Structured Interviews with residents, barangay leaders, and linemen to understand common reporting delays and verbal communication difficulties during blackouts; (2) Workflow Observation reviewing how telephone complaints are currently written down and passed to line crews; and (3) A Standardized Evaluation Questionnaire based on the ISO/IEC 25010 Software Quality Standard. The questionnaire evaluated five core criteria: Functional Suitability, Usability, Performance Efficiency, Reliability, and Security.'
          ),
          createPara(
            'All respondents participated voluntarily with signed consent forms, and all personal data was handled confidentially in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).'
          ),

          createHeading('Statistical Treatment of Data', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'Survey responses were tabulated and analyzed using basic descriptive statistics, specifically the Weighted Mean formula:'
          ),
          createPara(
            'Weighted Mean = (Sum of f * x) / N',
            { bold: true, alignment: AlignmentType.CENTER, spaceBefore: 80, spaceAfter: 80 }
          ),
          createPara(
            'Where: f = frequency of responses for each rating; x = scale rating value (1 to 5); and N = total number of respondents (50).'
          ),
          createPara(
            'To interpret the computed mean scores, the following standard 5-point Likert Scale continuum was utilized:'
          ),

          createTable(
            ['Scale', 'Mean Range', 'Qualitative Description', 'Verbal Interpretation'],
            [
              ['5', '4.21 – 5.00', 'Strongly Agree', 'Highly Acceptable / Excellent'],
              ['4', '3.41 – 4.20', 'Agree', 'Acceptable / Very Satisfactory'],
              ['3', '2.61 – 3.40', 'Neutral', 'Moderately Acceptable / Satisfactory'],
              ['2', '1.81 – 2.60', 'Disagree', 'Poor / Needs Improvement'],
              ['1', '1.00 – 1.80', 'Strongly Disagree', 'Very Poor / Unacceptable']
            ],
            [15, 25, 30, 30],
            [AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.LEFT]
          ),

          createHeading('System Development Methodology', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'The project followed the Agile Scrum Development Methodology. Agile was chosen because civic web applications benefit from frequent iterations, quick testing, and continuous feedback from target users.'
          ),
          createPara(
            'Work was organized into four 2-week sprints: Sprint 1 (Core Foundation): Database design, user registration, scrypt password security, and base administrative views; Sprint 2 (Citizen Reporting & Mapping): Resident portal, GPS coordinate capture, photo uploads with validation, and barangay reverse-geocoding; Sprint 3 (Field Dispatch & Alerts): Mobile staff portal, job stage tracking (En Route, Inspecting, Repairing), on-site photo evidence, and Semaphore SMS; and Sprint 4 (Incident Linking, Chatbot & Polish): Grouping reports into master incidents, deterministic ETR calculation, Cebuano chatbot, automated unit tests (96 tests passing), and cloud deployment on Render.com.'
          ),

          ...createFigureBox('2', 'Proposed Agile Scrum System Development Methodology'),

          createHeading('Methodology Phase Guide', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),

          createTable(
            ['Phase', 'What the Team Did', 'Deliverable Produced'],
            [
              ['1. Planning', 'Defined project objectives, stakeholder roles, project schedule, and user stories.', 'Approved Proposal, Project Charter, and Sprint Backlog.'],
              ['2. Analysis', 'Interviewed residents and linemen; analyzed phone hotline bottlenecks and documented system requirements.', 'Software Requirements Specification (SRS) and Data Dictionary.'],
              ['3. Design', 'Created system flowcharts, DFDs, ERD, and wireframe layouts for the three user portals.', 'System Architecture Diagram, UI Mockups, and Database Schemas.'],
              ['4. Development', 'Programmed Node.js backend REST APIs, SQLite/Neon dual database, Leaflet maps, and responsive PWA shells.', 'Working Software Prototype Deployed on Render.com Cloud.'],
              ['5. Testing', 'Executed 96 automated tests covering auth, reports, staff workflow, and responsiveness.', 'Test Execution Reports, Bug Tracker, and Performance Logs.'],
              ['6. Evaluation / Deploy', 'Administered ISO/IEC 25010 surveys to 50 respondents, analyzed data, and finalized manuscript documentation.', 'Evaluation Results, Statistical Analysis, and Capstone Manuscript.']
            ],
            [20, 50, 30]
          ),

          createHeading('System Flow', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'The operational flow of Valencia PowerWatch follows a straightforward sequence from report submission to resolution: (1) A resident opens the Community Portal on their mobile phone or computer, selects their barangay, indicates their purok, marks their location on the map, chooses the suspected fault type, attaches a photo if available, and submits ticket VPR-XXXX; (2) The server validates the upload, logs the submission time, and places the ticket in the dispatcher’s review queue; (3) The dispatcher reviews incoming tickets on the Admin Dashboard, linking related reports under a master Incident (OUT-XXXX) with automated ETR calculation; (4) The dispatcher assigns a field repair team, triggering an automated SMS notification to the lead lineman; (5) The linemen open the Staff Portal on their phones, check the location and photos, confirm arrival via GPS, and advance the job status; and (6) Once repairs are finished, the crew uploads completion photos, the dispatcher marks the incident "Resolved," triggering text alerts to reporting residents who submit feedback ratings confirming restoration.'
          ),

          ...createFigureBox('3', 'Proposed System Flow Diagram', FLOWCHART_PATH),

          createHeading('System Architecture', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'Valencia PowerWatch is built on a 3-tier client-server architecture with a hybrid data storage setup: (1) Presentation Tier comprising the Community Portal (community.html), Admin SCADA Dashboard (admin.html), and Staff Field App (staff.html); (2) Application Tier powered by Node.js and Express RESTful API on Render.com, managing scryptSync password hashing, role guards (requireRole), deterministic ETR calculations (etr.js), OpenStreetMap Nominatim geocoding, and Cebuano chatbot responses; and (3) Data Storage Tier combining local low-latency SQLite in WAL mode with automated gzip snapshot persistence to Neon Serverless PostgreSQL, alongside external integrations with Semaphore SMS and Open-Meteo Weather.'
          ),

          ...createFigureBox('4', 'Proposed System Architecture Diagram'),

          createHeading('System Development Requirements', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),

          createHeading('Hardware Requirements', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 120,
            spaceAfter: 80
          }),
          createTable(
            ['Requirement', 'Proposed Specification / Tool', 'Purpose / Justification'],
            [
              ['Development Workstation', 'AMD Ryzen 5 / Intel Core i5 (6 cores), 16GB RAM, SSD', 'Used for programming, running local test servers, and automated testing.'],
              ['Cloud Web Server', 'Render.com Web Service (Node.js 22 LTS, 512MB RAM)', 'Hosts the live web application and REST API endpoints accessible 24/7 online.'],
              ['Cloud Database Instance', 'Neon Serverless PostgreSQL Cloud Database', 'Stores durable compressed database snapshots and preserves registered accounts.'],
              ['Mobile Test Devices', 'Android Smartphone (Android 11+) & iPhone (iOS 15+)', 'Used to test responsive layouts, PWA installation, and mobile GPS reporting.'],
              ['Desktop Test Workstation', 'Windows 11 / macOS Desktop PC (1080p Monitor)', 'Used to test the multi-column Admin SCADA dashboard, data tables, and GIS map views.']
            ],
            [25, 35, 40]
          ),

          createHeading('Software Requirements', HeadingLevel.HEADING_4, {
            size: 22,
            bold: true,
            italics: true,
            spaceBefore: 180,
            spaceAfter: 80
          }),
          createTable(
            ['Requirement', 'Proposed Specification / Tool', 'Purpose / Justification'],
            [
              ['Operating System', 'Windows 11 Pro (Dev) / Linux Ubuntu 22.04 LTS (Prod)', 'Development environment and live cloud server operating system.'],
              ['Backend Platform', 'Node.js (v22+) with Express.js (v4.21)', 'Executes backend business logic, API routes, and cryptographic functions.'],
              ['Local Database', 'SQLite3 (node:sqlite DatabaseSync) in WAL Mode', 'Fast, zero-setup local database for instant reads and writes during web operations.'],
              ['Cloud Database', 'PostgreSQL (Neon Serverless v16) via pg (v8.23)', 'Cloud storage for automated database snapshots and account persistence.'],
              ['Frontend Core', 'Standard HTML5, CSS3, and JavaScript (ES6+)', 'Lightweight, framework-free frontend ensuring fast loading and broad compatibility.'],
              ['Mapping Tools', 'Leaflet.js (v1.9.4) & Leaflet.heat (v0.2.0)', 'Renders interactive map pins, layers, and outage heatmaps in the browser.'],
              ['File Upload Handling', 'Multer (v2.4.0) with magic-byte verification', 'Securely processes and validates uploaded photo and video evidence.'],
              ['Third-Party APIs', 'Semaphore SMS API & Open-Meteo Weather API', 'Powers automated text notifications and live weather data ingestion.'],
              ['Development Tools', 'Visual Studio Code, Git, GitHub Actions, PowerShell 7', 'Code editing, version control, automated testing, and deployment scripting.']
            ],
            [25, 35, 40]
          ),

          createHeading('Data Flow Diagram (DFD)', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'The Data Flow Diagram shows Valencia PowerWatch as a single system interacting with four external entities: Residents, Field Linemen, Dispatchers/Administrators, and External Gateways (Semaphore SMS, OpenStreetMap). The Level 1 DFD breaks the system down into six main processes: Process 1.0 (Authentication & Roles); Process 2.0 (Report Intake & Geocoding); Process 3.0 (Incident Verification & Grouping); Process 4.0 (Dispatch Management); Process 5.0 (ETR & Map Processing); and Process 6.0 (Alerts & Citizen Feedback).'
          ),

          ...createFigureBox('5', 'Data Flow Diagram (DFD) of Valencia PowerWatch'),

          createHeading('Entity Relationship Diagram (ERD)', HeadingLevel.HEADING_3, {
            size: 24,
            bold: true,
            spaceBefore: 240,
            spaceAfter: 120
          }),
          createPara(
            'The system uses 26 relational tables in SQLite, which are mapped to an expanded 35-table schema in Neon PostgreSQL for long-term scalability. The main entities include: (1) users (accounts, credentials, roles); (2) barangays (31 official barangay boundaries and coordinates); (3) outage_reports (crowdsourced tickets VPR-XXXX, GPS locations, verification status); (4) outage_incidents (master incidents OUT-XXXX, priority levels, computed ETR); (5) incident_links and incident_areas (relationship junction tables); (6) repair_teams and repair_assignments (crew dispatches, live coordinates, target puroks); (7) citizen_feedback (post-restoration ratings); and (8) sms_logs (Semaphore API text message audit trail).'
          ),

          ...createFigureBox('6', 'Entity Relationship Diagram (ERD) of Valencia PowerWatch'),

          new Paragraph({ children: [new PageBreak()] }),

          // =========================================================
          // REFERENCES
          // =========================================================
          createHeading('REFERENCES', HeadingLevel.HEADING_1, {
            alignment: AlignmentType.CENTER,
            size: 28,
            bold: true,
            spaceBefore: 0,
            spaceAfter: 280
          }),

          createReferencePara(
            'Al-Dmour, N. A., Masa’deh, R., & Obeidat, B. Y. (2020).',
            'The role of mobile short message service (SMS) in emergency and crisis management: A systematic literature review.',
            'International Journal of Interactive Mobile Technologies, 14(18), 4-22. https://doi.org/10.3991/ijim.v14i18.15674'
          ),
          createReferencePara(
            'Biørn-Hansen, A., Majchrzak, T. A., & Grønli, T. M. (2020).',
            'Progressive web apps: The definitive guide to next-generation mobile applications.',
            'IEEE Computer, 53(4), 44-54. https://doi.org/10.1109/MC.2020.2972704'
          ),
          createReferencePara(
            'Brown, R. E. (2008).',
            'Electric power distribution reliability (2nd ed.).',
            'CRC Press. https://doi.org/10.1201/9781420058451'
          ),
          createReferencePara(
            'Carter, L., & Belanger, F. (2005).',
            'The utilization of e-government services: Citizen trust, innovation and acceptance factors.',
            'Information Systems Journal, 15(1), 5-25. https://doi.org/10.1111/j.1365-2575.2005.00183.x'
          ),
          createReferencePara(
            'City of Bloomington. (n.d.).',
            'uReport: Constituent relationship management system [Computer software].',
            'GitHub. https://github.com/City-of-Bloomington/uReport'
          ),
          createReferencePara(
            'Coster, E. J., Myrzik, J. M., Kruimer, B., & Kling, W. L. (2011).',
            'Integration issues of distributed generation in distribution grids.',
            'Proceedings of the IEEE, 99(1), 28-39. https://doi.org/10.1109/JPROC.2010.2072780'
          ),
          createReferencePara(
            'Davis, F. D. (1989).',
            'Perceived usefulness, perceived ease of use, and user acceptance of information technology.',
            'MIS Quarterly, 13(3), 319-340. https://doi.org/10.2307/249008'
          ),
          createReferencePara(
            'DeLone, W. H., & McLean, E. R. (2003).',
            'The DeLone and McLean model of information systems success: A ten-year update.',
            'Journal of Management Information Systems, 19(4), 9-30. https://doi.org/10.1080/07421222.2003.11045748'
          ),
          createReferencePara(
            'Esri. (n.d.).',
            'What is ArcGIS Survey123? ArcGIS documentation.',
            'Retrieved October 26, 2026, from https://doc.arcgis.com/en/survey123/get-started/whatissurvey123.htm'
          ),
          createReferencePara(
            'Farhangi, H. (2010).',
            'The path of the smart grid.',
            'IEEE Power and Energy Magazine, 8(1), 18-28. https://doi.org/10.1109/MPE.2009.934876'
          ),
          createReferencePara(
            'Fernandez, G., Ahmed, B., & Shaw, R. (2020).',
            'Urban disaster risk reduction and civic crowdsourcing in Metro Manila: Critical reflections.',
            'International Journal of Disaster Risk Reduction, 48, 101588. https://doi.org/10.1016/j.ijdrr.2020.101588'
          ),
          createReferencePara(
            'Goodchild, M. F. (2007).',
            'Citizens as sensors: The world of volunteered geography.',
            'GeoJournal, 69(4), 211-221. https://doi.org/10.1007/s10708-007-9111-y'
          ),
          createReferencePara(
            'Haklay, M. (2010).',
            'How good is volunteered geographical information? A comparative study of OpenStreetMap and Ordnance Survey datasets.',
            'Environment and Planning B: Planning and Design, 37(4), 682-703. https://doi.org/10.1068/b35097'
          ),
          createReferencePara(
            'ISO/IEC. (2011).',
            'Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models (ISO/IEC Standard No. 25010:2011).',
            'https://www.iso.org/standard/35733.html'
          ),
          createReferencePara(
            'Ji, C., Wei, Y., & Mei, F. (2016).',
            'Outage duration prediction in power distribution systems using ensemble machine learning.',
            'IEEE Transactions on Smart Grid, 7(3), 1332-1341. https://doi.org/10.1109/TSG.2015.2443808'
          ),
          createReferencePara(
            'Kezunovic, M., Dong, Z., & Guan, X. (2012).',
            'Smart grid data analytics for enhanced operational awareness.',
            'IEEE Transactions on Smart Grid, 3(3), 1246-1257. https://doi.org/10.1109/TSG.2012.2198083'
          ),
          createReferencePara(
            'Malavolta, I., Chinnappan, K., & Swanborn, M. (2017).',
            'End-user perception of progressive web apps: An empirical study.',
            'In Proceedings of the 13th International Conference on Web Engineering (pp. 340-358). Springer. https://doi.org/10.1007/978-3-319-60131-1_21'
          ),
          createReferencePara(
            'mySociety. (2013, January 17).',
            'Open311 explained.',
            'Retrieved October 26, 2026, from https://www.mysociety.org/2013/01/17/open311-explained/'
          ),
          createReferencePara(
            'Offenhuber, D. (2014).',
            'Visual governance: Public displays, 311 systems, and the new discipline of municipal feedback loops.',
            'Information, Communication & Society, 17(7), 884-901. https://doi.org/10.1080/1369118X.2013.856920'
          ),
          createReferencePara(
            'Open311. (n.d.).',
            'Open311: Collaborative civic issue tracking.',
            'Retrieved October 26, 2026, from https://www.open311.org/'
          ),
          createReferencePara(
            'OWASP. (2021).',
            'OWASP Top 10: 2021 web application security risks.',
            'Open Web Application Security Project. https://owasp.org/Top10/'
          ),
          createReferencePara(
            'Republic of the Philippines. (2012).',
            'Data Privacy Act of 2012 (Republic Act No. 10173).',
            'Official Gazette of the Republic of the Philippines. https://www.officialgazette.gov.ph/2012/08/15/republic-act-no-10173/'
          ),
          createReferencePara(
            'Richey, R. C., & Klein, J. D. (2007).',
            'Design and development research: Methods, strategies, and issues.',
            'Lawrence Erlbaum Associates.'
          ),
          createReferencePara(
            'Sandhu, R. S., Coyne, E. J., Feinstein, H. L., & Youman, C. E. (1996).',
            'Role-based access control models.',
            'IEEE Computer, 29(2), 38-47. https://doi.org/10.1109/2.485845'
          ),
          createReferencePara(
            'Venkatesh, V., & Davis, F. D. (2000).',
            'A theoretical extension of the Technology Acceptance Model: Four longitudinal field studies.',
            'Management Science, 46(2), 186-204. https://doi.org/10.1287/mnsc.46.2.186.11926'
          )
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);

  fs.writeFileSync(OUTPUT_FILE, buffer);
  try {
    fs.writeFileSync(DOWNLOADS_FILE, buffer);
  } catch (e) {
    console.log('Notice: Could not write directly to Downloads_File, please close Word if open.');
  }

  console.log(`Successfully generated: ${OUTPUT_FILE} (${buffer.length} bytes)`);
}

generateDocx().catch((err) => {
  console.error('Error generating document:', err);
  process.exit(1);
});
