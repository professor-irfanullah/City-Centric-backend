const { query } = require('../../config/db');
const { errorGenerator } = require('../../utils/errorGenarator');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// Browser instance cache with improved management
let browserInstance = null;
let browserInitPromise = null;
let lastBrowserUse = Date.now();
const BROWSER_TIMEOUT = 5 * 60 * 1000; // 5 minutes - close browser after inactivity
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

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

// Helper function to format damage level nicely
function formatDamageLevel(level) {
  if (!level) return 'N/A';
  const levelMap = {
    'minor': 'Only Water & Silt',
    'major': 'Minor Damage',
    'fully_destroyed': 'Fully Destroyed'
  };
  return levelMap[level] || level.replace('_', ' ');
}

// Get executable path with retry logic
const getExecutablePath = async (retryCount = 0) => {
  try {
    return await chromium.executablePath();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying executable path (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return getExecutablePath(retryCount + 1);
    }
    throw error;
  }
};

// Optimized browser initialization for Vercel
const getBrowser = async () => {
  // Check if current browser instance is still valid
  if (browserInstance) {
    try {
      // Check if browser is still usable
      await browserInstance.version();

      // Update last use timestamp
      lastBrowserUse = Date.now();
      return browserInstance;
    } catch (error) {
      console.log('Browser instance invalid, creating new one');
      browserInstance = null;
      browserInitPromise = null;
    }
  }

  // Return existing initialization promise if one is in progress
  if (browserInitPromise) {
    return browserInitPromise;
  }

  // Create new initialization promise
  browserInitPromise = (async () => {
    console.log('Launching browser for Vercel...');

    try {
      // Get executable path with retry
      const executablePath = await getExecutablePath();

      // Launch browser with optimized settings for Vercel
      const browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-accelerated-2d-canvas',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-web-security',
          '--font-render-hinting=none',
          '--enable-font-antialiasing',
        ].filter(Boolean),
        defaultViewport: {
          ...chromium.defaultViewport,
          deviceScaleFactor: 1,
        },
        executablePath,
        headless: 'new', // Use new headless mode
        ignoreHTTPSErrors: true,
        timeout: 30000, // 30 second timeout for launch
        dumpio: false, // Don't pipe browser logs to stderr
      });

      // Set up browser event handlers
      browser.on('disconnected', () => {
        console.log('Browser disconnected, cleaning up instance');
        browserInstance = null;
        browserInitPromise = null;
      });

      browser.on('targetcreated', () => {
        lastBrowserUse = Date.now(); // Update timestamp on any activity
      });

      browserInstance = browser;
      lastBrowserUse = Date.now();

      console.log('Browser launched successfully');
      return browserInstance;

    } catch (error) {
      console.error('Browser launch error:', error);
      browserInitPromise = null;
      throw error;
    }
  })();

  return browserInitPromise;
};

// Cleanup function for browser
const cleanupBrowser = async () => {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    } finally {
      browserInstance = null;
      browserInitPromise = null;
    }
  }
};

// Periodic cleanup of idle browser
setInterval(async () => {
  if (browserInstance && (Date.now() - lastBrowserUse) > BROWSER_TIMEOUT) {
    console.log('Closing idle browser instance');
    await cleanupBrowser();
  }
}, 60000); // Check every minute

