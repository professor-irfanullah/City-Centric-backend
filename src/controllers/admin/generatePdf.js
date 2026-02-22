
// const puppeteer = require('puppeteer');

// let browserInstance = null;
// let browserPromise = null;
// let requestCount = 0;

// const getBrowser = async () => {
//   // Increment immediately to track load
//   requestCount++;

//   // Graceful restart: If count exceeds 100 and no one is currently launching
//   if (browserInstance && requestCount > 100) {
//     console.log("Refreshing browser instance...");
//     const oldBrowser = browserInstance;
//     browserInstance = null; // Prevent new requests from using the old one
//     requestCount = 0;
//     // Close in background to avoid blocking the current request
//     oldBrowser.close().catch(e => console.error("Error closing old browser:", e));
//   }

//   if (browserInstance) return browserInstance;

//   if (!browserPromise) {
//     browserPromise = puppeteer.launch({
//       headless: 'new',
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-gpu',
//         '--font-render-hinting=none' // Better font rendering in Linux
//       ]
//     }).then(browser => {
//       browserInstance = browser;
//       browserPromise = null;
//       return browser;
//     }).catch(err => {
//       browserPromise = null;
//       throw err;
//     });
//   }
//   return browserPromise;
// };


// const generatePdf = async (req, res) => {
//   let context;
//   let page;
//   try {
//     const browser = await getBrowser();

//     // Use Context for better isolation between requests
//     context = await browser.createBrowserContext();
//     page = await context.newPage();

//     await page.setRequestInterception(true);
//     page.on('request', (request) => {
//       if (['font', 'stylesheet'].includes(request.resourceType())) {
//         request.abort();
//       } else {
//         request.continue();
//       }
//     });

//     const template = req.body?.html || `<!doctype html>
// <html lang="en">
//   <head>
//     <meta charset="UTF-8" />
//     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//     <title>Individual Relief Compensation Report</title>
//     <style>
//       /* YOUR ORIGINAL HEADER STYLES (untouched) */
//       header {
//         padding: 10px 20px; /* Reduced from 20px */
//         font-family: "Times New Roman", serif;
//       }
//       #top {
//         display: flex;
//         justify-content: space-between;
//         align-items: center;
//         text-align: center;
//       }
//       .img-container {
//         width: 90px; /* Reduced from 120px */
//         flex-shrink: 0;
//       }
//       .img-container img {
//         width: 100%;
//         height: auto;
//         display: block;
//       }
//       .centerItems {
//         flex-grow: 1;
//       }
//       .centerItems h1 {
//         margin: 0;
//         font-size: 18px; /* Reduced from 22px */
//         text-transform: uppercase;
//         color: #333;
//       }
//       .centerItems h2 {
//         margin: 3px 0; /* Reduced from 5px */
//         font-size: 15px; /* Reduced from 18px */
//         font-weight: normal;
//       }
//       .centerItems h3 {
//         margin: 2px 0;
//         font-size: 14px; /* Reduced from 16px */
//         color: #004d26;
//       }
//       .centerItems p {
//         margin: 1px 0; /* Reduced from 2px */
//         font-size: 11px; /* Reduced from 13px */
//         line-height: 1.2; /* Reduced from 1.4 */
//       }
//       .contact-info {
//         margin-top: 4px; /* Reduced from 8px */
//         font-weight: bold;
//       }
//       .main div {
//         text-align: center;
//       }
//       .main div h3 {
//         font-size: 12px; /* Reduced from 14px */
//         text-decoration: underline;
//         letter-spacing: 0.6px;
//         margin: 5px 0; /* Added margin control */
//       }
//       .proformaHeading {
//         margin-top: 10px; /* Reduced from 30px */
//         text-align: center;
//       }
//       .proformaHeading h3 {
//         font-size: 16px; /* Added */
//         margin: 5px 0; /* Added */
//       }

//       /* INDIVIDUAL REPORT STYLES */
//       .report-body {
//         padding: 0 20px; /* Reduced from 40px */
//         font-family: "Times New Roman", serif;
//         margin-top: 5px; /* Reduced from 20px */
//       }

//       /* Personal Info Section */
//       .info-table {
//         width: 100%;
//         border-collapse: collapse;
//         margin-top: 8px; /* Reduced from 20px */
//         border: 1px solid #222;
//         font-size: 12px; /* Added */
//       }

