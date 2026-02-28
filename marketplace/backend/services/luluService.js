const axios = require('axios');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class LuluService {
    constructor() {
        this.clientKey = process.env.LULU_CLIENT_KEY;
        this.clientSecret = process.env.LULU_CLIENT_SECRET;
        this.apiUrl = process.env.LULU_API_URL || 'https://api.sandbox.lulu.com';
        this.accessToken = null;
        this.tokenExpiry = null;
        
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/marketplace.db');
        this.db = new sqlite3.Database(dbPath);
    }

    // Get or refresh access token
    async getAccessToken() {
        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await axios.post(`${this.apiUrl}/auth/realms/glasstree/protocol/openid-connect/token`, 
                new URLSearchParams({
                    'grant_type': 'client_credentials',
                    'client_id': this.clientKey,
                    'client_secret': this.clientSecret
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Set expiry to 5 minutes before actual expiry for safety
            this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
            
            return this.accessToken;
        } catch (error) {
            console.error('Error getting Lulu access token:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Lulu API');
        }
    }

    // Create headers with authentication
    async getHeaders() {
        const token = await this.getAccessToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        };
    }

    // Calculate shipping options
    async getShippingOptions(lineItems, shippingAddress) {
        try {
            const headers = await this.getHeaders();
            
            const shippingRequest = {
                line_items: lineItems.map(item => ({
                    page_count: item.page_count,
                    pod_package_id: item.pod_package_id,
                    quantity: item.quantity || 1
                })),
                shipping_address: {
                    name: shippingAddress.name,
                    street1: shippingAddress.street1,
                    street2: shippingAddress.street2 || '',
                    city: shippingAddress.city,
                    state_code: shippingAddress.state,
                    country_code: shippingAddress.country || 'US',
                    postcode: shippingAddress.zip
                }
            };

            const response = await axios.post(
                `${this.apiUrl}/print-shipping-options/`,
                shippingRequest,
                { headers }
            );

            // Transform response into user-friendly format
            const options = response.data.shipping_options.map(option => {
                const deliveryDays = this.calculateDeliveryDays(option.level);
                return {
                    method: option.level,
                    displayName: this.getShippingDisplayName(option.level),
                    cost: option.total_cost_incl_tax,
                    currency: 'USD',
                    estimatedDays: deliveryDays,
                    estimatedDelivery: this.calculateDeliveryDate(deliveryDays)
                };
            });

            return {
                success: true,
                options: options.sort((a, b) => a.cost - b.cost)
            };

        } catch (error) {
            console.error('Error getting shipping options:', error.response?.data || error.message);
            return {
                success: false,
                error: 'Failed to calculate shipping options'
            };
        }
    }

    // Create a print job
    async createPrintJob(orderData) {
        try {
            const headers = await this.getHeaders();
            
            const { 
                lineItems, 
                shippingAddress, 
                shippingMethod,
                contactEmail,
                externalId 
            } = orderData;

            // Build line items with printable_id or URLs
            const printLineItems = await Promise.all(lineItems.map(async item => {
                const format = await this.getBookFormat(item.bookId, item.formatType);
                
                if (format.printable_id) {
                    // Use existing printable for faster processing
                    return {
                        printable_id: format.printable_id,
                        quantity: item.quantity || 1
                    };
                } else {
                    // First time setup with URLs
                    return {
                        external_id: `${item.bookId}_${Date.now()}`,
                        printable_type: 'CONTENT_PERFECTBOUND_INTERIOR',
                        title: item.title,
                        cover: format.cover_url,
                        interior: format.interior_url,
                        pod_package_id: format.pod_package_id,
                        quantity: item.quantity || 1
                    };
                }
            }));

            const printJobRequest = {
                line_items: printLineItems,
                shipping_level: shippingMethod,
                shipping_address: {
                    name: shippingAddress.name,
                    street1: shippingAddress.street1,
                    street2: shippingAddress.street2 || '',
                    city: shippingAddress.city,
                    state_code: shippingAddress.state,
                    country_code: shippingAddress.country || 'US',
                    postcode: shippingAddress.zip,
                    email: contactEmail,
                    phone: shippingAddress.phone || ''
                },
                production_delay: 120, // 2 hours for cancellation window
                external_id: externalId
            };

            const response = await axios.post(
                `${this.apiUrl}/print-jobs/`,
                printJobRequest,
                { headers }
            );

            const printJob = response.data;

            // Store printable_ids for future use
            if (printJob.line_items) {
                for (const item of printJob.line_items) {
                    if (item.printable_id && !format.printable_id) {
                        await this.updatePrintableId(
                            item.external_id.split('_')[0], // bookId
                            item.printable_id
                        );
                    }
                }
            }

            return {
                success: true,
                printJobId: printJob.id,
                orderId: printJob.order_id.id,
                status: printJob.status.name,
                totalCost: printJob.total_cost_incl_tax,
                estimatedShipping: printJob.estimated_shipping_dates
            };

        } catch (error) {
            console.error('Error creating print job:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors?.[0]?.detail || 'Failed to create print job'
            };
        }
    }

    // Get print job status
    async getPrintJobStatus(printJobId) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.get(
                `${this.apiUrl}/print-jobs/${printJobId}/`,
                { headers }
            );

            const job = response.data;
            
            return {
                success: true,
                status: job.status.name,
                trackingUrl: job.tracking_urls?.[0],
                trackingId: job.tracking_id,
                shippedAt: job.shipped_at,
                estimatedArrival: job.estimated_arrival_date
            };

        } catch (error) {
            console.error('Error getting print job status:', error.response?.data || error.message);
            return {
                success: false,
                error: 'Failed to get print job status'
            };
        }
    }

    // Cancel a print job (only works within production_delay window)
    async cancelPrintJob(printJobId) {
        try {
            const headers = await this.getHeaders();
            
            await axios.patch(
                `${this.apiUrl}/print-jobs/${printJobId}/`,
                { status: { name: 'CANCELED' } },
                { headers }
            );

            return {
                success: true,
                message: 'Print job cancelled successfully'
            };

        } catch (error) {
            console.error('Error cancelling print job:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors?.[0]?.detail || 'Failed to cancel print job'
            };
        }
    }

    // Calculate printing cost
    async calculatePrintingCost(pageCount, podPackageId, quantity = 1) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.post(
                `${this.apiUrl}/print-prices/`,
                {
                    line_items: [{
                        page_count: pageCount,
                        pod_package_id: podPackageId,
                        quantity: quantity
                    }]
                },
                { headers }
            );

            const pricing = response.data.results[0];
            
            return {
                success: true,
                baseCost: pricing.total_cost_excl_discounts,
                discountedCost: pricing.total_cost_incl_discounts,
                currency: pricing.currency
            };

        } catch (error) {
            console.error('Error calculating print cost:', error.response?.data || error.message);
            return {
                success: false,
                error: 'Failed to calculate printing cost'
            };
        }
    }

    // Helper methods
    getShippingDisplayName(level) {
        const names = {
            'MAIL': 'Economy Mail (7-14 business days)',
            'GROUND': 'Standard Ground (5-7 business days)',
            'EXPRESS': 'Express Delivery (2-3 business days)'
        };
        return names[level] || level;
    }

    calculateDeliveryDays(shippingLevel) {
        const days = {
            'MAIL': { min: 7, max: 14 },
            'GROUND': { min: 5, max: 7 },
            'EXPRESS': { min: 2, max: 3 }
        };
        return days[shippingLevel] || { min: 7, max: 14 };
    }

    calculateDeliveryDate(days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + days.min);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days.max);
        
        return {
            earliest: startDate.toLocaleDateString(),
            latest: endDate.toLocaleDateString()
        };
    }

    // Database methods
    async getBookFormat(bookId, formatType) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM book_formats WHERE book_id = ? AND format_type = ?',
                [bookId, formatType],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async updatePrintableId(bookId, printableId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE book_formats SET printable_id = ?, updated_at = CURRENT_TIMESTAMP WHERE book_id = ?',
                [printableId, bookId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async savePrintJob(printJobData) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO print_jobs (
                    order_id, book_id, format_type, lulu_print_job_id, 
                    lulu_order_id, status, quantity, shipping_method, 
                    shipping_cost
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                printJobData.orderId,
                printJobData.bookId,
                printJobData.formatType,
                printJobData.luluPrintJobId,
                printJobData.luluOrderId,
                printJobData.status,
                printJobData.quantity,
                printJobData.shippingMethod,
                printJobData.shippingCost
            ], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }

    async updatePrintJobStatus(printJobId, status, trackingData = {}) {
        return new Promise((resolve, reject) => {
            const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
            const params = [status];
            
            if (trackingData.trackingUrl) {
                updates.push('tracking_url = ?');
                params.push(trackingData.trackingUrl);
            }
            
            if (trackingData.trackingId) {
                updates.push('tracking_id = ?');
                params.push(trackingData.trackingId);
            }
            
            if (status === 'SHIPPED') {
                updates.push('shipped_at = CURRENT_TIMESTAMP');
            }
            
            params.push(printJobId);
            
            const sql = `UPDATE print_jobs SET ${updates.join(', ')} WHERE lulu_print_job_id = ?`;
            
            this.db.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Calculate base cost for a book format
    async calculateBaseCost(podPackageId, pageCount) {
        try {
            // Lulu pricing formula (simplified - actual pricing may vary)
            // Base cost includes printing, binding, and materials
            const basePrices = {
                '0550X0850BWSTDPB060UW444MXX': { // 5.5x8.5 paperback
                    fixed: 2.50,
                    perPage: 0.012
                },
                '0600X0900BWSTDPB060UW444MXX': { // 6x9 paperback
                    fixed: 2.75,
                    perPage: 0.015
                }
            };
            
            const pricing = basePrices[podPackageId] || basePrices['0550X0850BWSTDPB060UW444MXX'];
            const baseCost = pricing.fixed + (pricing.perPage * pageCount);
            
            return Math.round(baseCost * 100) / 100;
        } catch (error) {
            console.error('Error calculating base cost:', error);
            throw error;
        }
    }

    // Cancel a print job
    async cancelPrintJob(printJobId, reason = 'Customer request') {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.patch(
                `${this.apiUrl}/print-jobs/${printJobId}/`,
                {
                    status: {
                        name: 'CANCELED'
                    },
                    reason
                },
                { headers }
            );
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error cancelling print job:', error.response?.data || error);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    // Close database connection
    close() {
        this.db.close();
    }
}

module.exports = LuluService;