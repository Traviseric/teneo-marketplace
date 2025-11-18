"""
Orchestrator Client for Marketplace Webhooks

This module provides Python functions to send data from the orchestrator
to the marketplace via webhook endpoints.

Usage:
    from ORCHESTRATOR_CLIENT import MarketplaceClient

    client = MarketplaceClient('https://marketplace.teneo.io')

    # When a brand is created
    client.notify_brand_created(brand_data)

    # When a book is generated
    client.notify_book_generated(brand_id, book_data, cover_path, pdf_path)

    # When SEO content is created
    client.notify_seo_generated(brand_id, post_data)
"""

import requests
import json
import base64
from pathlib import Path
from typing import Dict, Optional, Any


class MarketplaceClient:
    """Client for sending orchestrator events to marketplace webhooks"""

    def __init__(self, marketplace_url: str = 'http://localhost:3001'):
        """
        Initialize the marketplace client

        Args:
            marketplace_url: Base URL of the marketplace (default: localhost:3001)
        """
        self.base_url = marketplace_url.rstrip('/')
        self.webhook_base = f'{self.base_url}/webhooks/orchestrator'

    def _send_webhook(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send webhook request to marketplace

        Args:
            endpoint: Webhook endpoint (e.g., 'brand-created')
            data: JSON data to send

        Returns:
            Response data from marketplace

        Raises:
            requests.exceptions.RequestException: If webhook fails
        """
        url = f'{self.webhook_base}/{endpoint}'

        try:
            response = requests.post(
                url,
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f'❌ Webhook failed: {endpoint}')
            print(f'   Error: {str(e)}')
            if hasattr(e.response, 'text'):
                print(f'   Response: {e.response.text}')
            raise

    def notify_brand_created(self, brand_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Notify marketplace that a new brand was created

        Args:
            brand_data: Dictionary containing brand information
                Required fields:
                - name (str): Brand name
                Optional fields:
                - id (str): Brand ID (auto-generated if not provided)
                - tagline (str): Brand tagline
                - themeColor (str): Primary color (hex)
                - accentColor (str): Accent color (hex)
                - HERO_HEADLINE (str): Hero section headline
                - HERO_SUBHEADLINE (str): Hero section subheadline
                - BUTTON_TEXT (str): CTA button text
                - features (dict): Feature flags

        Returns:
            Response data including brandId and url

        Example:
            >>> client = MarketplaceClient()
            >>> result = client.notify_brand_created({
            ...     'name': 'Quantum Youth Publishing',
            ...     'tagline': 'AI-Generated Books for Young Learners',
            ...     'themeColor': '#6366F1',
            ...     'accentColor': '#EC4899'
            ... })
            >>> print(result['brandId'])
            'quantum_youth_publishing'
        """
        print(f'📦 Notifying marketplace: Brand created - {brand_data.get("name")}')
        result = self._send_webhook('brand-created', brand_data)
        print(f'✅ Brand deployed to marketplace!')
        print(f'   URL: {self.base_url}{result["url"]}')
        return result

    def notify_book_generated(
        self,
        brand_id: str,
        book_data: Dict[str, Any],
        cover_path: Optional[str] = None,
        pdf_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Notify marketplace that a new book was generated

        Args:
            brand_id: ID of the brand this book belongs to
            book_data: Dictionary containing book information
                Required fields:
                - title (str): Book title
                Optional fields:
                - id (str): Book ID (auto-generated if not provided)
                - author (str): Author name (default: 'AI Generated')
                - price (float): Book price (default: 14.99)
                - salePrice (float): Sale price
                - description (str): Short description
                - longDescription (str): Full description
                - categories (list): Categories
                - tags (list): Tags
                - wordCount (int): Word count
                - chapters (list): Chapter list
                - features (list): Feature list
            cover_path: Path to cover image file (JPG/PNG)
            pdf_path: Path to PDF file

        Returns:
            Response data including bookId and catalogSize

        Example:
            >>> client = MarketplaceClient()
            >>> result = client.notify_book_generated(
            ...     'quantum_youth_publishing',
            ...     {
            ...         'title': 'Introduction to Quantum Computing',
            ...         'price': 14.99,
            ...         'description': 'Learn quantum computing basics'
            ...     },
            ...     cover_path='./covers/quantum_intro.jpg',
            ...     pdf_path='./books/quantum_intro.pdf'
            ... )
            >>> print(result['catalogSize'])
            5
        """
        print(f'📚 Notifying marketplace: Book generated - {book_data.get("title")}')

        # Prepare webhook data
        webhook_data = {
            'brandId': brand_id,
            'book': book_data
        }

        # Encode cover file as base64 if provided
        if cover_path:
            cover_file = Path(cover_path)
            if cover_file.exists():
                with open(cover_file, 'rb') as f:
                    cover_bytes = f.read()
                    webhook_data['coverFile'] = base64.b64encode(cover_bytes).decode('utf-8')
                print(f'   Cover attached: {cover_file.name} ({len(cover_bytes)} bytes)')
            else:
                print(f'⚠️  Cover file not found: {cover_path}')

        # Encode PDF file as base64 if provided
        if pdf_path:
            pdf_file = Path(pdf_path)
            if pdf_file.exists():
                with open(pdf_file, 'rb') as f:
                    pdf_bytes = f.read()
                    webhook_data['pdfFile'] = base64.b64encode(pdf_bytes).decode('utf-8')
                print(f'   PDF attached: {pdf_file.name} ({len(pdf_bytes)} bytes)')
            else:
                print(f'⚠️  PDF file not found: {pdf_path}')

        result = self._send_webhook('book-generated', webhook_data)
        print(f'✅ Book added to marketplace catalog!')
        print(f'   Total books in brand: {result["catalogSize"]}')
        return result

    def notify_seo_generated(
        self,
        brand_id: str,
        post_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Notify marketplace that SEO content was generated

        Args:
            brand_id: ID of the brand this content belongs to
            post_data: Dictionary containing blog post information
                Required fields:
                - title (str): Post title
                - content (str): HTML content
                Optional fields:
                - slug (str): URL slug (auto-generated if not provided)
                - metaDescription (str): SEO meta description
                - keywords (str): SEO keywords
                - relatedBook (bool): Whether to show related book CTA

        Returns:
            Response data including postUrl and slug

        Example:
            >>> client = MarketplaceClient()
            >>> result = client.notify_seo_generated(
            ...     'quantum_youth_publishing',
            ...     {
            ...         'title': 'What is Quantum Computing?',
            ...         'metaDescription': 'Learn quantum computing basics',
            ...         'content': '<h2>Introduction</h2><p>Quantum computing is...</p>',
            ...         'relatedBook': True
            ...     }
            ... )
            >>> print(result['postUrl'])
            '/brands/quantum_youth_publishing/blog/what-is-quantum-computing.html'
        """
        print(f'📝 Notifying marketplace: SEO content - {post_data.get("title")}')

        webhook_data = {
            'brandId': brand_id,
            'post': post_data
        }

        result = self._send_webhook('seo-generated', webhook_data)
        print(f'✅ Blog post published to marketplace!')
        print(f'   URL: {self.base_url}{result["postUrl"]}')
        return result

    def check_health(self) -> bool:
        """
        Check if marketplace webhooks are healthy

        Returns:
            True if webhooks are available, False otherwise
        """
        try:
            response = requests.get(f'{self.webhook_base}/health', timeout=5)
            data = response.json()
            if data.get('status') == 'ok':
                print('✅ Marketplace webhooks are healthy')
                return True
            else:
                print('⚠️  Marketplace webhooks returned unexpected status')
                return False
        except Exception as e:
            print(f'❌ Marketplace webhooks are not available: {str(e)}')
            return False


# Example usage
if __name__ == '__main__':
    # Initialize client
    client = MarketplaceClient('http://localhost:3001')

    # Check health
    if not client.check_health():
        print('\nMake sure the marketplace server is running:')
        print('cd marketplace/backend && npm start')
        exit(1)

    print('\n' + '='*60)
    print('EXAMPLE: Creating a complete brand with book and blog post')
    print('='*60 + '\n')

    # Example 1: Create a brand
    brand_data = {
        'name': 'Python Mastery Press',
        'tagline': 'Master Python with AI-Generated Guides',
        'themeColor': '#3776AB',  # Python blue
        'accentColor': '#FFD43B',  # Python yellow
        'HERO_HEADLINE': 'Learn Python the Smart Way',
        'HERO_SUBHEADLINE': 'AI-powered books designed for modern developers',
        'BUTTON_TEXT': 'Start Learning',
        'features': {
            'newsletter': True,
            'reviews': True,
            'socialSharing': True
        }
    }

    try:
        brand_result = client.notify_brand_created(brand_data)
        brand_id = brand_result['brandId']

        # Example 2: Add a book (without actual files for demo)
        book_data = {
            'title': 'Python for Data Science: A Complete Guide',
            'author': 'AI Assistant',
            'price': 14.99,
            'salePrice': 9.99,
            'description': 'Master data science with Python in this comprehensive guide.',
            'longDescription': '''
                Learn Python data science from scratch with this AI-generated guide.
                Covers pandas, NumPy, matplotlib, scikit-learn, and more.
                Perfect for beginners and intermediate developers.
            ''',
            'categories': ['Programming', 'Data Science'],
            'tags': ['python', 'data-science', 'machine-learning', 'pandas'],
            'wordCount': 52000,
            'chapters': [
                {'number': 1, 'title': 'Python Fundamentals'},
                {'number': 2, 'title': 'NumPy Arrays'},
                {'number': 3, 'title': 'Pandas DataFrames'},
                {'number': 4, 'title': 'Data Visualization'},
                {'number': 5, 'title': 'Machine Learning Basics'}
            ],
            'features': [
                '50+ code examples',
                'Real-world projects',
                'Interactive exercises',
                'Lifetime updates'
            ]
        }

        book_result = client.notify_book_generated(
            brand_id,
            book_data
            # In real usage: cover_path='./path/to/cover.jpg', pdf_path='./path/to/book.pdf'
        )

        # Example 3: Publish SEO content
        seo_data = {
            'title': 'Getting Started with Python Data Science',
            'metaDescription': 'Learn how to start your data science journey with Python. This guide covers essential libraries and tools.',
            'keywords': 'python, data science, pandas, numpy, beginner guide',
            'content': '''
                <h2>Why Python for Data Science?</h2>
                <p>Python has become the leading language for data science due to its simplicity and powerful libraries.</p>

                <h3>Essential Libraries</h3>
                <ul>
                    <li><strong>NumPy:</strong> Numerical computing with arrays</li>
                    <li><strong>Pandas:</strong> Data manipulation and analysis</li>
                    <li><strong>Matplotlib:</strong> Data visualization</li>
                    <li><strong>Scikit-learn:</strong> Machine learning algorithms</li>
                </ul>

                <h3>Your First Steps</h3>
                <p>Start with the basics of Python syntax, then dive into NumPy arrays and Pandas DataFrames.</p>

                <h3>Learn More</h3>
                <p>Want a comprehensive guide? Check out our complete Python data science book.</p>
            ''',
            'relatedBook': True
        }

        seo_result = client.notify_seo_generated(brand_id, seo_data)

        print('\n' + '='*60)
        print('SUCCESS! Complete brand deployed to marketplace')
        print('='*60)
        print(f'\nBrand URL: http://localhost:3001{brand_result["url"]}')
        print(f'Blog URL:  http://localhost:3001{seo_result["postUrl"]}')
        print('\nThe marketplace now has:')
        print(f'  - 1 brand ({brand_id})')
        print(f'  - {book_result["catalogSize"]} book(s)')
        print(f'  - 1 blog post\n')

    except Exception as e:
        print(f'\n❌ Example failed: {str(e)}')
        exit(1)