//       .info-table td {
//         padding: 4px 8px; /* Reduced from 10px 12px */
//         border: 1px solid #b8c6bc;
//         vertical-align: middle;
//       }

//       .info-table .label-cell {
//         background-color: #edf2eb;
//         font-weight: 600;
//         width: 25%;
//       }

//       .info-table .data-cell {
//         font-weight: 500;
//         background-color: #ffffff;
//         width: 25%;
//       }

//       .cat-header {
//         background-color: #004d26;
//         color: white;
//         text-align: left;
//         padding: 4px 10px; /* Reduced from 8px 16px */
//         font-weight: 700;
//         font-size: 13px; /* Reduced from 1.1rem */
//         border: 1px solid #004d26;
//       }

//       /* Damage Tables */
//       .damage-table {
//         width: 100%;
//         border-collapse: collapse;
//         margin-top: 8px; /* Reduced from 20px */
//         border: 1px solid #222;
//         font-size: 12px; /* Added */
//       }

//       .damage-table th {
//         background-color: #e7ede4;
//         font-weight: 700;
//         padding: 4px 6px; /* Reduced from 10px */
//         border: 1px solid #8fa093;
//         color: #00331f;
//         font-size: 12px; /* Added */
//       }

//       .damage-table td {
//         padding: 4px 6px; /* Reduced from 10px */
//         border: 1px solid #b8c6bc;
//         text-align: center;
//       }

//       .damage-table .category {
//         background-color: #edf2eb;
//         font-weight: 600;
//         text-align: left;
//         padding-left: 10px; /* Reduced from 16px */
//       }

//       .data-cell {
//         font-weight: 700;
//         background-color: #fafaf5;
//       }

//       /* Signature Section - COMPRESSED */
//       .signature-section {
//         display: flex;
//         justify-content: space-between;
//         margin-top: 20px; /* Reduced from 50px */
//         padding: 0 10px; /* Reduced from 20px */
//         font-size: 11px; /* Added */
//       }

//       .signature-box {
//         text-align: center;
//         width: 150px; /* Reduced from 200px */
//       }

//       .signature-line {
//         margin: 10px 0 3px 0; /* Reduced from 30px 0 5px 0 */
//         border-top: 1px solid #333;
//         width: 100%;
//       }

//       .stamp {
//         width: 70px; /* Reduced from 100px */
//         height: 70px; /* Reduced from 100px */
//         border: 2px dashed #004d26;
//         border-radius: 50%;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         color: #004d26;
//         font-size: 9px; /* Reduced from 12px */
//         text-align: center;
//         transform: rotate(-15deg);
//       }

//       /* Footer - COMPRESSED */
//       .footer {
//         text-align: center;
//         margin-top: 10px; /* Reduced from 30px */
//         font-size: 9px; /* Reduced from 12px */
//         color: #666;
//       }

//       /* Rowspan fix for livestock table */
//       .damage-table th[rowspan] {
//         vertical-align: middle;
//       }

//       @media print {
//         body {
//           margin: 0.2in; /* Reduced from 0.3in */
//         }
//         .signature-line {
//           border-top: 1px solid #000;
//         }
//         /* Ensure everything stays on one page */
//         .report-body {
//           page-break-inside: avoid;
//         }
//       }
//     </style>
//   </head>
//   <body>
//     <!-- ORIGINAL HEADER (untouched structure, only sizes reduced in CSS) -->
//     <header>
//       <section id="top">
//         <div class="img-container">
//           <img
//             src="https://kp.gov.pk/uploads/2025/08/kp_logo.png"
//             alt="KP Government Logo"
//           />
//         </div>
//         <div class="centerItems">
//           <h1>Provincial Disaster Management Authority (PDMA)</h1>
//           <h2>Relief, Rehabilitation & Settlement Department</h2>
//           <h3>Government of Khyber Pakhtunkhwa</h3>
//           <p>Civil Secretariat, Peshawar.</p>
//           <p class="contact-info">
//             Phone: (091) 9210975 | Fax: (091) 9214025<br />
//             <span style="color: #0000ee">www.pdma.gov.pk</span>
//           </p>
//         </div>
//         <div class="img-container">
//           <img
//             src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9KSwxiA1NBEHIAPqq-8aIXY8litlhyv6nkA&s"
//             alt="PDMA Logo"
//           />
//         </div>
//       </section>
//     </header>