// Main PDF generation function
const generatePdf = async (req, res, next) => {
  let context = null;
  let page = null;

  try {
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
        initcap(dr.disaster_type::text) as disaster_type,
        dr.created_at AS incident_date,
        dr.big_animals_death_count,
        dr.small_animals_death_count,
        dr.small_animals_injured_count,
        CASE
            WHEN dr.is_home_impacted THEN dr.home_damage_level
            ELSE NULL
        END AS home_damage_level,
        CASE
            WHEN dr.is_shop_impacted THEN dr.shop_damage_level
            ELSE NULL
        END AS shop_damage_level,
        initcap(u.name) as name,
        initcap(u.father_name) as father_name,
        u.cnic,
        u.phone_number,
        initcap(u.muhalla) as muhalla,
        initcap(u.district) as district,
        initcap(u.village) as village,
        initcap(u.tehsil) as tehsil,
        dr.total_residents_count,
        dr.deaths_count,
        dr.injured_count,
        dr.disabled_persons_count,
        dr.big_animals_injured_count,
        CASE
            WHEN dr.is_home_impacted THEN true
            ELSE false
        END AS has_home_damage,
        CASE
            WHEN dr.is_shop_impacted THEN true
            ELSE false
        END AS has_shop_damage
      FROM users u
        JOIN disaster_report dr ON dr.reporter_id = u.user_id
      WHERE dr.report_id = $1
    `, [reportId]);

    if (rows.length === 0) {
      return next(errorGenerator('Report Not Found', 404));
    }

    const data = rows[0];

    // Prepare template data
    const templateData = {
      report_id: data.report_id,
      report_date: formatDate(data.report_date),
      disaster_type: data.disaster_type || 'N/A',
      incident_date: formatDate(data.incident_date),
      full_name: data.name || 'N/A',
      father_name: data.father_name || 'N/A',
      cnic: data.cnic || 'N/A',
      mobile: data.phone_number || 'N/A',
      district: data.district || 'N/A',
      tehsil: data.tehsil || 'N/A',
      village: data.village || 'N/A',
      muhalla: data.muhalla || 'N/A',
      home_damage_level: data.home_damage_level
        ? formatDamageLevel(data.home_damage_level)
        : 'N/A',
      shop_damage_level: data.shop_damage_level
        ? formatDamageLevel(data.shop_damage_level)
        : 'N/A',
      total_residents: data.total_residents_count || '0',
      deaths_count: data.deaths_count || '0',
      injured_count: data.injured_count || '0',
      disabled_count: data.disabled_persons_count || '0',
      big_deaths: data.big_animals_death_count || '0',
      big_injured: data.big_animals_injured_count || '0',
      small_deaths: data.small_animals_death_count || '0',
      small_injured: data.small_animals_injured_count || '0',
      has_home_damage: data.has_home_damage || false,
      has_shop_damage: data.has_shop_damage || false,
      signature_date: formatDate(new Date()),
      verifying_officer: '___________________',
      verifying_designation: '___________________',
      generation_timestamp: formatDate(new Date())
    };

    // Your HTML template (keep as is)
    const template = `<!doctype html>...`; // Your existing template - keep it unchanged

    // Replace all placeholders
    let html = template;
    Object.keys(templateData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const value = templateData[key] !== undefined ? templateData[key] : '';
      html = html.replace(regex, value);
    });

    // Handle conditional blocks
    html = html.replace(/\{\{#if has_home_damage\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, ifContent, elseContent) => {
      return templateData.has_home_damage ? ifContent : elseContent;
    });

    html = html.replace(/\{\{#if has_shop_damage\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, ifContent, elseContent) => {
      return templateData.has_shop_damage ? ifContent : elseContent;
    });

    html = html.replace(/\{\{#unless has_home_damage\}\}\s*\{\{#unless has_shop_damage\}\}([\s\S]*?)\{\{\/unless\}\}\s*\{\{\/unless\}\}/g, (_, content) => {
      return (!templateData.has_home_damage && !templateData.has_shop_damage) ? content : '';
    });

    // Get browser instance with retry logic
    let browser;
    try {
      browser = await getBrowser();
    } catch (error) {
      console.error('Failed to get browser:', error);
      // Try one more time with fresh instance
      await cleanupBrowser();
      browser = await getBrowser();
    }

    // Create context and page with error handling
    try {
      context = await browser.createBrowserContext();
      page = await context.newPage();
    } catch (error) {
      console.error('Failed to create page, reinitializing browser:', error);
      await cleanupBrowser();
      browser = await getBrowser();
      context = await browser.createBrowserContext();
      page = await context.newPage();
    }

    // Optimize page loading with timeout
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Allow only essential resources
      const resourceType = request.resourceType();
      const url = request.url();

      if (resourceType === 'document') {
        request.continue();
      } else if (resourceType === 'image' && (url.includes('logo') || url.includes('png'))) {
        request.continue(); // Allow logo images
      } else if (resourceType === 'stylesheet' || resourceType === 'font') {
        request.continue(); // Allow styles and fonts
      } else {
        request.abort(); // Abort other resources
      }
    });

    // Set content with optimized timeout
    await Promise.race([
      page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Page content load timeout')), 35000)
      )
    ]);

    // Generate PDF with optimized settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      preferCSSPageSize: true,
      timeout: 30000
    });

    // Send response
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relief-report-${reportId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Force cleanup on error
    await cleanupBrowser();

    next(errorGenerator('Failed to generate report: ' + error.message, 500));
  } finally {
    // Always close context and page, but keep browser for reuse
    try {
      if (page) {
        await page.close().catch(() => { });
      }
      if (context) {
        await context.close().catch(() => { });
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
};

// Export the function
module.exports = { generatePdf };
