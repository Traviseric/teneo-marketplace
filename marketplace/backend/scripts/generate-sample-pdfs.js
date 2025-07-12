const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure scripts directory exists
const scriptsDir = path.join(__dirname);
if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
}

// Brand configurations
const brandConfigs = {
    'teneo': {
        primaryColor: '#7C3AED',
        secondaryColor: '#6D28D9',
        font: 'Helvetica',
        logo: '🧠',
        tagline: 'Knowledge Beyond Boundaries™'
    },
    'true-earth': {
        primaryColor: '#d4af37',
        secondaryColor: '#b8941f',
        font: 'Courier',
        logo: '🔍',
        tagline: 'Uncovering Hidden Truths'
    },
    'wealth-wise': {
        primaryColor: '#FFD700',
        secondaryColor: '#FFC700',
        font: 'Helvetica',
        logo: '💰',
        tagline: 'Insider Knowledge. Real Wealth.™'
    },
    'default': {
        primaryColor: '#58A6FF',
        secondaryColor: '#388BFD',
        font: 'Helvetica',
        logo: '📚',
        tagline: 'Books for the Curious Mind'
    }
};

// Sample books to generate
const sampleBooks = {
    'teneo': [
        {
            id: 'teneo-1',
            title: 'The Consciousness Revolution',
            author: 'Dr. Maya Chen',
            description: 'Understanding the AI-Human consciousness merger'
        },
        {
            id: 'teneo-2',
            title: 'Hidden Patterns in Reality',
            author: 'Prof. Alex Rivera',
            description: 'Discovering the algorithmic nature of existence'
        }
    ],
    'true-earth': [
        {
            id: 'true-earth-1',
            title: 'The Tartaria Conspiracy',
            author: 'Marcus Stone',
            description: 'Evidence of the erased global empire'
        },
        {
            id: 'true-earth-2',
            title: 'Mudflood Mysteries',
            author: 'Sarah Mitchell',
            description: 'What they don\'t want you to know about the reset'
        }
    ],
    'wealth-wise': [
        {
            id: 'wealth-wise-1',
            title: 'The Wealth Transfer Code',
            author: 'James Sterling III',
            description: 'Elite strategies for generational wealth'
        },
        {
            id: 'wealth-wise-2',
            title: 'Tax Havens of the Ultra-Rich',
            author: 'Victoria Ashford',
            description: 'Legal loopholes the 1% use daily'
        }
    ],
    'default': [
        {
            id: 'default-1',
            title: 'Introduction to Modern Literature',
            author: 'Emily Watson',
            description: 'A comprehensive guide to contemporary writing'
        }
    ]
};

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function generatePDF(book, brand, outputPath) {
    return new Promise((resolve, reject) => {
        const config = brandConfigs[brand];
        const doc = new PDFDocument({
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        // Pipe to file
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Convert hex colors to RGB
        const primaryRgb = hexToRgb(config.primaryColor);
        const secondaryRgb = hexToRgb(config.secondaryColor);

        // Cover page
        doc.rect(0, 0, doc.page.width, doc.page.height)
           .fill(config.primaryColor);

        // White content area
        doc.rect(50, 100, doc.page.width - 100, doc.page.height - 200)
           .fill('white');

        // Logo
        doc.fontSize(60)
           .fillColor(config.primaryColor)
           .text(config.logo, 0, 150, { align: 'center' });

        // Title
        doc.font(config.font + '-Bold')
           .fontSize(32)
           .fillColor('black')
           .text(book.title, 50, 250, { 
               align: 'center',
               width: doc.page.width - 100
           });

        // Author
        doc.font(config.font)
           .fontSize(20)
           .fillColor('#666666')
           .text('by ' + book.author, 50, 320, { 
               align: 'center',
               width: doc.page.width - 100
           });

        // Description
        doc.fontSize(14)
           .fillColor('#333333')
           .text(book.description, 50, 380, { 
               align: 'center',
               width: doc.page.width - 100
           });

        // Sample Chapter banner
        doc.rect(0, 500, doc.page.width, 60)
           .fill(config.secondaryColor);

        doc.fontSize(24)
           .fillColor('white')
           .text('SAMPLE CHAPTER', 0, 515, { align: 'center' });

        // Brand tagline
        doc.fontSize(12)
           .fillColor(config.primaryColor)
           .text(config.tagline, 50, 650, { 
               align: 'center',
               width: doc.page.width - 100
           });

        // New page for content
        doc.addPage();

        // Chapter header
        doc.font(config.font + '-Bold')
           .fontSize(24)
           .fillColor(config.primaryColor)
           .text('Chapter 1: Introduction', 50, 50);

        // Sample content
        doc.font(config.font)
           .fontSize(12)
           .fillColor('black')
           .moveDown(2);

        const sampleText = `This is a sample chapter from "${book.title}" by ${book.author}.

In this groundbreaking work, we explore ${book.description.toLowerCase()}. This sample provides a glimpse into the revolutionary insights contained within the full version.

The journey begins with understanding the fundamental principles that govern our reality. As you'll discover in the complete book, these concepts challenge conventional wisdom and open new pathways to ${brand === 'wealth-wise' ? 'financial freedom' : brand === 'true-earth' ? 'hidden truths' : brand === 'teneo' ? 'expanded consciousness' : 'knowledge'}.

Each chapter builds upon the previous, creating a comprehensive framework for ${brand === 'wealth-wise' ? 'building generational wealth' : brand === 'true-earth' ? 'uncovering suppressed history' : brand === 'teneo' ? 'merging with AI consciousness' : 'personal growth'}.

Key topics covered in the full book include:
• Advanced techniques and methodologies
• Real-world case studies and examples
• Practical exercises and applications
• Exclusive insights from industry leaders
• Step-by-step implementation guides

This sample represents just 5% of the total content. Purchase the full version to unlock all chapters, bonus materials, and lifetime updates.`;

        doc.text(sampleText, {
            align: 'justify',
            lineGap: 5
        });

        // Footer
        doc.fontSize(10)
           .fillColor(config.primaryColor)
           .text(`© ${new Date().getFullYear()} ${brand === 'teneo' ? 'Teneo AI' : brand === 'true-earth' ? 'True Earth Publications' : brand === 'wealth-wise' ? 'WealthWise Publishing' : 'Teneo Books'}. All rights reserved.`, 
                50, doc.page.height - 80, 
                { align: 'center', width: doc.page.width - 100 });

        // Purchase CTA
        doc.rect(150, doc.page.height - 150, doc.page.width - 300, 50)
           .fill(config.primaryColor);

        doc.fontSize(16)
           .fillColor('white')
           .text('Purchase Full Version', 150, doc.page.height - 135, {
               align: 'center',
               width: doc.page.width - 300
           });

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
            console.log(`✓ Generated: ${outputPath}`);
            resolve(outputPath);
        });

        stream.on('error', reject);
    });
}

async function generateAllPDFs() {
    console.log('🚀 Starting PDF generation...\n');

    for (const [brand, books] of Object.entries(sampleBooks)) {
        console.log(`📚 Generating PDFs for ${brand} brand...`);
        
        const brandDir = path.join(__dirname, '../../frontend/books', brand);
        
        // Ensure brand directory exists
        if (!fs.existsSync(brandDir)) {
            fs.mkdirSync(brandDir, { recursive: true });
        }

        for (const book of books) {
            const filename = `${book.id}.pdf`;
            const outputPath = path.join(brandDir, filename);
            
            try {
                await generatePDF(book, brand, outputPath);
            } catch (error) {
                console.error(`✗ Error generating ${filename}:`, error.message);
            }
        }
        
        console.log('');
    }

    console.log('✅ PDF generation complete!');
}

// Run the generator
generateAllPDFs().catch(console.error);