//     <main class="main">
//       <div>
//         <h3>
//           Notified in Khyber Pakhtunkhwa Govt: Gazette, Dated 12 February, 2026
//         </h3>
//       </div>
//       <div class="proformaHeading">
//         <h3>INDIVIDUAL RELIEF COMPENSATION PROFORMA</h3>
//       </div>

//       <section class="report-body">
//         <!-- Report Metadata -->
//         <table class="info-table">
//           <tr>
//             <td class="label-cell">Report ID:</td>
//             <td class="data-cell">#{{report_id}}</td>
//             <td class="label-cell">Date:</td>
//             <td class="data-cell">{{report_date}}</td>
//           </tr>
//           <tr>
//             <td class="label-cell">Disaster Type:</td>
//             <td class="data-cell">{{disaster_type}}</td>
//             <td class="label-cell">Incident Date:</td>
//             <td class="data-cell">{{incident_date}}</td>
//           </tr>
//         </table>

//         <!-- Personal Details -->
//         <table class="info-table">
//           <tr>
//             <td colspan="4" class="cat-header">PERSONAL DETAILS</td>
//           </tr>
//           <tr>
//             <td class="label-cell">Full Name:</td>
//             <td class="data-cell">{{full_name}}</td>
//             <td class="label-cell">Father's Name:</td>
//             <td class="data-cell">{{father_name}}</td>
//           </tr>
//           <tr>
//             <td class="label-cell">CNIC No.:</td>
//             <td class="data-cell">{{cnic}}</td>
//             <td class="label-cell">Mobile No.:</td>
//             <td class="data-cell">{{mobile}}</td>
//           </tr>
//           <tr>
//             <td class="label-cell">District:</td>
//             <td class="data-cell">{{district}}</td>
//             <td class="label-cell">Tehsil:</td>
//             <td class="data-cell">{{tehsil}}</td>
//           </tr>
//           <tr>
//             <td class="label-cell">Village/Mohalla:</td>
//             <td colspan="3" class="data-cell">{{village}}</td>
//           </tr>
//         </table>

//         <!-- Home & Shop Damage -->
//         <table class="damage-table">
//           <tr>
//             <th colspan="4">HOME & SHOP DAMAGE</th>
//           </tr>
//           <tr>
//             <th>Category</th>
//             <th>Minor</th>
//             <th>Partial</th>
//             <th>Fully</th>
//           </tr>
//           <tr>
//             <td class="category">Home</td>
//             <td class="data-cell">{{home_minor}}</td>
//             <td class="data-cell">{{home_partial}}</td>
//             <td class="data-cell">{{home_fully}}</td>
//           </tr>
//           <tr>
//             <td class="category">Shop/Business</td>
//             <td class="data-cell">{{shop_minor}}</td>
//             <td class="data-cell">{{shop_partial}}</td>
//             <td class="data-cell">{{shop_fully}}</td>
//           </tr>
//         </table>

//         <!-- Human Casualty -->
//         <table class="damage-table">
//           <tr>
//             <th colspan="4">HUMAN CASUALTY</th>
//           </tr>
//           <tr>
//             <th>Residents</th>
//             <th>Deaths</th>
//             <th>Injured</th>
//             <th>Disabled</th>
//           </tr>
//           <tr>
//             <td class="data-cell">{{total_residents}}</td>
//             <td class="data-cell">{{deaths_count}}</td>
//             <td class="data-cell">{{injured_count}}</td>
//             <td class="data-cell">{{disabled_count}}</td>
//           </tr>
//         </table>

//         <!-- Livestock Impact -->
//         <table class="damage-table">
//           <tr>
//             <th colspan="5">LIVESTOCK IMPACT</th>
//           </tr>
//           <tr>
//             <th rowspan="2">Category</th>
//             <th colspan="2">Big Animals</th>
//             <th colspan="2">Small Animals</th>
//           </tr>
//           <tr>
//             <th>Dead</th>
//             <th>Injured</th>
//             <th>Dead</th>
//             <th>Injured</th>
//           </tr>
//           <tr>
//             <td class="category">Count</td>
//             <td class="data-cell">{{big_deaths}}</td>
//             <td class="data-cell">{{big_injured}}</td>
//             <td class="data-cell">{{small_deaths}}</td>
//             <td class="data-cell">{{small_injured}}</td>
//           </tr>
//         </table>

//         <!-- Signature Section -->
//         <div class="signature-section">
//           <div class="signature-box">
//             <div class="signature-line"></div>
//             <p><strong>Applicant's Signature</strong></p>
//             <p>{{full_name}}</p>
//             <p style="font-size: 9px; margin: 2px 0">
//               Date: {{signature_date}}
//             </p>
//           </div>

//           <div class="signature-box">
//             <div class="signature-line"></div>
//             <p><strong>Verifying Officer</strong></p>
//             <p>{{verifying_officer}}</p>
//             <p style="font-size: 9px; margin: 2px 0">
//               {{verifying_designation}}
//             </p>
//           </div>

//           <div class="stamp">OFFICIAL STAMP</div>
//         </div>

//         <!-- Footer -->
//         <div class="footer">
//           <p>
//             Generated on: {{generation_timestamp}} | Computer generated document
//           </p>
//         </div>
//       </section>
//     </main>
//   </body>
// </html>`;
//     // Get data from request body or use defaults
//     const data = {
//       // Metadata
//       report_id: req.body?.report_id || 'PDMA/2026/001',
//       report_date: req.body?.report_date || new Date().toLocaleDateString(),
//       disaster_type: req.body?.disaster_type || 'Flood',
//       incident_date: req.body?.incident_date || '2026-02-15',

//       // Personal Details
//       full_name: req.body?.full_name || 'Muhammad Ali',
//       father_name: req.body?.father_name || 'Muhammad Khan',
//       cnic: req.body?.cnic || '17301-1234567-1',
//       mobile: req.body?.mobile || '0300-1234567',
//       district: req.body?.district || 'Peshawar',
//       tehsil: req.body?.tehsil || 'Town-I',
//       village: req.body?.village || 'Gulberg',

//       // Home & Shop Damage
//       home_minor: req.body?.home_minor || '0',
//       home_partial: req.body?.home_partial || '1',
//       home_fully: req.body?.home_fully || '0',
//       shop_minor: req.body?.shop_minor || '0',
//       shop_partial: req.body?.shop_partial || '0',
//       shop_fully: req.body?.shop_fully || '1',

//       // Human Casualty
//       total_residents: req.body?.total_residents || '5',
//       deaths_count: req.body?.deaths_count || '0',
//       injured_count: req.body?.injured_count || '2',
//       disabled_count: req.body?.disabled_count || '0',

//       // Livestock
//       big_deaths: req.body?.big_deaths || '1',
//       big_injured: req.body?.big_injured || '2',
//       small_deaths: req.body?.small_deaths || '3',
//       small_injured: req.body?.small_injured || '4',

//       // Signature
//       signature_date: req.body?.signature_date || new Date().toLocaleDateString(),
//       verifying_officer: req.body?.verifying_officer || 'Abdur Rehman',
//       verifying_designation: req.body?.verifying_designation || 'Tehsildar',
//       generation_timestamp: req.body?.generation_timestamp || new Date().toLocaleString()
//     };
//     let html = template;
//     Object.keys(data).forEach(key => {
//       const regex = new RegExp(`{{${key}}}`, 'g');
//       html = html.replace(regex, data[key]);
//     });
//     await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

//     const pdfBuffer = await page.pdf({
//       format: 'A4',
//       printBackground: true,
//       margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
//     });

//     res.set({
//       'Content-Type': 'application/pdf',
//       'Content-Disposition': 'attachment; filename="report.pdf"',
//       'Content-Length': pdfBuffer.length
//     });
//     res.send(pdfBuffer);

//   } catch (error) {
//     console.error('PDF Generation Error:', error);
//     res.status(500).json({ error: 'Failed to generate report', details: error.message });
//   } finally {
//     // Close context to clean up all associated pages/cache
//     if (context) await context.close().catch(() => { });
//   }
// };
// module.exports = { generatePdf }
const { query } = require('../../config/db')
const { errorGenerator } = require('../../utils/errorGenarator')
const puppeteer = require('puppeteer');

let browserInstance = null;
let browserPromise = null;
let requestCount = 0;

// Helper for date formatting
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return 'N/A';
  }
};

const getBrowser = async () => {
  requestCount++;

  if (browserInstance && requestCount > 100) {
    console.log("Refreshing browser instance...");
    const oldBrowser = browserInstance;
    browserInstance = null;
    requestCount = 0;
    oldBrowser.close().catch(e => console.error("Error closing old browser:", e));
  }

  if (browserInstance) return browserInstance;

  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none'
      ]
    }).then(browser => {
      browserInstance = browser;
      browserPromise = null;
      return browser;
    }).catch(err => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
};

const generatePdf = async (req, res, next) => {
  let context;
  let page;
  try {
    const browser = await getBrowser();
    context = await browser.createBrowserContext();
    page = await context.newPage();

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['font', 'stylesheet'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Get report_id from request
    const reportId = req.body?.report_id || req.query?.report_id;

    if (!reportId) {
      return next(errorGenerator('Report ID is required', 400));
    }

    // Execute SQL query
    const { rows } = await query(`
     SELECT
    dr.report_id,
    NOW() AS report_date,
    dr.disaster_type,
    dr.created_at AS incident_date,
    dr.big_animals_death_count,
    dr.small_animals_death_count,
    dr.small_animals_injured_count,
    -- Using COUNT as a window function to avoid GROUP BY issues
    COUNT(dr.home_damage_level) FILTER (
        WHERE
            dr.is_home_impacted
            and dr.home_damage_level = 'minor'
    ) OVER () AS minor_impacted_home_count,
    COUNT(dr.home_damage_level) FILTER (
        WHERE
            dr.is_home_impacted
            and dr.home_damage_level = 'major'
    ) OVER () AS major_impacted_home_count,
    COUNT(dr.home_damage_level) FILTER (
        WHERE
            dr.is_home_impacted
            and dr.home_damage_level = 'fully_destroyed'
    ) OVER () AS fully_impacted_home_count,
    COUNT(dr.shop_damage_level) FILTER (
        WHERE
            dr.is_shop_impacted
            and dr.shop_damage_level = 'minor'
    ) OVER () AS minor_impacted_shop_count,
    COUNT(dr.shop_damage_level) FILTER (
        WHERE
            dr.is_shop_impacted
            and dr.shop_damage_level = 'major'
    ) OVER () AS major_impacted_shop_count,
    COUNT(dr.shop_damage_level) FILTER (
        WHERE
            dr.is_shop_impacted
            and dr.shop_damage_level = 'fully_destroyed'
    ) OVER () AS fully_impacted_shop_count,
    u.name,
    u.father_name,
    u.cnic,
    u.phone_number,
    u.muhalla,
    u.district,
    u.village,
    u.tehsil,
    dr.total_residents_count,
    dr.deaths_count,
    dr.injured_count,
    dr.disabled_persons_count,
    dr.big_animals_injured_count,
    CASE WHEN dr.is_home_impacted THEN true ELSE false END AS has_home_damage,
    CASE WHEN dr.is_shop_impacted THEN true ELSE false END AS has_shop_damage
FROM users u
    JOIN disaster_report dr ON dr.reporter_id = u.user_id
WHERE
    dr.report_id = $1
    `, [reportId]);

    if (rows.length === 0) {
      return next(errorGenerator('Report Not Found', 404));
    }

    const data = rows[0];

    // Map database fields to template placeholders - USING EXACT TEMPLATE KEYS
    const templateData = {
      // Report Metadata
      report_id: data.report_id,
      report_date: formatDate(data.report_date),
      disaster_type: data.disaster_type || 'N/A',
      incident_date: formatDate(data.incident_date),

      // Personal Details - These match the template {{name}}, {{father_name}}, etc.
      name: data.name || 'N/A',
      father_name: data.father_name || 'N/A',
      cnic: data.cnic || 'N/A',
      phone_number: data.phone_number || 'N/A',
      district: data.district || 'N/A',
      tehsil: data.tehsil || 'N/A',
      village: data.village || 'N/A',
      muhalla: data.muhalla || 'N/A',

      // Home Damage - These match the template
      minor_impacted_home_count: data.minor_impacted_home_count || '0',
      major_impacted_home_count: data.major_impacted_home_count || '0',
      fully_impacted_home_count: data.fully_impacted_home_count || '0',

      // Shop Damage - These match the template
      minor_impacted_shop_count: data.minor_impacted_shop_count || '0',
      major_impacted_shop_count: data.major_impacted_shop_count || '0',
      fully_impacted_shop_count: data.fully_impacted_shop_count || '0',

      // Human Casualty - These match the template
      total_residents_count: data.total_residents_count || '0',
      deaths_count: data.deaths_count || '0',
      injured_count: data.injured_count || '0',
      disabled_persons_count: data.disabled_persons_count || '0',

      // Livestock - These match the template
      big_animals_death_count: data.big_animals_death_count || '0',
      big_animals_injured_count: data.big_animals_injured_count || '0',
      small_animals_death_count: data.small_animals_death_count || '0',
      small_animals_injured_count: data.small_animals_injured_count || '0',

      // Boolean flags for conditional rendering
      has_home_damage: data.has_home_damage,
      has_shop_damage: data.has_shop_damage
    };

    // Your HTML template (the one you shared) - I'll include it briefly
    const template = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Individual Relief Compensation Report</title>
    <style>
      /* Your existing styles remain exactly the same */
      header {
        padding: 10px 20px;
        font-family: "Times New Roman", serif;
      }
      #top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-align: center;
      }
      .img-container {
        width: 90px;
        flex-shrink: 0;
      }
      .img-container img {
        width: 100%;
        height: auto;
        display: block;
      }
      .centerItems {
        flex-grow: 1;
      }
      .centerItems h1 {
        margin: 0;
        font-size: 18px;
        text-transform: uppercase;
        color: #333;
      }
      .centerItems h2 {
        margin: 3px 0;
        font-size: 15px;
        font-weight: normal;
      }
      .centerItems h3 {
        margin: 2px 0;
        font-size: 14px;
        color: #004d26;
      }
      .centerItems p {
        margin: 1px 0;
        font-size: 11px;
        line-height: 1.2;
      }
      .contact-info {
        margin-top: 4px;
        font-weight: bold;
      }
      .main div {
        text-align: center;
      }
      .main div h3 {
        font-size: 12px;
        text-decoration: underline;
        letter-spacing: 0.6px;
        margin: 5px 0;
      }
      .proformaHeading {
        margin-top: 10px;
        text-align: center;
      }
      .proformaHeading h3 {
        font-size: 16px;
        margin: 5px 0;
      }

      /* INDIVIDUAL REPORT STYLES */
      .report-body {
        padding: 0 20px;
        font-family: "Times New Roman", serif;
        margin-top: 5px;
      }

      /* Personal Info Section */
      .info-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
        border: 1px solid #222;
        font-size: 12px;
      }

      .info-table td {
        padding: 4px 8px;
        border: 1px solid #b8c6bc;
        vertical-align: middle;
      }

      .info-table .label-cell {
        background-color: #edf2eb;
        font-weight: 600;
        width: 25%;
      }

      .info-table .data-cell {
        font-weight: 500;
        background-color: #ffffff;
        width: 25%;
      }

      .cat-header {
        background-color: #004d26;
        color: white;
        text-align: left;
        padding: 4px 10px;
        font-weight: 700;
        font-size: 13px;
        border: 1px solid #004d26;
      }

      /* Damage Tables */
      .damage-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
        border: 1px solid #222;
        font-size: 12px;
      }

      .damage-table th {
        background-color: #e7ede4;
        font-weight: 700;
        padding: 4px 6px;
        border: 1px solid #8fa093;
        color: #00331f;
        font-size: 12px;
      }

      .damage-table td {
        padding: 4px 6px;
        border: 1px solid #b8c6bc;
        text-align: center;
      }

      .damage-table .category {
        background-color: #edf2eb;
        font-weight: 600;
        text-align: left;
        padding-left: 10px;
      }

      .damage-table .no-data {
        background-color: #f5f5f5;
        color: #999;
        font-style: italic;
      }

      .data-cell {
        font-weight: 700;
        background-color: #fafaf5;
      }

      /* Signature Section */
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
        padding: 0 10px;
        font-size: 11px;
      }

      .signature-box {
        text-align: center;
        width: 150px;
      }

      .signature-line {
        margin: 10px 0 3px 0;
        border-top: 1px solid #333;
        width: 100%;
      }

      .stamp {
        width: 70px;
        height: 70px;
        border: 2px dashed #004d26;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #004d26;
        font-size: 9px;
        text-align: center;
        transform: rotate(-15deg);
      }

      /* Footer */
      .footer {
        text-align: center;
        margin-top: 10px;
        font-size: 9px;
        color: #666;
      }

      .damage-table th[rowspan] {
        vertical-align: middle;
      }

      @media print {
        body {
          margin: 0.2in;
        }
        .signature-line {
          border-top: 1px solid #000;
        }
        .report-body {
          page-break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <section id="top">
        <div class="img-container">
          <img
            src="https://kp.gov.pk/uploads/2025/08/kp_logo.png"
            alt="KP Government Logo"
          />
        </div>
        <div class="centerItems">
          <h1>Provincial Disaster Management Authority (PDMA)</h1>
          <h2>Relief, Rehabilitation & Settlement Department</h2>
          <h3>Government of Khyber Pakhtunkhwa</h3>
          <p>Civil Secretariat, Peshawar.</p>
          <p class="contact-info">
            Phone: (091) 9210975 | Fax: (091) 9214025<br />
            <span style="color: #0000ee">www.pdma.gov.pk</span>
          </p>
        </div>
        <div class="img-container">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9KSwxiA1NBEHIAPqq-8aIXY8litlhyv6nkA&s"
            alt="PDMA Logo"
          />
        </div>
      </section>
    </header>

    <main class="main">
      <div>
        <h3>
          Notified in Khyber Pakhtunkhwa Govt: Gazette, Dated 12 February, 2026
        </h3>
      </div>
      <div class="proformaHeading">
        <h3>INDIVIDUAL RELIEF COMPENSATION PROFORMA</h3>
      </div>

      <section class="report-body">
        <!-- Report Metadata -->
        <table class="info-table">
          <tr>
            <td class="label-cell">Report ID:</td>
            <td class="data-cell">#{{report_id}}</td>
            <td class="label-cell">Date:</td>
            <td class="data-cell">{{report_date}}</td>
          </tr>
          <tr>
            <td class="label-cell">Disaster Type:</td>
            <td class="data-cell">{{disaster_type}}</td>
            <td class="label-cell">Incident Date:</td>
            <td class="data-cell">{{incident_date}}</td>
          </tr>
        </table>

        <!-- Personal Details -->
        <table class="info-table">
          <tr>
            <td colspan="4" class="cat-header">PERSONAL DETAILS</td>
          </tr>
          <tr>
            <td class="label-cell">Full Name:</td>
            <td class="data-cell">{{name}}</td>
            <td class="label-cell">Father's Name:</td>
            <td class="data-cell">{{father_name}}</td>
          </tr>
          <tr>
            <td class="label-cell">CNIC No.:</td>
            <td class="data-cell">{{cnic}}</td>
            <td class="label-cell">Mobile No.:</td>
            <td class="data-cell">{{phone_number}}</td>
          </tr>
          <tr>
            <td class="label-cell">District:</td>
            <td class="data-cell">{{district}}</td>
            <td class="label-cell">Tehsil:</td>
            <td class="data-cell">{{tehsil}}</td>
          </tr>
          <tr>
            <td class="label-cell">Village/Mohalla:</td>
            <td colspan="3" class="data-cell">{{village}} / {{muhalla}}</td>
          </tr>
        </table>

        <!-- Home & Shop Damage -->
        <table class="damage-table">
          <tr>
            <th colspan="4">HOME & SHOP DAMAGE</th>
          </tr>
          <tr>
            <th>Category</th>
            <th>Minor</th>
            <th>Partial/Major</th>
            <th>Fully Destroyed</th>
          </tr>
          <!-- Home Damage Row -->
          <tr>
            <td class="category">Home</td>
            {{#if has_home_damage}}
            <td class="data-cell">{{minor_impacted_home_count}}</td>
            <td class="data-cell">{{major_impacted_home_count}}</td>
            <td class="data-cell">{{fully_impacted_home_count}}</td>
            {{else}}
            <td colspan="3" class="no-data">No Home Damage Reported</td>
            {{/if}}
          </tr>
          <!-- Shop/Business Damage Row -->
          <tr>
            <td class="category">Shop/Business</td>
            {{#if has_shop_damage}}
            <td class="data-cell">{{minor_impacted_shop_count}}</td>
            <td class="data-cell">{{major_impacted_shop_count}}</td>
            <td class="data-cell">{{fully_impacted_shop_count}}</td>
            {{else}}
            <td colspan="3" class="no-data">No Shop/Business Damage Reported</td>
            {{/if}}
          </tr>
          {{#unless has_home_damage}} {{#unless has_shop_damage}}
          <tr>
            <td colspan="4" class="no-data" style="text-align: center; padding: 8px;">
              ⚠️ No Home or Shop Damage Recorded for this Report
            </td>
          </tr>
          {{/unless}} {{/unless}}
        </table>

        <!-- Human Casualty -->
        <table class="damage-table">
          <tr>
            <th colspan="4">HUMAN CASUALTY</th>
          </tr>
          <tr>
            <th>Residents</th>
            <th>Deaths</th>
            <th>Injured</th>
            <th>Disabled</th>
          </tr>
          <tr>
            <td class="data-cell">{{total_residents_count}}</td>
            <td class="data-cell">{{deaths_count}}</td>
            <td class="data-cell">{{injured_count}}</td>
            <td class="data-cell">{{disabled_persons_count}}</td>
          </tr>
        </table>

        <!-- Livestock Impact -->
        <table class="damage-table">
          <tr>
            <th colspan="5">LIVESTOCK IMPACT</th>
          </tr>
          <tr>
            <th rowspan="2">Category</th>
            <th colspan="2">Big Animals</th>
            <th colspan="2">Small Animals</th>
          </tr>
          <tr>
            <th>Dead</th>
            <th>Injured</th>
            <th>Dead</th>
            <th>Injured</th>
          </tr>
          <tr>
            <td class="category">Count</td>
            <td class="data-cell">{{big_animals_death_count}}</td>
            <td class="data-cell">{{big_animals_injured_count}}</td>
            <td class="data-cell">{{small_animals_death_count}}</td>
            <td class="data-cell">{{small_animals_injured_count}}</td>
          </tr>
        </table>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Applicant's Signature</strong></p>
            <p>{{name}}</p>
            <p style="font-size: 9px; margin: 2px 0">
              Date: {{report_date}}
            </p>
          </div>

          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Verifying Officer</strong></p>
            <p>___________________</p>
            <p style="font-size: 9px; margin: 2px 0">
              (To be filled by officer)
            </p>
          </div>

          <div class="stamp">OFFICIAL STAMP</div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>
            Generated on: {{report_date}} | Computer generated document
          </p>
        </div>
      </section>
    </main>
  </body>
</html>`;

    // Replace all placeholders - simple string replacement
    let html = template;
    Object.keys(templateData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const value = templateData[key] !== undefined ? templateData[key] : '';
      html = html.replace(regex, value);
    });

    // Handle conditional blocks (simple approach - remove them if condition is false)
    // For {{#if has_home_damage}} blocks
    html = html.replace(/\{\{#if has_home_damage\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, ifContent, elseContent) => {
      return templateData.has_home_damage ? ifContent : elseContent;
    });

    html = html.replace(/\{\{#if has_shop_damage\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, ifContent, elseContent) => {
      return templateData.has_shop_damage ? ifContent : elseContent;
    });

    // Handle {{#unless has_home_damage}} blocks (combined)
    html = html.replace(/\{\{#unless has_home_damage\}\}\s*\{\{#unless has_shop_damage\}\}([\s\S]*?)\{\{\/unless\}\}\s*\{\{\/unless\}\}/g, (match, content) => {
      return (!templateData.has_home_damage && !templateData.has_shop_damage) ? content : '';
    });

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relief-report-${reportId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    next(errorGenerator('Failed to generate report: ' + error.message, 500));
  } finally {
    if (context) await context.close().catch(() => { });
  }
};

module.exports = { generatePdf };